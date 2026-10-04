package mlog

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/graingo/maltose/errors/merror"
)

// rotationConfig 保存日志文件轮转的全部配置。
type rotationConfig struct {
	// MaxSize 是日志文件轮转前的最大体积（MB）。
	// 仅对 'size' 轮转类型生效。
	MaxSize int `mconv:"max_size"` // (MB)
	// MaxBackups 是保留的旧日志文件最大数量。
	// 仅对 'size' 轮转类型生效。
	MaxBackups int `mconv:"max_backups"` // (files)
	// MaxAge 是旧日志文件的最大保留天数。
	// 对 'size' 与 'date' 两种轮转类型都生效。
	MaxAge int `mconv:"max_age"` // (days)
}

// fileWriter 是按日期模式或固定文件名写入文件的 writer。
type fileWriter struct {
	pathPattern  string     // 日志文件的完整路径模式
	isDateMode   bool       // 是否使用日期模式
	mu           sync.Mutex // 保证并发安全的互斥锁
	file         *os.File   // 当前打开的文件
	currentPath  string     // 当前文件路径
	lastCheck    time.Time  // 上次检查文件的时间
	lastCleanup  time.Time  // 上次清理检查的时间
	writeCount   int64      // 写入计数，用于惰性清理
	cfg          *rotationConfig
	cleanupRegex *regexp.Regexp
}

var (
	// layoutReplacer 用于将易读的日期模式转换为 Go 的 time.Format 布局。
	layoutReplacer = strings.NewReplacer(
		"YYYY", "2006",
		"YY", "06",
		"MM", "01",
		"DD", "02",
		"HH", "15",
		"mm", "04",
		"ss", "05",
	)
	// regexReplacer 用于将易读的日期模式转换为文件清理用的正则字符串。
	regexReplacer = strings.NewReplacer(
		"YYYY", `\d{4}`,
		"YY", `\d{2}`,
		"MM", `\d{2}`,
		"DD", `\d{2}`,
		"HH", `\d{2}`,
		"mm", `\d{2}`,
		"ss", `\d{2}`,
	)
	// patternRegex 用于查找所有形如 {YYYYMMDD} 的占位符。
	patternRegex = regexp.MustCompile(`\{([^}]+)\}`)
)

// newFileWriter 根据给定的轮转配置创建新的 fileWriter。
func newFileWriter(path string, cfg *rotationConfig) (*fileWriter, error) {
	if path == "" {
		return nil, merror.New("filepath for log rotation cannot be empty")
	}

	// 日志路径使用绝对路径是更好的做法，
	// 可避免当前工作目录带来的问题。
	absPath, err := filepath.Abs(path)
	if err != nil {
		return nil, merror.Wrapf(err, `failed to get absolute path for "%s"`, path)
	}

	isDateMode := isDatePattern(absPath)

	// 确保目录存在。
	dir := filepath.Dir(absPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, merror.Wrapf(err, "failed to create log directory: %s", dir)
	}

	w := &fileWriter{
		pathPattern: absPath,
		cfg:         cfg,
		lastCheck:   time.Now(),
		lastCleanup: time.Now(),
		isDateMode:  isDateMode,
	}

	// 按需准备清理用的正则表达式
	if cfg.MaxAge > 0 || (!isDateMode && cfg.MaxBackups > 0) {
		if w.isDateMode {
			regexPattern := convertDatePatternToRegex(w.pathPattern)
			re, err := regexp.Compile(regexPattern)
			if err != nil {
				return nil, merror.Wrapf(err, "invalid file pattern for cleanup regex compilation: %s", w.pathPattern)
			}
			w.cleanupRegex = re
		}
	}

	return w, nil
}

// Write 实现 io.Writer 接口。
func (w *fileWriter) Write(p []byte) (n int, err error) {
	w.mu.Lock()
	defer w.mu.Unlock()

	// 惰性初始化或周期性轮转
	if err = w.checkAndRotate(); err != nil {
		return 0, err
	}

	// 非日期模式下按体积轮转
	if !w.isDateMode && w.cfg.MaxSize > 0 {
		if stat, err := w.file.Stat(); err == nil {
			// 体积超过上限时轮转
			if stat.Size() >= int64(w.cfg.MaxSize)*1024*1024 {
				if err := w.rotate(); err != nil {
					return 0, err
				}
			}
		}
	}

	// 惰性清理：每写入 1000 次或每过一小时检查一次
	w.writeCount++
	if w.writeCount%1000 == 0 || time.Since(w.lastCleanup) > time.Hour {
		w.cleanup()
	}

	return w.file.Write(p)
}

// rotate 执行基于体积的轮转。
func (w *fileWriter) rotate() error {
	// 关闭已打开的文件
	if err := w.file.Close(); err != nil {
		return err
	}
	w.file = nil

	// 将当前日志文件重命名为备份文件名
	backupPath := w.backupFilePath()
	if err := os.Rename(w.currentPath, backupPath); err != nil {
		return merror.Wrapf(err, "failed to rename log file for rotation: %s", w.currentPath)
	}

	// 重新打开原始文件，此时它是一个新的空文件
	return w.checkAndRotate()
}

// backupFilePath 生成带时间戳的备份文件路径。
// 例如：/path/to/app.2023-10-27T10-00-00.000.log
func (w *fileWriter) backupFilePath() string {
	dir := filepath.Dir(w.currentPath)
	filename := filepath.Base(w.currentPath)
	ext := filepath.Ext(filename)
	prefix := filename[:len(filename)-len(ext)]
	timestamp := time.Now().Format("20060102150405000")

	return filepath.Join(dir, fmt.Sprintf("%s.%s%s", prefix, timestamp, ext))
}

// Close 关闭当前文件。
func (w *fileWriter) Close() error {
	w.mu.Lock()
	defer w.mu.Unlock()

	// 关闭文件
	if w.file != nil {
		err := w.file.Close()
		w.file = nil
		return err
	}
	return nil
}

// checkAndRotate 根据当前日期检查文件是否需要轮转。
func (w *fileWriter) checkAndRotate() error {
	// 根据当前日期或固定模式生成文件路径
	var filePath string
	if w.isDateMode {
		filePath = w.formatFilePath(time.Now())
	} else {
		filePath = w.pathPattern
	}

	// 路径未变化则无需轮转
	if filePath == w.currentPath && w.file != nil {
		return nil
	}

	// 若文件已打开则先关闭
	if w.file != nil {
		if err := w.file.Close(); err != nil {
			return err
		}
		w.file = nil
	}

	// 确保目录存在
	dir := filepath.Dir(filePath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return merror.Wrapf(err, "failed to create log directory: %s", dir)
	}

	// 打开新文件
	file, err := os.OpenFile(filePath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		return merror.Wrapf(err, "failed to open log file: %s", filePath)
	}

	// 更新状态
	w.file = file
	w.currentPath = filePath

	return nil
}

// formatFilePath 根据当前日期格式化文件路径。
func (w *fileWriter) formatFilePath(t time.Time) string {
	layout := w.pathPattern
	// 例如："app-{YYYYMMDD}.log" => "app-20060102.log"
	layout = patternRegex.ReplaceAllStringFunc(layout, func(s string) string {
		// s 为 "{YYYYMMDD}"，去掉花括号后得到 "YYYYMMDD"
		return layoutReplacer.Replace(s[1 : len(s)-1])
	})
	return t.Format(layout)
}

// cleanup 根据清理配置移除旧日志文件。
func (w *fileWriter) cleanup() {
	// 体积模式下依据 MaxAge 或 MaxBackups 清理。
	// 日期模式下依据 cfg.MaxAge 清理。
	if w.isDateMode {
		if w.cfg.MaxAge <= 0 {
			return
		}
	} else {
		if w.cfg.MaxAge <= 0 && w.cfg.MaxBackups <= 0 {
			return
		}
	}

	dir := filepath.Dir(w.pathPattern)
	files, err := os.ReadDir(dir)
	if err != nil {
		// 静默忽略清理错误，避免影响正常日志记录
		return
	}

	if w.isDateMode {
		w.cleanupDateMode(files, dir)
	} else {
		w.cleanupSizeMode(files, dir)
	}

	w.lastCleanup = time.Now()
}

func (w *fileWriter) cleanupDateMode(files []os.DirEntry, dir string) {
	if w.cleanupRegex == nil || w.cfg.MaxAge <= 0 {
		return
	}
	maxAge := time.Duration(w.cfg.MaxAge) * 24 * time.Hour
	now := time.Now()

	for _, file := range files {
		if file.IsDir() || !w.cleanupRegex.MatchString(file.Name()) {
			continue
		}

		info, err := file.Info()
		if err != nil {
			continue
		}

		if now.Sub(info.ModTime()) > maxAge {
			filePath := filepath.Join(dir, file.Name())
			if filePath == w.currentPath {
				continue
			}
			os.Remove(filePath)
		}
	}
}

type backupFile struct {
	path    string
	modTime time.Time
}

func (w *fileWriter) cleanupSizeMode(files []os.DirEntry, dir string) {
	if w.cfg.MaxAge <= 0 && w.cfg.MaxBackups <= 0 {
		return
	}
	var backupFiles []backupFile
	filePattern := filepath.Base(w.pathPattern)
	prefix := filePattern[:len(filePattern)-len(filepath.Ext(filePattern))]
	ext := filepath.Ext(filePattern)

	for _, file := range files {
		if file.IsDir() || !strings.HasPrefix(file.Name(), prefix) || !strings.HasSuffix(file.Name(), ext) {
			continue
		}
		// 跳过主日志文件
		if file.Name() == filePattern {
			continue
		}

		info, err := file.Info()
		if err != nil {
			continue
		}
		backupFiles = append(backupFiles, backupFile{
			path:    filepath.Join(dir, file.Name()),
			modTime: info.ModTime(),
		})
	}

	// 按修改时间排序，最旧的在前
	sort.Slice(backupFiles, func(i, j int) bool {
		return backupFiles[i].modTime.Before(backupFiles[j].modTime)
	})

	// 按最大保留时间清理
	if w.cfg.MaxAge > 0 {
		maxAgeDuration := time.Duration(w.cfg.MaxAge) * 24 * time.Hour
		now := time.Now()
		var filesToKeep []backupFile
		for _, f := range backupFiles {
			if now.Sub(f.modTime) > maxAgeDuration {
				os.Remove(f.path)
			} else {
				filesToKeep = append(filesToKeep, f)
			}
		}
		backupFiles = filesToKeep
	}

	// 按最大备份数量清理
	if w.cfg.MaxBackups > 0 && len(backupFiles) > w.cfg.MaxBackups {
		filesToRemove := backupFiles[:len(backupFiles)-w.cfg.MaxBackups]
		for _, f := range filesToRemove {
			os.Remove(f.path)
		}
	}
}

// convertDatePatternToRegex 将日期模式转换为正则模式。
func convertDatePatternToRegex(pattern string) string {
	regexPattern := regexp.QuoteMeta(pattern)
	// 例如："app-\{YYYYMMDD\}\.log" => "app-\d{4}\d{2}\d{2}\.log"
	regexPattern = patternRegex.ReplaceAllStringFunc(regexPattern, func(s string) string {
		// s 为 "\{YYYYMMDD\}"，去掉花括号后得到 "YYYYMMDD"
		return regexReplacer.Replace(s[2 : len(s)-2])
	})
	return "^" + regexPattern + "$"
}

// isDatePattern 检查文件模式中是否包含日期占位符。
func isDatePattern(pattern string) bool {
	return strings.Contains(pattern, "{") && strings.Contains(pattern, "}")
}

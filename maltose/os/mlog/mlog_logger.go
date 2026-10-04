package mlog

import (
	"context"
	"errors"
	"fmt"
	"io"
	"sync"

	"go.uber.org/zap"
)

// Logger 是日志管理的结构体。
type Logger struct {
	parent     *zap.Logger
	hooks      []Hook
	config     *Config
	level      zap.AtomicLevel
	withFields []Field
	closer     io.Closer
	mu         sync.RWMutex
	hookMu     sync.RWMutex
}

// New 创建一个新的 Logger 实例。
func New(cfg ...*Config) *Logger {
	config := defaultConfig()
	if len(cfg) > 0 && cfg[0] != nil {
		config = cfg[0]
	}
	config = cloneConfig(config)

	l := &Logger{
		config:     config,
		hooks:      make([]Hook, 0),
		withFields: make([]Field, 0),
	}
	// 构建 zap logger
	var err error
	l.parent, l.level, l.closer, err = buildZapLogger(l.config)
	if err != nil {
		panic(err)
	}
	// 添加 hook
	l.AddHook(&traceHook{})
	if len(l.config.CtxKeys) > 0 {
		l.AddHook(&ctxHook{keys: l.config.CtxKeys})
	}

	return l
}

// NewWithZap 使用已有的 zap.Logger 创建新的 Logger 实例。
//
// 该构造函数面向高级用户，或需要标准 New() 不支持的自定义场景。使用时请注意：
//
// 1. zap.Logger 的配置（输出、格式、轮转等）由调用方自行负责
// 2. 与 zap.Logger 关联的资源生命周期也需调用方自行管理
// 3. 文件轮转与清理由 zap.Logger 的配置决定，mlog 不再参与
// 4. 传入的 config 仅用于 mlog 自身特性（hook、上下文键等）
//
// 大多数场景建议使用标准 New() 构造函数，它提供了完整的
// 文件管理、轮转与清理能力。
//
// 示例：
//
//	zapLogger := zap.New(core) // 自定义 zap logger
//	logger := mlog.NewWithZap(zapLogger, &mlog.Config{
//	    CtxKeys: []string{"trace_id", "user_id"},
//	})
//	defer logger.Close() // 这里只会调用 zapLogger.Sync()
func NewWithZap(zapLogger *zap.Logger, cfg ...*Config) *Logger {
	config := defaultConfig()
	if len(cfg) > 0 && cfg[0] != nil {
		config = cfg[0]
	}
	config = cloneConfig(config)
	if zapLogger == nil {
		zapLogger = zap.NewNop()
	}

	l := &Logger{
		parent:     zapLogger,
		config:     config,
		level:      zap.NewAtomicLevelAt(zap.InfoLevel), // 默认级别，可通过配置调整
		hooks:      make([]Hook, 0),
		withFields: make([]Field, 0),
	}

	// 添加 hook
	l.AddHook(&traceHook{})
	if len(l.config.CtxKeys) > 0 {
		l.AddHook(&ctxHook{keys: l.config.CtxKeys})
	}

	return l
}

// Close 关闭 logger 及其底层资源。
func (l *Logger) Close() error {
	l.mu.Lock()
	parent := l.parent
	closer := l.closer
	l.parent = zap.NewNop()
	l.closer = nil
	l.mu.Unlock()

	var syncErr, closeErr error
	if parent != nil {
		syncErr = parent.Sync()
	}
	if closer != nil {
		closeErr = closer.Close()
	}
	return errors.Join(syncErr, closeErr)
}

// SetConfigWithMap 通过 map 设置 logger 配置。
func (l *Logger) SetConfigWithMap(configMap map[string]any) error {
	l.mu.Lock()
	defer l.mu.Unlock()

	config := cloneConfig(l.config)
	if err := config.SetConfigWithMap(configMap); err != nil {
		return err
	}
	return l.setConfigLocked(config)
}

// SetConfig 设置 logger 配置。
func (l *Logger) SetConfig(config *Config) error {
	if config == nil {
		return errors.New("logger config cannot be nil")
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.setConfigLocked(cloneConfig(config))
}

func (l *Logger) setConfigLocked(config *Config) error {
	parent, level, closer, err := buildZapLogger(config)
	if err != nil {
		return err
	}

	if len(l.withFields) > 0 {
		parent = parent.With(toZapFields(l.withFields)...)
	}

	oldParent, oldCloser := l.parent, l.closer
	l.parent, l.level, l.closer, l.config = parent, level, closer, config
	l.refreshHooks()

	var closeErr error
	if oldParent != nil {
		_ = oldParent.Sync()
	}
	if oldCloser != nil {
		closeErr = oldCloser.Close()
	}
	return closeErr
}

// With 为 logger 附加字段。
func (l *Logger) With(fields ...Field) *Logger {
	l.mu.RLock()
	defer l.mu.RUnlock()

	newZapLogger := l.parent.With(toZapFields(fields)...)

	newWithFields := make([]Field, 0, len(l.withFields)+len(fields))
	newWithFields = append(newWithFields, l.withFields...)
	newWithFields = append(newWithFields, fields...)

	l.hookMu.RLock()
	hooks := append([]Hook(nil), l.hooks...)
	l.hookMu.RUnlock()

	return &Logger{
		parent:     newZapLogger,
		hooks:      hooks,
		config:     cloneConfig(l.config),
		level:      l.level,
		withFields: newWithFields,
	}
}

// GetConfig 返回 logger 当前的配置。
func (l *Logger) GetConfig() *Config {
	l.mu.RLock()
	defer l.mu.RUnlock()
	return cloneConfig(l.config)
}

func (l *Logger) Debugf(ctx context.Context, format string, v ...any) {
	l.log(ctx, DebugLevel, fmt.Sprintf(format, v...))
}

func (l *Logger) Debugw(ctx context.Context, msg string, fields ...Field) {
	l.log(ctx, DebugLevel, msg, fields...)
}

func (l *Logger) Infof(ctx context.Context, format string, v ...any) {
	l.log(ctx, InfoLevel, fmt.Sprintf(format, v...))
}

func (l *Logger) Infow(ctx context.Context, msg string, fields ...Field) {
	l.log(ctx, InfoLevel, msg, fields...)
}

func (l *Logger) Warnf(ctx context.Context, format string, v ...any) {
	l.log(ctx, WarnLevel, fmt.Sprintf(format, v...))
}

func (l *Logger) Warnw(ctx context.Context, msg string, fields ...Field) {
	l.log(ctx, WarnLevel, msg, fields...)
}

func (l *Logger) Errorf(ctx context.Context, err error, format string, v ...any) {
	l.log(ctx, ErrorLevel, fmt.Sprintf(format, v...), Err(err))
}

func (l *Logger) Errorw(ctx context.Context, err error, msg string, fields ...Field) {
	fields = append(fields, Err(err))
	l.log(ctx, ErrorLevel, msg, fields...)
}

func (l *Logger) Fatalf(ctx context.Context, err error, format string, v ...any) {
	l.log(ctx, FatalLevel, fmt.Sprintf(format, v...), Err(err))
}

func (l *Logger) Fatalw(ctx context.Context, err error, msg string, fields ...Field) {
	fields = append(fields, Err(err))
	l.log(ctx, FatalLevel, msg, fields...)
}

func (l *Logger) Panicf(ctx context.Context, err error, format string, v ...any) {
	l.log(ctx, PanicLevel, fmt.Sprintf(format, v...), Err(err))
}

func (l *Logger) Panicw(ctx context.Context, err error, msg string, fields ...Field) {
	fields = append(fields, Err(err))
	l.log(ctx, PanicLevel, msg, fields...)
}

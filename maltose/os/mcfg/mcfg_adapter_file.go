package mcfg

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"github.com/BurntSushi/toml"
	"github.com/graingo/maltose/os/mcfg/internal"
	"gopkg.in/yaml.v3"
)

// AdapterFile 实现基于文件的配置适配器接口。
type AdapterFile struct {
	mu   sync.RWMutex
	data map[string]any
}

// NewAdapterFile 创建文件适配器，并在找到默认配置文件时自动加载。
func NewAdapterFile() (*AdapterFile, error) {
	a := &AdapterFile{
		data: make(map[string]any),
	}
	// 自动搜索并加载默认配置文件。
	if path, found := internal.SearchConfigFile(DefaultConfigFileName); found {
		// 直接调用内部加载方法，因为此时实例尚未被共享。
		if err := a.load(path); err != nil {
			return nil, fmt.Errorf("error loading default config file at %s: %w", path, err)
		}
	}
	return a, nil
}

// SetFileName 按名称或路径设置配置文件并加载内容。
// Deprecated: 请改用 SetFile。
func (c *AdapterFile) SetFileName(name string) error {
	return c.SetFile(name)
}

// SetFile 按名称或路径设置配置文件并加载内容。
// 若 `name` 是不带扩展名的基础名（如 "config"），会在默认路径中搜索该文件。
// 否则将 `name` 视为完整路径。
func (c *AdapterFile) SetFile(name string) error {
	path := name
	// 若 `name` 没有扩展名，则尝试按扩展名查找配置文件
	if filepath.Ext(name) == "" {
		// 先按原样检查文件是否存在
		if _, err := os.Stat(name); os.IsNotExist(err) {
			// 文件按原样不存在，尝试补全扩展名查找
			if strings.Contains(name, string(os.PathSeparator)) {
				// 含路径分隔符，在指定目录下尝试补全扩展名
				dir := filepath.Dir(name)
				baseName := filepath.Base(name)
				for _, ext := range []string{"yaml", "yml", "json", "toml"} {
					tryPath := filepath.Join(dir, baseName+"."+ext)
					if _, err := os.Stat(tryPath); err == nil {
						path = tryPath
						break
					}
				}
				// 仍未找到时，回退为按基础名全局搜索
				if path == name {
					if foundPath, found := internal.SearchConfigFile(baseName); found {
						path = foundPath
					} else {
						return fmt.Errorf("config file not found for name: %s", name)
					}
				}
			} else {
				// 不含路径分隔符，使用全局搜索
				foundPath, found := internal.SearchConfigFile(name)
				if !found {
					return fmt.Errorf("config file not found for name: %s", name)
				}
				path = foundPath
			}
		}
	}

	c.mu.Lock()
	defer c.mu.Unlock()
	return c.load(path)
}

// load 从给定路径读取、解析并设置配置数据。
// 这是内部方法，假定调用方已处理加锁。
func (c *AdapterFile) load(path string) error {
	content, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return fmt.Errorf("config file not found at path: %s", path)
		}
		return err
	}

	var data map[string]any
	ext := strings.TrimPrefix(filepath.Ext(path), ".")

	switch ext {
	case "yaml", "yml":
		err = yaml.Unmarshal(content, &data)
	case "json":
		// 使用 json.Unmarshal 直接从 []byte 解析。
		err = json.Unmarshal(content, &data)
	case "toml":
		_, err = toml.Decode(string(content), &data)
	default:
		return fmt.Errorf("unsupported config file format: %s (extension: %s)", path, ext)
	}

	if err != nil {
		return fmt.Errorf("failed to parse config file %s: %w", path, err)
	}

	c.data = data
	return nil
}

// Get 获取指定键对应的配置值。
func (c *AdapterFile) Get(_ context.Context, pattern string) (any, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return internal.SearchMap(c.data, strings.Split(pattern, ".")), nil
}

// Data 获取全部配置数据。
func (c *AdapterFile) Data(_ context.Context) (map[string]any, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return deepCopyMap(c.data), nil
}

// Available 检查并返回配置服务是否可用。
func (c *AdapterFile) Available(_ context.Context, resource ...string) bool {
	if len(resource) > 0 && resource[0] != "" {
		_, err := os.Stat(resource[0])
		return err == nil
	}
	c.mu.RLock()
	defer c.mu.RUnlock()
	return len(c.data) > 0
}

// MergeConfigMap 将 map 合并进已有配置。
func (c *AdapterFile) MergeConfigMap(_ context.Context, data map[string]any) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	Merge(c.data, data)
	return nil
}

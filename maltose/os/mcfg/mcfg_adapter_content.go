package mcfg

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"sync"

	"github.com/BurntSushi/toml"
	"github.com/graingo/maltose/os/mcfg/internal"
	"gopkg.in/yaml.v3"
)

// AdapterContent 实现基于内容（字符串）的配置适配器接口。
type AdapterContent struct {
	mu   sync.RWMutex
	data map[string]any
}

// NewAdapterContent 创建基于内容的配置适配器。
// 参数 `format` 指定内容格式，例如 "yaml"、"json"。
func NewAdapterContent(content string, format string) (*AdapterContent, error) {
	c := &AdapterContent{
		data: make(map[string]any),
	}
	if err := c.SetContent(content, format); err != nil {
		return nil, err
	}
	return c, nil
}

// SetContent 设置配置内容。
func (c *AdapterContent) SetContent(content string, format string) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	var data map[string]any
	var err error

	switch format {
	case "yaml", "yml":
		err = yaml.Unmarshal([]byte(content), &data)
	case "json":
		decoder := json.NewDecoder(bytes.NewReader([]byte(content)))
		decoder.UseNumber() // 使用 Number 避免数字被转换为 float64
		err = decoder.Decode(&data)
	case "toml":
		_, err = toml.Decode(content, &data)
	default:
		return fmt.Errorf("unsupported config format: %s", format)
	}

	if err != nil {
		return err
	}
	c.data = data
	return nil
}

// Get 获取配置值。
func (c *AdapterContent) Get(_ context.Context, pattern string) (any, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return internal.SearchMap(c.data, strings.Split(pattern, ".")), nil
}

// Data 获取全部配置数据。
func (c *AdapterContent) Data(_ context.Context) (map[string]any, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return deepCopyMap(c.data), nil
}

// Available 检查并返回配置服务是否可用。
// 对内容适配器而言，只要初始化成功就始终可用。
func (c *AdapterContent) Available(_ context.Context, _ ...string) bool {
	return c.data != nil
}

// MergeConfigMap 将 map 合并进已有配置。
func (c *AdapterContent) MergeConfigMap(_ context.Context, data map[string]any) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	Merge(c.data, data)
	return nil
}

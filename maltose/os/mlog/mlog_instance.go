package mlog

import (
	"github.com/graingo/maltose/container/minstance"
)

const (
	DefaultName = "default"
)

var (
	instances = minstance.New()
)

// Instance 返回指定名称的 logger 实例。
func Instance(name ...string) *Logger {
	key := DefaultName
	if len(name) > 0 && name[0] != "" {
		key = name[0]
	}

	return instances.GetOrSetFunc(key, func() any {
		return New()
	}).(*Logger)
}

// ConfigFromMap 从给定 map 解析并返回配置。
func ConfigFromMap(m map[string]any) (*Config, error) {
	config := defaultConfig()
	if err := config.SetConfigWithMap(m); err != nil {
		return nil, err
	}
	return config, nil
}

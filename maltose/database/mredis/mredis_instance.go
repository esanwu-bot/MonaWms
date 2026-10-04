package mredis

import (
	"context"

	"github.com/graingo/maltose/container/minstance"
	"github.com/graingo/maltose/internal/intlog"
)

const (
	// DefaultName 是 Redis 实例的默认组名。
	DefaultName = "default"
)

var (
	// instances 用于管理 Redis 实例的容器。
	instances = minstance.New()
	// configs 用于管理 Redis 配置的容器。
	configs = minstance.New()
)

// Instance 返回一个 Redis 实例。
func Instance(name ...string) *Redis {
	key := DefaultName
	if len(name) > 0 && name[0] != "" {
		key = name[0]
	}

	v := instances.GetOrSetFunc(key, func() any {
		if config, ok := GetConfig(key); ok {
			r, err := New(config)
			if err != nil {
				intlog.Errorf(context.TODO(), `new redis instance failed: "%s": %v`, key, err)
				return nil
			}
			return r
		}
		return nil
	})
	if v != nil {
		return v.(*Redis)
	}
	return nil
}

// SetConfig 设置指定名称的 Redis 配置。
func SetConfig(name string, cfg *Config) {
	configs.Set(name, cloneConfig(cfg))
	invalidateInstance(name)
}

// SetConfigByMap 通过 map 设置指定名称的 Redis 配置。
func SetConfigByMap(m map[string]any, name ...string) error {
	key := DefaultName
	if len(name) > 0 && name[0] != "" {
		key = name[0]
	}
	config, err := ConfigFromMap(m)
	if err != nil {
		return err
	}
	configs.Set(key, config)
	invalidateInstance(key)
	return nil
}

// ConfigFromMap 从给定 map 解析并返回配置。
func ConfigFromMap(m map[string]any) (config *Config, err error) {
	config = defaultConfig()
	if err := config.SetConfigWithMap(m); err != nil {
		return nil, err
	}
	return config, nil
}

// GetConfig 返回指定名称的 Redis 配置。
// 若未传入 `name`，则返回默认名称的配置。
func GetConfig(name ...string) (config *Config, ok bool) {
	key := DefaultName
	if len(name) > 0 && name[0] != "" {
		key = name[0]
	}
	if v := configs.Get(key); v != nil {
		return cloneConfig(v.(*Config)), true
	}
	return &Config{}, false
}

// RemoveConfig 移除指定名称的 Redis 配置。
func RemoveConfig(name ...string) {
	key := DefaultName
	if len(name) > 0 && name[0] != "" {
		key = name[0]
	}
	configs.Remove(key)
	invalidateInstance(key)

	intlog.Printf(context.TODO(), `redis configuration "%s" removed`, key)
}

func invalidateInstance(key string) {
	if instance, ok := instances.Pop(key).(*Redis); ok {
		_ = instance.Close()
	}
}

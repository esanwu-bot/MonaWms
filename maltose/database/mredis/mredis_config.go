package mredis

import (
	"time"

	"github.com/graingo/maltose"
	"github.com/graingo/maltose/os/mlog"
	"github.com/graingo/mconv"
)

// Config 是 Redis 的配置对象。
// 传给 New 时，零值字段会继承框架默认值。
type Config struct {
	// Address 是 Redis 服务地址。
	Address string `mconv:"address"`
	// DB 是数据库编号。
	DB int `mconv:"db"`
	// User 是 Redis 服务用户名。
	User string `mconv:"user"`
	// Password 是 Redis 服务密码。
	Password string `mconv:"password"`
	// MasterName 是 Redis 服务的 master 名称。
	MasterName string `mconv:"master_name"`
	// MinIdleConns 是最小空闲连接数。
	MinIdleConns int `mconv:"min_idle_conns"`
	// MaxIdleConns 是最大空闲连接数。
	MaxIdleConns int `mconv:"max_idle_conns"`
	// MaxRetries 是放弃前的最大重试次数。
	MaxRetries int `mconv:"max_retries"`
	// PoolSize 是最大套接字连接数。
	PoolSize int `mconv:"pool_size"`
	// MinRetryBackoff 是每次重试之间的最小退避时间。
	MinRetryBackoff time.Duration `mconv:"min_retry_backoff"`
	// MaxRetryBackoff 是每次重试之间的最大退避时间。
	MaxRetryBackoff time.Duration `mconv:"max_retry_backoff"`
	// DialTimeout 是建立新连接的超时时间。
	DialTimeout time.Duration `mconv:"dial_timeout"`
	// ReadTimeout 是读取超时时间。
	ReadTimeout time.Duration `mconv:"read_timeout"`
	// WriteTimeout 是写入超时时间。
	WriteTimeout time.Duration `mconv:"write_timeout"`
	// PoolTimeout 是从连接池获取连接的超时时间。
	PoolTimeout time.Duration `mconv:"pool_timeout"`
	// ConnMaxIdleTime 是空闲连接的超时时间。
	ConnMaxIdleTime time.Duration `mconv:"conn_max_idle_time"`
	// SlowThreshold 是 Redis 的慢命令阈值。
	SlowThreshold time.Duration `mconv:"slow_threshold"`
	// Logger 通过 SetLogger 或 frame/mins 组件装配来配置。
	Logger *mlog.Logger `mconv:"-"`
	// Hooks 通过 AddHook 配置。
	Hooks []Hook `mconv:"-"`
	// loggerHook 是内部的日志钩子实例。
	loggerHook Hook `mconv:"-"`
}

func defaultConfig() *Config {
	return &Config{
		Address:      "127.0.0.1:6379",
		ReadTimeout:  3 * time.Second,
		WriteTimeout: 3 * time.Second,
		DialTimeout:  5 * time.Second,
		PoolSize:     10,
	}
}

func cloneConfig(config *Config) *Config {
	if config == nil {
		return defaultConfig()
	}
	cloned := *config
	cloned.Hooks = append([]Hook(nil), config.Hooks...)
	cloned.loggerHook = nil
	return &cloned
}

// mergeConfig 将用户配置的非零值覆盖到 Redis 默认值之上。
func mergeConfig(config *Config) *Config {
	merged := defaultConfig()
	if config == nil {
		return merged
	}

	if config.Address != "" {
		merged.Address = config.Address
	}
	merged.DB = config.DB
	if config.User != "" {
		merged.User = config.User
	}
	if config.Password != "" {
		merged.Password = config.Password
	}
	if config.MasterName != "" {
		merged.MasterName = config.MasterName
	}
	if config.MinIdleConns != 0 {
		merged.MinIdleConns = config.MinIdleConns
	}
	if config.MaxIdleConns != 0 {
		merged.MaxIdleConns = config.MaxIdleConns
	}
	if config.MaxRetries != 0 {
		merged.MaxRetries = config.MaxRetries
	}
	if config.PoolSize != 0 {
		merged.PoolSize = config.PoolSize
	}
	if config.MinRetryBackoff != 0 {
		merged.MinRetryBackoff = config.MinRetryBackoff
	}
	if config.MaxRetryBackoff != 0 {
		merged.MaxRetryBackoff = config.MaxRetryBackoff
	}
	if config.DialTimeout != 0 {
		merged.DialTimeout = config.DialTimeout
	}
	if config.ReadTimeout != 0 {
		merged.ReadTimeout = config.ReadTimeout
	}
	if config.WriteTimeout != 0 {
		merged.WriteTimeout = config.WriteTimeout
	}
	if config.PoolTimeout != 0 {
		merged.PoolTimeout = config.PoolTimeout
	}
	if config.ConnMaxIdleTime != 0 {
		merged.ConnMaxIdleTime = config.ConnMaxIdleTime
	}
	if config.SlowThreshold != 0 {
		merged.SlowThreshold = config.SlowThreshold
	}
	if config.Logger != nil {
		merged.Logger = config.Logger
	}
	if config.Hooks != nil {
		merged.Hooks = append([]Hook(nil), config.Hooks...)
	}

	return merged
}

func (c *Config) SetConfigWithMap(config map[string]any) error {
	return mconv.ToStructE(config, c)
}

func (c *Config) SetLogger(logger *mlog.Logger) {
	if logger == nil {
		logger = mlog.New()
	}
	c.Logger = logger.With(mlog.String(maltose.COMPONENT, "mredis"))
}

func (c *Config) AddHook(hook Hook) {
	c.Hooks = append(c.Hooks, hook)
}

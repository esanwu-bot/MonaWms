package mredis

import (
	"context"
	"sync"
	"time"

	"github.com/graingo/maltose/errors/mcode"
	"github.com/graingo/maltose/errors/merror"
	"github.com/redis/go-redis/extra/redisotel/v9"
	redis "github.com/redis/go-redis/v9"
)

// Redis 是 Redis 操作的主结构体。
type Redis struct {
	client redis.UniversalClient
	config *Config
	mu     sync.RWMutex
}

type Hook redis.Hook

// New 创建并返回一个新的 Redis 客户端。
func New(config ...*Config) (*Redis, error) {
	cfg := defaultConfig()
	if len(config) > 0 && config[0] != nil {
		cfg = mergeConfig(config[0])
	}
	if cfg.Address == "" {
		return nil, merror.NewCode(mcode.CodeInvalidConfiguration, "redis address is required")
	}

	opts := &redis.UniversalOptions{
		Addrs:           []string{cfg.Address},
		DB:              cfg.DB,
		Username:        cfg.User,
		Password:        cfg.Password,
		MasterName:      cfg.MasterName,
		MinIdleConns:    cfg.MinIdleConns,
		MaxIdleConns:    cfg.MaxIdleConns,
		MaxRetries:      cfg.MaxRetries,
		PoolSize:        cfg.PoolSize,
		MinRetryBackoff: cfg.MinRetryBackoff,
		MaxRetryBackoff: cfg.MaxRetryBackoff,
		DialTimeout:     cfg.DialTimeout,
		ReadTimeout:     cfg.ReadTimeout,
		WriteTimeout:    cfg.WriteTimeout,
		PoolTimeout:     cfg.PoolTimeout,
		ConnMaxIdleTime: cfg.ConnMaxIdleTime,
	}

	client := redis.NewUniversalClient(opts)

	if cfg.Logger != nil {
		hook := newLoggerHook(cfg)
		client.AddHook(hook)
		cfg.loggerHook = hook
	}

	if err := redisotel.InstrumentTracing(client); err != nil {
		_ = client.Close()
		return nil, merror.Wrap(err, "failed to instrument Redis tracing")
	}

	for _, hook := range cfg.Hooks {
		client.AddHook(hook)
	}

	return &Redis{
		client: client,
		config: cfg,
	}, nil
}

// Client 返回底层的通用客户端。
func (r *Redis) Client() redis.UniversalClient {
	return r.client
}

// AddHook 向客户端添加钩子。
func (r *Redis) AddHook(hook Hook) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.config.Hooks = append(r.config.Hooks, hook)
	r.client.AddHook(hook)
}

// Ping 检查与服务端的连接是否正常。
func (r *Redis) Ping(ctx context.Context) error {
	return r.client.Ping(ctx).Err()
}

// Close 关闭客户端，释放所有已打开的资源。
func (r *Redis) Close() error {
	return r.client.Close()
}

// SetSlowThreshold 动态更新慢命令阈值。
func (r *Redis) SetSlowThreshold(d time.Duration) {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.config.SlowThreshold = d

	if r.config.loggerHook != nil {
		if hook, ok := r.config.loggerHook.(*loggerHook); ok {
			hook.setSlowThreshold(d)
		}
	}
}

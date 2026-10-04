package mredis

import (
	"context"
	"net"
	"sync"
	"time"

	"github.com/graingo/maltose/os/mlog"
	redis "github.com/redis/go-redis/v9"
)

// --- loggerHook ---

// loggerHook 是用于记录日志的 Redis 钩子。
type loggerHook struct {
	logger        *mlog.Logger
	slowThreshold time.Duration
	mu            sync.RWMutex
}

// newLoggerHook 创建一个新的日志钩子。
func newLoggerHook(cfg *Config) *loggerHook {
	return &loggerHook{
		logger:        cfg.Logger,
		slowThreshold: cfg.SlowThreshold,
	}
}

// setSlowThreshold 更新钩子的慢命令阈值。
func (h *loggerHook) setSlowThreshold(d time.Duration) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.slowThreshold = d
}

// DialHook 在建立连接时被调用，属于 redis.Hook 接口的一部分。
func (h *loggerHook) DialHook(next redis.DialHook) redis.DialHook {
	return func(ctx context.Context, network, addr string) (net.Conn, error) {
		// 不记录拨号过程，直接放行。
		return next(ctx, network, addr)
	}
}

// ProcessHook 在命令执行前被调用，属于 redis.Hook 接口的一部分。
func (h *loggerHook) ProcessHook(next redis.ProcessHook) redis.ProcessHook {
	return func(ctx context.Context, cmd redis.Cmder) error {
		start := time.Now()
		err := next(ctx, cmd)
		cost := time.Since(start)

		fields := []mlog.Field{
			mlog.String("cmd", cmd.Name()),
			mlog.Duration("cost", cost),
		}

		if err != nil && err != redis.Nil {
			// 日志器的 Errorw 方法会自动把 error 作为字段写入。
			h.logger.Errorw(ctx, err, "redis command error", fields...)
		} else {
			h.mu.RLock()
			slow := h.slowThreshold
			h.mu.RUnlock()
			if slow > 0 && cost > slow {
				h.logger.Warnw(ctx, "redis command slow", fields...)
			} else {
				h.logger.Debugw(ctx, "redis command", fields...)
			}
		}

		return err
	}
}

// ProcessPipelineHook 在流水线执行前被调用，属于 redis.Hook 接口的一部分。
func (h *loggerHook) ProcessPipelineHook(next redis.ProcessPipelineHook) redis.ProcessPipelineHook {
	return func(ctx context.Context, cmds []redis.Cmder) error {
		start := time.Now()
		err := next(ctx, cmds)
		cost := time.Since(start)

		fields := []mlog.Field{
			mlog.String("cmd", "pipeline"),
			mlog.Int("num_cmds", len(cmds)),
			mlog.Duration("cost", cost),
		}

		if err != nil && err != redis.Nil {
			// 日志器的 Errorw 方法会自动把 error 作为字段写入。
			h.logger.Errorw(ctx, err, "redis pipeline error", fields...)
		} else {
			h.mu.RLock()
			slow := h.slowThreshold
			h.mu.RUnlock()
			if slow > 0 && cost > slow {
				h.logger.Warnw(ctx, "redis pipeline slow", fields...)
			} else {
				h.logger.Debugw(ctx, "redis pipeline", fields...)
			}
		}

		return err
	}
}

package mclient

import (
	"context"
	"sync"
	"time"

	"github.com/graingo/maltose/errors/mcode"
	"github.com/graingo/maltose/errors/merror"
	"github.com/graingo/maltose/internal/intlog"
)

// RateLimiter 定义限流器的接口。
type RateLimiter interface {
	// Wait 阻塞等待，直到请求被放行或上下文被取消。
	Wait(ctx context.Context) error
	// TryAcquire 非阻塞地尝试获取一个令牌。
	TryAcquire() bool
}

// -----------------------------------------------------------------------------
// 令牌桶限流器实现
// -----------------------------------------------------------------------------

// TokenBucketLimiter 实现基于令牌桶的限流器。
type TokenBucketLimiter struct {
	rate       float64    // 每秒生成的令牌数
	bucketSize int        // 最大突发量
	tokens     float64    // 当前令牌数
	lastTime   time.Time  // 上次补充令牌的时间
	mu         sync.Mutex // 保证并发安全的互斥锁
}

// NewTokenBucketLimiter 创建新的令牌桶限流器。
// rate 以每秒请求数表示，bucketSize 决定最大突发量。
func NewTokenBucketLimiter(rate float64, bucketSize int) *TokenBucketLimiter {
	return &TokenBucketLimiter{
		rate:       rate,
		bucketSize: bucketSize,
		tokens:     float64(bucketSize),
		lastTime:   time.Now(),
	}
}

// refill 根据经过的时间向桶中补充令牌。
func (l *TokenBucketLimiter) refill() {
	now := time.Now()
	elapsed := now.Sub(l.lastTime).Seconds()
	l.lastTime = now

	// 根据速率与经过时间计算需要补充的令牌数
	newTokens := elapsed * l.rate
	l.tokens += newTokens
	if l.tokens > float64(l.bucketSize) {
		l.tokens = float64(l.bucketSize)
	}
}

// TryAcquire 非阻塞地尝试从桶中取一个令牌。
// 成功取到令牌返回 true，否则返回 false。
func (l *TokenBucketLimiter) TryAcquire() bool {
	l.mu.Lock()
	defer l.mu.Unlock()

	l.refill()

	if l.tokens >= 1 {
		l.tokens--
		return true
	}
	return false
}

// Wait 阻塞等待，直到获取到令牌或上下文被取消。
func (l *TokenBucketLimiter) Wait(ctx context.Context) error {
	for {
		waitTime, allow := l.reserveToken()
		if allow {
			return nil
		}

		select {
		case <-time.After(waitTime):
			// 继续并再次尝试
		case <-ctx.Done():
			return ctx.Err()
		}
	}
}

// reserveToken 计算获取下一个令牌所需等待的时间。
// 返回等待时间，以及是否立即取到了令牌。
func (l *TokenBucketLimiter) reserveToken() (time.Duration, bool) {
	l.mu.Lock()
	defer l.mu.Unlock()

	l.refill()

	if l.tokens >= 1 {
		l.tokens--
		return 0, true
	}

	// 计算等待下一个令牌的时间
	waitTime := time.Duration((1 - l.tokens) / l.rate * float64(time.Second))
	return waitTime, false
}

// -----------------------------------------------------------------------------
// 限流中间件
// -----------------------------------------------------------------------------

// RateLimitConfig 表示限流中间件的配置项。
type RateLimitConfig struct {
	// RequestsPerSecond 表示每秒允许的请求数
	RequestsPerSecond float64
	// Burst 表示允许同时发生的最大请求数
	Burst int
	// Skip 决定某个请求是否跳过限流
	Skip func(*Request) bool
	// ErrorHandler 处理限流错误
	ErrorHandler func(context.Context, error) (*Response, error)
}

// MiddlewareRateLimit 返回用于限制请求速率的中间件。
func MiddlewareRateLimit(config RateLimitConfig) MiddlewareFunc {
	// 默认值
	rps := config.RequestsPerSecond
	if rps <= 0 {
		rps = 100 // 默认：每秒 100 个请求
	}

	burst := config.Burst
	if burst <= 0 {
		burst = 10 // 默认：突发 10 个请求
	}

	// 创建令牌桶限流器
	limiter := NewTokenBucketLimiter(rps, burst)

	return func(next HandlerFunc) HandlerFunc {
		return func(req *Request) (*Response, error) {
			ctx := req.Context()

			// 满足条件时跳过限流
			if config.Skip != nil && config.Skip(req) {
				return next(req)
			}

			// 尝试获取令牌
			err := limiter.Wait(ctx)
			if err != nil {
				if config.ErrorHandler != nil {
					return config.ErrorHandler(ctx, err)
				}
				return nil, merror.WrapCode(err, mcode.CodeRateLimitExceeded)
			}

			// 调试模式下记录限流信息
			var urlStr string
			if req.Request != nil && req.Request.URL != nil {
				urlStr = req.Request.URL.String()
			} else {
				urlStr = "<no url>"
			}
			intlog.Printf(ctx, "Rate limiter allowed request to %s", urlStr)

			// 继续执行请求
			return next(req)
		}
	}
}

// WithGlobalRateLimit 对该客户端的所有请求启用限流。
func (c *Client) WithGlobalRateLimit(rps float64, burst int) *Client {
	c.Use(MiddlewareRateLimit(RateLimitConfig{
		RequestsPerSecond: rps,
		Burst:             burst,
	}))
	return c
}

package mhttp

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/graingo/maltose/internal/intlog"
)

// RateLimitConfig 定义限流配置
type RateLimitConfig struct {
	// Rate 表示每秒允许的请求数
	Rate float64
	// Burst 表示可同时处理的最大请求数
	Burst int
	// SkipFunc 是可选函数，用于判断是否跳过限流
	SkipFunc func(*Request) bool
	// ErrorHandler 是可选函数，用于处理限流错误
	ErrorHandler func(*Request)
}

func normalizeRateLimitConfig(config RateLimitConfig) RateLimitConfig {
	if config.Rate <= 0 {
		config.Rate = 100
	}
	if config.Burst <= 0 {
		config.Burst = 10
	}
	return config
}

// DefaultRateLimitConfig 返回默认的限流配置
func DefaultRateLimitConfig() RateLimitConfig {
	return RateLimitConfig{
		Rate:  100, // 每秒 100 个请求
		Burst: 10,  // 允许 10 个请求的突发
	}
}

// MiddlewareRateLimit 创建基于令牌桶算法实现的限流中间件
func MiddlewareRateLimit(config RateLimitConfig) MiddlewareFunc {
	config = normalizeRateLimitConfig(config)
	limiter := &rateLimiter{tokens: float64(config.Burst), lastRefill: time.Now(), lastSeen: time.Now()}

	return func(r *Request) {
		// 若 SkipFunc 返回 true 则跳过限流
		if config.SkipFunc != nil && config.SkipFunc(r) {
			return
		}

		if !limiter.allow(config.Rate, config.Burst) {
			if config.ErrorHandler != nil {
				config.ErrorHandler(r)
			} else {
				r.JSON(http.StatusTooManyRequests, gin.H{
					"error": "Too Many Requests",
				})
			}
			r.Abort()
			return
		}

		// 开启调试时记录限流信息
		if r.Request.Context() != nil {
			intlog.Printf(r.Request.Context(), "Rate limiter allowed request")
		}
	}
}

// MiddlewareRateLimitByIP 创建按 IP 地址分别限流的中间件
func MiddlewareRateLimitByIP(config RateLimitConfig) MiddlewareFunc {
	config = normalizeRateLimitConfig(config)
	// 创建 map 保存每个 IP 对应的限流器
	limiters := make(map[string]*rateLimiter)
	var mu sync.RWMutex
	lastCleanup := time.Now()

	return func(r *Request) {
		// 若 SkipFunc 返回 true 则跳过限流
		if config.SkipFunc != nil && config.SkipFunc(r) {
			return
		}

		// 获取客户端 IP
		ip := r.ClientIP()

		// 获取或创建该 IP 对应的限流器
		mu.RLock()
		limiter, exists := limiters[ip]
		mu.RUnlock()

		if !exists {
			mu.Lock()
			if existing, ok := limiters[ip]; ok {
				limiter = existing
			} else {
				limiter = &rateLimiter{
					tokens:     float64(config.Burst),
					lastRefill: time.Now(),
					lastSeen:   time.Now(),
				}
				limiters[ip] = limiter
			}
			mu.Unlock()
		}

		mu.Lock()
		if time.Since(lastCleanup) >= time.Minute {
			cutoff := time.Now().Add(-10 * time.Minute)
			for key, candidate := range limiters {
				if candidate.lastAccessBefore(cutoff) {
					delete(limiters, key)
				}
			}
			lastCleanup = time.Now()
		}
		mu.Unlock()

		// 检查限流
		if !limiter.allow(config.Rate, config.Burst) {
			if config.ErrorHandler != nil {
				config.ErrorHandler(r)
			} else {
				r.JSON(http.StatusTooManyRequests, gin.H{
					"error": "Too Many Requests",
				})
			}
			r.Abort()
			return
		}
	}
}

// rateLimiter 实现一个简单的令牌桶限流器
type rateLimiter struct {
	tokens     float64
	lastRefill time.Time
	lastSeen   time.Time
	mu         sync.Mutex
}

func (l *rateLimiter) allow(rate float64, burst int) bool {
	l.mu.Lock()
	defer l.mu.Unlock()

	now := time.Now()
	elapsed := now.Sub(l.lastRefill).Seconds()
	l.tokens += elapsed * rate
	if l.tokens > float64(burst) {
		l.tokens = float64(burst)
	}
	l.lastRefill = now
	l.lastSeen = now

	if l.tokens < 1 {
		return false
	}

	l.tokens--
	return true
}

func (l *rateLimiter) lastAccessBefore(cutoff time.Time) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.lastSeen.Before(cutoff)
}

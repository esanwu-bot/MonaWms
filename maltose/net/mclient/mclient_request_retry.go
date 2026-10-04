package mclient

import (
	"math/rand"
	"net/http"
	"time"
)

// -----------------------------------------------------------------------------
// 重试配置相关方法
// -----------------------------------------------------------------------------

// RetryConfig 是请求重试的配置。
type RetryConfig struct {
	// Count 是最大重试次数。
	// 例如 Count 为 3 时，请求最多会被执行 4 次（首次尝试 + 3 次重试）。
	Count int

	// BaseInterval 是重试的基础间隔。
	// 它是计算重试间隔的起点。
	// 例如 BaseInterval 为 1 秒时，第一次重试至少等待 1 秒。
	BaseInterval time.Duration

	// MaxInterval 是重试的最大间隔。
	// 用于避免指数退避导致间隔无限制增长。
	// 例如 MaxInterval 为 30 秒时，即使计算出的间隔为 60 秒，
	// 实际间隔也会被限制在 30 秒。
	MaxInterval time.Duration

	// BackoffFactor 是指数退避的因子。
	// 每次重试的间隔由上一次间隔乘以该因子得到。
	// 例如 BaseInterval 为 1 秒、BackoffFactor 为 2.0 时：
	// - 第一次重试：1 秒
	// - 第二次重试：2 秒
	// - 第三次重试：4 秒
	// - 依此类推...
	BackoffFactor float64

	// JitterFactor 是随机抖动的因子。
	// 它给间隔引入随机性，避免多个客户端同时重试。
	// 实际抖动计算方式为：delay * JitterFactor *（-1 到 1 之间的随机数）
	// 例如计算出的间隔为 1 秒、JitterFactor 为 0.1 时：
	// - 实际间隔会落在 0.9 到 1.1 秒之间
	// 取值为 0 表示不添加抖动。
	JitterFactor float64
}

// DefaultRetryConfig 返回默认的重试配置。
// 默认值为：
// - Count：3 次重试
// - BaseInterval：1 秒
// - MaxInterval：30 秒
// - BackoffFactor：2.0（每次间隔翻倍）
// - JitterFactor：0.1（增加 ±10% 的随机抖动）
func DefaultRetryConfig() RetryConfig {
	return RetryConfig{
		Count:         3,
		BaseInterval:  time.Second,
		MaxInterval:   30 * time.Second,
		BackoffFactor: 2.0,
		JitterFactor:  0.1,
	}
}

// SetRetry 设置重试配置。
func (r *Request) SetRetry(config RetryConfig) *Request {
	if config.Count < 0 {
		config.Count = 0
	}
	if config.BaseInterval < 0 {
		config.BaseInterval = 0
	}
	if config.BackoffFactor <= 0 {
		config.BackoffFactor = 1
	}
	if config.MaxInterval <= 0 {
		config.MaxInterval = DefaultRetryConfig().MaxInterval
	}
	if config.JitterFactor < 0 {
		config.JitterFactor = 0
	}
	r.retryCount = config.Count
	r.retryInterval = config.BaseInterval
	r.retryConfig = config
	return r
}

// SetRetrySimple 设置重试次数与基础间隔，退避与抖动使用默认值。
func (r *Request) SetRetrySimple(count int, baseInterval time.Duration) *Request {
	config := DefaultRetryConfig()
	config.Count = count
	config.BaseInterval = baseInterval
	return r.SetRetry(config)
}

// SetRetryCondition 设置自定义的重试条件函数。
// 该函数接收 HTTP 响应与错误作为入参，
// 返回 true 表示需要重试。
func (r *Request) SetRetryCondition(condition func(*http.Response, error) bool) *Request {
	r.retryCondition = condition
	return r
}

// shouldRetry 根据响应与错误判断请求是否需要重试。
func (r *Request) shouldRetry(resp *http.Response, err error) bool {
	// 若提供了自定义条件则使用它
	if r.retryCondition != nil {
		return r.retryCondition(resp, err)
	}

	// 默认重试条件
	if err != nil {
		// 网络/连接错误时重试
		return true
	}

	if resp != nil {
		// 5xx（服务端错误）与 429（请求过多）时重试
		return resp.StatusCode >= 500 || resp.StatusCode == 429
	}

	return false
}

// calculateRetryDelay 计算下一次重试的延迟时间。
func (r *Request) calculateRetryDelay(attempt int) time.Duration {
	// 若未配置重试，则使用简单间隔
	if r.retryConfig == (RetryConfig{}) {
		return r.retryInterval
	}

	// 计算指数退避间隔
	delay := r.retryConfig.BaseInterval
	for i := 1; i < attempt; i++ {
		delay = time.Duration(float64(delay) * r.retryConfig.BackoffFactor)
		if delay > r.retryConfig.MaxInterval {
			delay = r.retryConfig.MaxInterval
			break
		}
	}

	// 加入抖动
	if r.retryConfig.JitterFactor > 0 {
		jitter := time.Duration(float64(delay) * r.retryConfig.JitterFactor * (rand.Float64()*2 - 1))
		delay += jitter
		if delay < 0 {
			delay = 0
		}
	}

	return delay
}

package mclient

import (
	"context"
	"net/http"
	"net/url"
	"time"
)

// Request 是客户端请求的结构体。
type Request struct {
	*http.Request                                   // 内嵌的 http.Request，即底层请求对象。
	client         *Client                          // 创建该请求的客户端。
	response       *Response                        // 该请求的响应对象。
	retryCount     int                              // 请求的重试次数。
	retryInterval  time.Duration                    // 请求的重试间隔。
	middlewares    []MiddlewareFunc                 // 中间件函数。
	queryParams    url.Values                       // 查询参数。
	formParams     url.Values                       // 表单参数。
	retryCondition func(*http.Response, error) bool // 重试条件。
	retryConfig    RetryConfig                      // 重试配置。
	result         any                              // 成功响应时的结果对象。
	errorResult    any                              // 错误响应时的结果对象。
}

// GetResponse 返回该请求的响应对象。
func (r *Request) GetResponse() *Response {
	return r.response
}

// SetResponse 设置该请求的响应对象。
func (r *Request) SetResponse(resp *Response) {
	r.response = resp
}

// SetContext 设置请求的上下文。
// 它会基于给定上下文创建新的底层 http.Request。
func (r *Request) SetContext(ctx context.Context) *Request {
	if ctx == nil {
		return r
	}
	if r.Request == nil {
		r.Request = &http.Request{
			Header: make(http.Header),
		}
	}
	r.Request = r.Request.WithContext(ctx)
	return r
}

// Method 设置请求的 HTTP 方法。
func (r *Request) Method(method string) *Request {
	if r.Request == nil {
		r.Request = &http.Request{
			Header: make(http.Header),
		}
	}
	r.Request.Method = method
	return r
}

// URL 设置请求的 URL。
func (r *Request) URL(rawURL string) *Request {
	if r.Request == nil {
		r.Request = &http.Request{
			Header: make(http.Header),
		}
	}
	parsed, err := url.Parse(rawURL)
	if err == nil {
		r.Request.URL = parsed
	}
	return r
}

// SetResult 设置成功响应时的结果对象。
func (r *Request) SetResult(result any) *Request {
	r.result = result
	return r
}

// SetError 设置错误响应时的结果对象。
func (r *Request) SetError(err any) *Request {
	r.errorResult = err
	return r
}

// GetRequest 返回 *http.Request 对象。
func (r *Request) GetRequest() *http.Request {
	return r.Request
}

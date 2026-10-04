package mclient

import (
	"context"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/graingo/maltose/errors/merror"
	"github.com/graingo/maltose/internal/intlog"
)

// Send 以链式 API 发起请求。
// 若未指定方法，则默认使用 GET。
func (r *Request) Send(url string) (*Response, error) {
	// 确保底层的 http.Request 不为 nil
	if r.Request == nil {
		r.Request = &http.Request{}
	}
	return r.doRequest(r.Context(), r.Request.Method, url)
}

// doRequest 负责请求的执行，包括重试循环。
// 它编排对 attemptRequest 的调用，并处理重试之间的延迟。
func (r *Request) doRequest(ctx context.Context, method string, urlPath string) (*Response, error) {
	var (
		err      error
		resp     *Response
		attempts = 0
	)

	// 至少尝试一次（0 次重试）
	maxAttempts := r.retryCount + 1
	if maxAttempts <= 0 {
		maxAttempts = 1
	}

	for attempts < maxAttempts {
		attempts++

		// 每次尝试都创建新的请求
		resp, err = r.attemptRequest(ctx, method, urlPath)
		if err == nil && (resp == nil || resp.Response == nil) {
			err = merror.New("mclient: middleware returned a nil response without an error")
		}

		// 若发生错误（例如 panic 导致的超时），resp 可能为 nil。
		// 必须先处理错误场景，再访问 resp。
		if err != nil {
			// 若该错误不应重试，或尝试次数已用尽，则跳出循环。
			if !r.shouldRetry(nil, err) || attempts >= maxAttempts {
				break
			}
		} else {
			// 若没有错误，则根据响应判断是否需要重试。
			if !r.shouldRetry(resp.Response, nil) || attempts >= maxAttempts {
				break
			}
		}

		// 重试前若存在响应，先将其关闭
		if resp != nil {
			resp.Close()
			resp = nil
		}

		// 记录重试日志
		if r.Request != nil && r.Request.Context() != nil {
			intlog.Printf(r.Request.Context(), "Retrying request (attempt %d/%d) after error: %v",
				attempts, maxAttempts, err)
		}

		// 若设置了间隔，则重试前先等待
		delay := r.calculateRetryDelay(attempts)
		if delay > 0 {
			timer := time.NewTimer(delay)
			select {
			case <-timer.C:
				// 等待结束后继续
			case <-ctx.Done():
				if !timer.Stop() {
					select {
					case <-timer.C:
					default:
					}
				}
				// 等待期间上下文被取消
				return nil, ctx.Err()
			}
		}
	}

	if err != nil {
		return nil, err
	}
	if resp == nil || resp.Response == nil {
		return nil, merror.New("mclient: middleware returned a nil response without an error")
	}

	// 按需解析响应
	if err := resp.parseResponse(); err != nil {
		resp.Close()
		return nil, err
	}

	return resp, nil
}

// attemptRequest 单次尝试执行请求。
// 它构造 http.Request，串联并执行中间件，最后返回响应。
func (r *Request) attemptRequest(ctx context.Context, method string, urlPath string) (*Response, error) {
	var (
		req *http.Request
		err error
	)

	// 准备请求 URL
	fullURL := urlPath
	if r.client.config.BaseURL != "" && !strings.HasPrefix(urlPath, "http://") && !strings.HasPrefix(urlPath, "https://") {
		baseURL := r.client.config.BaseURL

		// 确保 baseURL 与 urlPath 之间只有一个斜杠
		if !strings.HasSuffix(baseURL, "/") && !strings.HasPrefix(urlPath, "/") {
			baseURL = baseURL + "/"
		} else if strings.HasSuffix(baseURL, "/") && strings.HasPrefix(urlPath, "/") {
			urlPath = urlPath[1:]
		}

		fullURL = baseURL + urlPath
	}

	// 处理查询参数
	if len(r.queryParams) > 0 {
		if strings.Contains(fullURL, "?") {
			fullURL = fullURL + "&" + r.queryParams.Encode()
		} else {
			fullURL = fullURL + "?" + r.queryParams.Encode()
		}
	}

	var body io.Reader
	// 每次尝试都必须创建新的请求体 reader。
	if len(r.formParams) > 0 {
		// 表单数据每次重新编码是安全的。
		body = strings.NewReader(r.formParams.Encode())
		if r.Request == nil {
			r.Request = &http.Request{
				Header: make(http.Header),
			}
		}
		r.ContentType("application/x-www-form-urlencoded")
	} else if r.Request != nil && r.Request.GetBody != nil {
		// 使用 GetBody 为请求体创建新的 reader。
		var getBodyErr error
		body, getBodyErr = r.Request.GetBody()
		if getBodyErr != nil {
			return nil, merror.Wrap(getBodyErr, "failed to get request body for retry")
		}
	} else if r.Request != nil && r.Request.Body != nil {
		// 这里是对非空但不可重置请求体（如实时流）的兜底处理。
		// 若请求体已被消费，重试将会失败。
		body = r.Request.Body
	}

	// 为本次尝试创建 HTTP 请求
	req, err = http.NewRequestWithContext(ctx, method, fullURL, body)
	if err != nil {
		return nil, merror.Wrapf(err, "http.NewRequestWithContext failed for method:%s, url:%s", method, fullURL)
	}

	// 保留原始请求对象上的 GetBody 函数，
	// 因为 NewRequestWithContext 并非对所有请求体类型都自动处理。
	var originalGetBody func() (io.ReadCloser, error)
	if r.Request != nil {
		originalGetBody = r.Request.GetBody
		// 复制原始请求对象上可能在 Send() 之前设置的请求头。
		req.Header = r.Request.Header.Clone()
	}

	// 重要：更新主请求对象，使中间件能够看到
	// 完整构造好的请求（包含 URL、上下文等）。
	r.Request = req
	if originalGetBody != nil {
		r.Request.GetBody = originalGetBody
	}

	// 创建由中间件填充的 Response 占位对象
	var response *Response

	// 准备中间件链
	middlewares := make([]MiddlewareFunc, 0, len(r.client.middlewares)+len(r.middlewares))
	middlewares = append(middlewares, r.client.middlewares...)
	middlewares = append(middlewares, r.middlewares...)
	// 基础 handler 是真正的 HTTP 调用，中间件都包裹在该 handler 之外。
	handler := func(req *Request) (*Response, error) {
		// 此处使用底层的 http.Request
		httpResp, err := r.client.do(req.Request)
		if err != nil {
			return nil, err
		}

		// 创建 Response 对象
		return &Response{
			Response:    httpResp,
			result:      req.result,
			errorResult: req.errorResult,
		}, nil
	}

	// 逆序应用中间件以构建调用链：
	// Handler -> 中间件 N -> ... -> 中间件 1
	for i := len(middlewares) - 1; i >= 0; i-- {
		handler = middlewares[i](handler)
	}

	// 使用 Request 对象执行中间件链
	response, err = handler(r)

	// 处理错误
	if err != nil {
		return nil, err
	}

	// 将响应写回 request
	r.SetResponse(response)

	return response, nil
}

// Do 执行请求。
//
// Deprecated: 请使用 Get、Post 等对应 HTTP 方法的函数。
func (r *Request) Do() (*Response, error) {
	if r.Request == nil || r.Request.URL == nil {
		return nil, merror.New("mclient: request URL is not set")
	}
	return r.Send(r.Request.URL.String())
}

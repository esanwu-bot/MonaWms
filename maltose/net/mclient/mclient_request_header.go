package mclient

import "net/http"

// SetHeader 为请求设置请求头键值对。
// 它是 Header 方法的别名，用于更好地适配链式调用。
func (r *Request) SetHeader(key, value string) *Request {
	if r.Request == nil {
		r.Request = &http.Request{
			Header: make(http.Header),
		}
	}
	r.Request.Header.Set(key, value)
	return r
}

// SetHeaders 一次性设置多个请求头。
func (r *Request) SetHeaders(headers map[string]string) *Request {
	for k, v := range headers {
		r.SetHeader(k, v)
	}
	return r
}

// ContentType 设置请求的 Content-Type 请求头。
func (r *Request) ContentType(contentType string) *Request {
	return r.SetHeader("Content-Type", contentType)
}

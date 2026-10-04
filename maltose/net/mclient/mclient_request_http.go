package mclient

import (
	"net/http"
)

// Get 将方法设为 GET 并执行请求。
func (r *Request) Get(url string) (*Response, error) {
	return r.Method(http.MethodGet).Send(url)
}

// Post 将方法设为 POST 并执行请求。
func (r *Request) Post(url string) (*Response, error) {
	return r.Method(http.MethodPost).Send(url)
}

// Put 将方法设为 PUT 并执行请求。
func (r *Request) Put(url string) (*Response, error) {
	return r.Method(http.MethodPut).Send(url)
}

// Delete 将方法设为 DELETE 并执行请求。
func (r *Request) Delete(url string) (*Response, error) {
	return r.Method(http.MethodDelete).Send(url)
}

// Patch 将方法设为 PATCH 并执行请求。
func (r *Request) Patch(url string) (*Response, error) {
	return r.Method(http.MethodPatch).Send(url)
}

// Head 将方法设为 HEAD 并执行请求。
func (r *Request) Head(url string) (*Response, error) {
	return r.Method(http.MethodHead).Send(url)
}

// Options 将方法设为 OPTIONS 并执行请求。
func (r *Request) Options(url string) (*Response, error) {
	return r.Method(http.MethodOptions).Send(url)
}

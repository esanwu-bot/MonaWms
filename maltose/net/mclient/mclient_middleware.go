package mclient

// HandlerFunc 定义中间件使用的处理函数。
type HandlerFunc func(*Request) (*Response, error)

// MiddlewareFunc 是中间件的函数类型。
type MiddlewareFunc func(HandlerFunc) HandlerFunc

// Use 为请求添加中间件处理器。
func (r *Request) Use(middlewares ...MiddlewareFunc) *Request {
	r.middlewares = append(r.middlewares, middlewares...)
	return r
}

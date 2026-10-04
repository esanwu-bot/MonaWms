package mhttp

// MiddlewareFunc 定义中间件函数类型。
type MiddlewareFunc func(*Request)

// Use 添加全局中间件。
func (s *Server) Use(middlewares ...MiddlewareFunc) {
	s.RouterGroup.Middleware(middlewares...)
}

// Middleware 是 Use 的别名。
func (s *Server) Middleware(middlewares ...MiddlewareFunc) {
	s.Use(middlewares...)
}

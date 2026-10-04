package cmd

import (
	"github.com/graingo/maltose-quickstart/internal/controller/hello"
	_ "github.com/graingo/maltose-quickstart/internal/logic"
	"github.com/graingo/maltose/frame/m"
	"github.com/graingo/maltose/net/mhttp"
)

// HTTPServer 构建应用的 HTTP 服务端并注册路由。
func HTTPServer() *mhttp.Server {
	server := m.Server()

	server.Group("/api/v1", func(group *mhttp.RouterGroup) {
		group.Middleware(mhttp.MiddlewareResponse(), mhttp.MiddlewareLog())
		group.Bind(hello.NewV1())
	})
	server.Group("/api/v2", func(group *mhttp.RouterGroup) {
		group.Middleware(mhttp.MiddlewareResponse(), mhttp.MiddlewareLog())
		group.Bind(hello.NewV2())
	})

	return server
}

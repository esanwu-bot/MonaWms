package cmd

import (
	"github.com/esanwu-bot/monawms-backend/internal/controller/auth"
	_ "github.com/esanwu-bot/monawms-backend/internal/logic"
	"github.com/esanwu-bot/monawms-backend/internal/middleware"
	"github.com/graingo/maltose/frame/m"
	"github.com/graingo/maltose/net/mhttp"
)

// HTTPServer 构建应用的 HTTP 服务端并注册路由。
func HTTPServer() *mhttp.Server {
	server := m.Server()

	server.Group("/api", func(group *mhttp.RouterGroup) {
		group.Middleware(mhttp.MiddlewareResponse(), mhttp.MiddlewareLog(), middleware.Auth())
		group.Bind(auth.NewV1())
	})

	return server
}

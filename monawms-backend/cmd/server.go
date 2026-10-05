package cmd

import (
	"github.com/esanwu-bot/monawms-backend/internal/controller/auth"
	"github.com/esanwu-bot/monawms-backend/internal/controller/category"
	"github.com/esanwu-bot/monawms-backend/internal/controller/customer"
	"github.com/esanwu-bot/monawms-backend/internal/controller/dictionary"
	"github.com/esanwu-bot/monawms-backend/internal/controller/product"
	"github.com/esanwu-bot/monawms-backend/internal/controller/supplier"
	"github.com/esanwu-bot/monawms-backend/internal/controller/warehouse"
	_ "github.com/esanwu-bot/monawms-backend/internal/logic"
	"github.com/esanwu-bot/monawms-backend/internal/middleware"
	"github.com/graingo/maltose/frame/m"
	"github.com/graingo/maltose/net/mhttp"
)

// HTTPServer 构建应用的 HTTP 服务端并注册路由。
func HTTPServer() *mhttp.Server {
	server := m.Server()

	server.Group("/api", func(group *mhttp.RouterGroup) {
		// 中间件顺序：标准响应 → 访问日志 → 身份校验 → 仓库授权作用域。
		group.Middleware(
			mhttp.MiddlewareResponse(),
			mhttp.MiddlewareLog(),
			middleware.Auth(),
			middleware.WarehouseScope(),
		)
		group.Bind(
			auth.NewV1(),
			product.NewV1(),
			category.NewV1(),
			warehouse.NewV1(),
			dictionary.NewV1(),
			supplier.NewV1(),
			customer.NewV1(),
		)
	})

	return server
}

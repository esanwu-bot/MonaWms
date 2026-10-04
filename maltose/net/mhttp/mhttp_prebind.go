package mhttp

import (
	"context"

	"github.com/gin-gonic/gin"
)

// preBindItem 是预绑定项。
type preBindItem struct {
	Group            *RouterGroup
	Method           string
	Path             string
	HandlerFunc      HandlerFunc
	Type             routeType
	Controller       interface{}
	RouteMiddlewares []MiddlewareFunc
}

// bindRoutes 绑定所有预绑定路由。
func (s *Server) bindRoutes(_ context.Context) {
	for _, item := range s.preBindItems {
		var allHandlers []gin.HandlerFunc
		var collectedMiddlewares []MiddlewareFunc

		// 从当前路由组向上遍历至根。
		var groups []*RouterGroup
		for g := item.Group; g != nil; g = g.parent {
			groups = append(groups, g)
		}
		// 先应用父级中间件，再应用子级中间件。
		for i := len(groups) - 1; i >= 0; i-- {
			collectedMiddlewares = append(collectedMiddlewares, groups[i].middlewares...)
		}

		// 按正确顺序添加收集到的中间件，确保父级中间件先执行。
		for i := 0; i < len(collectedMiddlewares); i++ {
			m := collectedMiddlewares[i]
			allHandlers = append(allHandlers, func(c *gin.Context) {
				m(newRequest(c, s))
			})
		}

		// 添加路由级中间件
		for _, middleware := range item.RouteMiddlewares {
			m := middleware
			allHandlers = append(allHandlers, func(c *gin.Context) {
				m(newRequest(c, s))
			})
		}

		// 添加最终的处理函数
		finalHandler := func(c *gin.Context) {
			item.HandlerFunc(newRequest(c, s))
		}
		allHandlers = append(allHandlers, finalHandler)

		// 注册到 Gin
		item.Group.ginGroup.Handle(item.Method, item.Path, allHandlers...)
	}

	// 清空预绑定列表
	s.preBindItems = nil
}

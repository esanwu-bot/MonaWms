package mhttp

import (
	"context"
	"fmt"
	"reflect"
	"sort"
	"strings"

	"github.com/gin-gonic/gin"
)

type routeType int

const (
	routeTypeHandler routeType = iota
	routeTypeController
)

// Route 是路由信息。
type Route struct {
	Method           string
	Path             string
	HandlerFunc      HandlerFunc
	Type             routeType
	Controller       any            // controller 对象
	ControllerMethod reflect.Method // controller 方法
	ReqType          reflect.Type   // 请求参数类型
	RespType         reflect.Type   // 响应类型
}

func (s *Server) Routes() []Route {
	return s.routes
}

func (s *Server) printRoute(ctx context.Context) {
	// 打印服务端信息
	s.logger().Infof(ctx, "HTTP server %s is running on %s", s.config.ServerName, s.config.Address)

	if !s.config.PrintRoutes || len(s.routes) == 0 {
		return
	}

	// 准备表格数据
	type tableRoute struct {
		Method  string
		Path    string
		Handler string
	}
	tableRoutes := make([]tableRoute, 0, len(s.routes))

	// 定义列宽
	maxMethod := 6
	maxPath := 4
	maxHandler := 7

	for _, r := range s.routes {
		// 跳过文档路由
		if r.Path == s.config.OpenapiPath || r.Path == s.config.SwaggerPath {
			continue
		}
		// 跳过健康检查路由
		if s.config.HealthCheck != "" && r.Path == s.config.HealthCheck {
			continue
		}

		// 处理函数
		handlerType := "Handler"
		if r.Type == routeTypeController {
			controllerName := reflect.TypeOf(r.Controller).Elem().Name()
			handlerType = fmt.Sprintf("%s.%s", controllerName, r.ControllerMethod.Name)
		}
		reqTypeName := "nil"
		if r.ReqType != nil {
			reqTypeName = r.ReqType.String()
		}
		respTypeName := "nil"
		if r.RespType != nil {
			respTypeName = r.RespType.String()
		}
		handlerStr := fmt.Sprintf("%s(%s → %s)", handlerType, reqTypeName, respTypeName)

		// 创建表格行
		tr := tableRoute{
			Method:  r.Method,
			Path:    r.Path,
			Handler: handlerStr,
		}
		tableRoutes = append(tableRoutes, tr)

		// 更新最大列宽
		if len(tr.Method) > maxMethod {
			maxMethod = len(tr.Method)
		}
		if len(tr.Path) > maxPath {
			maxPath = len(tr.Path)
		}
		if len(tr.Handler) > maxHandler {
			maxHandler = len(tr.Handler)
		}
	}

	// 按路径排序路由
	sort.Slice(tableRoutes, func(i, j int) bool {
		return tableRoutes[i].Path < tableRoutes[j].Path
	})

	// 打印表格
	fmt.Printf("\n┌─ Routes ─%s%s%s\n", strings.Repeat("─", maxMethod), strings.Repeat("─", maxPath), strings.Repeat("─", maxHandler))

	// 表头
	headerFormat := fmt.Sprintf("│ %%-%ds │ %%-%ds │ %%-%ds │\n", maxMethod, maxPath, maxHandler)
	fmt.Printf(headerFormat, "METHOD", "PATH", "HANDLER")

	// 分隔线
	separator := fmt.Sprintf("├─%s─┼─%s─┼─%s─┤\n", strings.Repeat("─", maxMethod), strings.Repeat("─", maxPath), strings.Repeat("─", maxHandler))
	fmt.Print(separator)

	// 表体
	for _, tr := range tableRoutes {
		fmt.Printf(headerFormat, tr.Method, tr.Path, tr.Handler)
	}

	// 表尾
	footer := fmt.Sprintf("└─%s─┴─%s─┴─%s─┘\n\n", strings.Repeat("─", maxMethod), strings.Repeat("─", maxPath), strings.Repeat("─", maxHandler))
	fmt.Print(footer)
}

func (s *Server) SetNoRouteHandler(handler HandlerFunc) {
	s.engine.NoRoute(func(c *gin.Context) {
		r := newRequest(c, s)
		handler(r)
	})
}

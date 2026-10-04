// Package middleware 存放路由层中间件。
package middleware

import (
	"net/http"

	"github.com/esanwu-bot/monawms-backend/internal/pkg/token"
	"github.com/graingo/maltose/net/mhttp"
)

// publicRoutes 是免鉴权路由，等价于原 PHP 后端未挂载 auth 中间件的路由组。
var publicRoutes = map[string]string{
	http.MethodPost + " /api/auth/login":    "",
	http.MethodPost + " /api/auth/register": "",
	http.MethodPost + " /api/auth/refresh":  "",
}

// Auth 校验 Bearer token，并把登录身份写入请求上下文。
// 白名单路由（登录/注册/刷新）直接放行。
func Auth() mhttp.MiddlewareFunc {
	return func(r *mhttp.Request) {
		if _, ok := publicRoutes[r.Request.Method+" "+r.Request.URL.Path]; ok {
			return
		}

		bearerToken, err := token.ExtractBearer(r.Request.Header.Get("Authorization"))
		if err != nil {
			r.Error(err)
			r.Abort()
			return
		}

		identity, err := token.IdentityFromToken(r.Request.Context(), bearerToken)
		if err != nil {
			r.Error(err)
			r.Abort()
			return
		}

		r.Request = r.Request.WithContext(token.WithIdentity(r.Request.Context(), identity))
	}
}

// IsPublic 判断请求是否属于免鉴权路由。
func IsPublic(r *mhttp.Request) bool {
	_, ok := publicRoutes[r.Request.Method+" "+r.Request.URL.Path]
	return ok
}

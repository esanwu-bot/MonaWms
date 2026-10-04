package mhttp

import (
	"context"

	"github.com/gin-gonic/gin"
	ut "github.com/go-playground/universal-translator"
	"github.com/graingo/maltose/os/mlog"
)

// contextKey 定义上下文键的类型。
type contextKey string

const (
	// requestKey 是在上下文中存放 Request 对象所用的键。
	requestKey  contextKey = "MaltoseRequest"
	ResponseKey contextKey = "MaltoseResponse"
)

// Request 是请求的包装类型。
type Request struct {
	*gin.Context
	server *Server // 服务端实例
}

// RequestFromCtx 从上下文中获取 Request 对象。
func RequestFromCtx(ctx context.Context) *Request {
	if ctx == nil {
		return nil
	}
	if v := ctx.Value(requestKey); v != nil {
		if r, ok := v.(*Request); ok {
			return r
		}
	}
	return nil
}

func newRequest(c *gin.Context, s *Server) *Request {
	// 优先尝试从上下文中获取
	if r := RequestFromCtx(c.Request.Context()); r != nil {
		return r
	}
	// 创建新的 Request 对象
	r := &Request{Context: c, server: s}
	// 直接修改原始上下文，不创建新的 request
	r.Request = c.Request.WithContext(context.WithValue(c.Request.Context(), requestKey, r))
	return r
}

// GetServerName 获取服务端名称。
func (r *Request) GetServerName() string {
	return r.server.config.ServerName
}

// Logger 获取 logger 实例。
func (r *Request) Logger() *mlog.Logger {
	return r.server.logger()
}

// Conf 获取服务端配置。
func (r *Request) Conf() *Config {
	return r.server.config
}

// GetHandlerResponse 获取处理函数的响应。
func (r *Request) GetHandlerResponse() any {
	res, _ := r.Get(string(ResponseKey))
	return res
}

// SetHandlerResponse 设置处理函数的响应。
func (r *Request) SetHandlerResponse(res any) {
	r.Set(string(ResponseKey), res)
}

// Error 追加一条错误信息。
func (r *Request) Error(err error) *Request {
	r.Errors = append(r.Errors, &gin.Error{
		Err:  err,
		Type: gin.ErrorTypePrivate,
	})
	return r
}

// GetTranslator 获取翻译器。
func (r *Request) GetTranslator() ut.Translator {
	return r.server.translator
}

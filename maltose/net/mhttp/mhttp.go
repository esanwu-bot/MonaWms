package mhttp

import (
	"fmt"
	"io"
	"net/http"
	"sync"

	"github.com/getkin/kin-openapi/openapi3"
	"github.com/graingo/maltose/errors/mcode"
	"github.com/graingo/maltose/errors/merror"

	"github.com/gin-gonic/gin"
	ut "github.com/go-playground/universal-translator"
)

var configureGinOnce sync.Once

const (
	DefaultServerName = "default"
	defaultPort       = "8080"
)

// Server 是 HTTP 服务端结构体。
type Server struct {
	RouterGroup
	engine       *gin.Engine
	config       *Config
	routes       []Route
	openapi      *openapi3.T
	preBindItems []preBindItem
	uni          *ut.UniversalTranslator
	translator   ut.Translator
	srv          *http.Server
	prepareOnce  sync.Once
	serverMu     sync.RWMutex
	panicHandler func(r *Request, err error)
}

// New 创建新的 HTTP 服务端。
func New(config ...*Config) *Server {
	conf := defaultConfig()
	if len(config) > 0 && config[0] != nil {
		conf = cloneConfig(config[0])
	}

	configureGinOnce.Do(func() {
		gin.DefaultWriter = io.Discard
		gin.DefaultErrorWriter = io.Discard
		gin.SetMode(gin.ReleaseMode)
	})

	engine := gin.New()

	s := &Server{
		engine:       engine,
		config:       conf,
		preBindItems: make([]preBindItem, 0),
		panicHandler: func(r *Request, err error) {
			code := merror.Code(err)
			if code == mcode.CodeNil {
				r.String(500, fmt.Sprintf("Error: %s", err.Error()))
			} else {
				r.String(codeToHTTPStatus(code), code.Message())
			}
		},
	}

	// 初始化根路由组。
	s.RouterGroup = RouterGroup{
		server:      s,
		path:        "/",
		ginGroup:    &s.engine.RouterGroup,
		middlewares: make([]MiddlewareFunc, 0),
		parent:      nil,
	}
	// 在用户路由绑定之前注册框架中间件。
	s.Use(
		internalMiddlewareTrace(),
		internalMiddlewareRecovery(),
		internalMiddlewareMetric(),
		internalMiddlewareDefaultResponse(),
	)

	if s.config.ServerLocale != "" {
		s.registerValidateTranslator(s.config.ServerLocale)
	}

	return s
}

// WithPanicHandler 设置用于将已恢复的 panic 转换为响应的处理器。
func (s *Server) WithPanicHandler(handler func(r *Request, err error)) *Server {
	s.panicHandler = handler
	return s
}

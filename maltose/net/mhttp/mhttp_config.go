package mhttp

import (
	"time"

	"github.com/graingo/maltose"
	"github.com/graingo/maltose/os/mlog"
	"github.com/graingo/mconv"
)

// Config 是服务端的配置。
type Config struct {
	// Address 是服务端的监听地址。
	Address string `mconv:"address"`
	// ServerName 是服务端的名称。
	ServerName string `mconv:"server_name"`
	// ServerRoot 保留用于兼容旧配置。
	// Deprecated: 请显式通过 Server.SetStaticPath 传入目录。
	ServerRoot string `mconv:"server_root"`
	// ServerLocale 是服务端的语言区域。
	ServerLocale string `mconv:"server_locale"`
	// ReadTimeout 是读取请求的超时时间。
	ReadTimeout time.Duration `mconv:"read_timeout"`
	// WriteTimeout 是写入响应的超时时间。
	WriteTimeout time.Duration `mconv:"write_timeout"`
	// IdleTimeout 是空闲连接的超时时间。
	IdleTimeout time.Duration `mconv:"idle_timeout"`
	// MaxHeaderBytes 是请求头的最大字节数。
	MaxHeaderBytes int `mconv:"max_header_bytes"`
	// HealthCheck 是健康检查配置。
	HealthCheck string `mconv:"health_check"`
	// TLSEnable 是 TLS 配置。
	TLSEnable bool `mconv:"tls_enable"`
	// TLSCertFile 是 TLS 证书文件路径。
	TLSCertFile string `mconv:"tls_cert_file"`
	// TLSKeyFile 是 TLS 私钥文件路径。
	TLSKeyFile string `mconv:"tls_key_file"`
	// TLSServerName 保留用于兼容旧配置。
	// Deprecated: 服务端身份由 TLSCertFile 与 TLSKeyFile 决定。
	TLSServerName string `mconv:"tls_server_name"`
	// GracefulEnable 是优雅关闭配置。
	GracefulEnable bool `mconv:"graceful_enable"`
	// GracefulTimeout 是优雅关闭的超时时间。
	GracefulTimeout time.Duration `mconv:"graceful_timeout"`
	// GracefulWaitTime 是优雅关闭的等待时间。
	GracefulWaitTime time.Duration `mconv:"graceful_wait_time"`
	// OpenapiPath 是 openapi 文件路径。
	OpenapiPath string `mconv:"openapi_path"`
	// SwaggerPath 是 swagger 文件路径。
	SwaggerPath string `mconv:"swagger_path"`
	// SwaggerTemplate 是 swagger 文件模板。
	SwaggerTemplate string `mconv:"swagger_template"`
	// PrintRoutes 是是否打印路由的配置。
	PrintRoutes bool `mconv:"print_routes"`
	// Logger 通过 SetLogger 或 frame/mins 组件装配进行配置。
	Logger *mlog.Logger `mconv:"-"`
}

func defaultConfig() *Config {
	return &Config{
		// 基础配置默认值
		Address:        defaultPort,
		ServerName:     DefaultServerName,
		ServerLocale:   "zh",
		ReadTimeout:    time.Second * 60,
		WriteTimeout:   time.Second * 60,
		IdleTimeout:    time.Second * 60,
		MaxHeaderBytes: 1 << 20, // 1MB

		// 健康检查
		HealthCheck: "/health",

		// TLS 默认配置
		TLSEnable: false,

		// 优雅关闭默认配置
		GracefulEnable:   true,
		GracefulTimeout:  time.Second * 30,
		GracefulWaitTime: time.Second * 5,

		// 日志默认配置
		Logger: mlog.New(),

		// 打印路由
		PrintRoutes: false,
	}
}

func cloneConfig(config *Config) *Config {
	if config == nil {
		return defaultConfig()
	}
	cloned := *config
	if cloned.Logger == nil {
		cloned.Logger = mlog.New()
	}
	return &cloned
}

// SetConfigWithMap 通过 map 设置服务端配置。
func (c *Config) SetConfigWithMap(configMap map[string]any) error {
	return mconv.ToStructE(configMap, c)
}

// SetAddress 设置服务端监听地址。
func (s *Server) SetAddress(addr string) {
	s.config.Address = addr
}

// SetServerName 设置服务端名称。
func (s *Server) SetServerName(name string) {
	s.config.ServerName = name
}

// SetLogger 设置 logger 实例。
func (s *Server) SetLogger(logger *mlog.Logger) {
	if logger == nil {
		logger = mlog.New()
	}
	s.config.Logger = logger.With(mlog.String(maltose.COMPONENT, "mhttp"))
}

// logger 获取 logger 实例。
func (s *Server) logger() *mlog.Logger {
	return s.config.Logger
}

// SetConfigWithMap 通过 map 设置服务端配置。
func (s *Server) SetConfigWithMap(configMap map[string]any) error {
	return mconv.ToStructE(configMap, s.config)
}

func (s *Server) SetConfig(config *Config) {
	s.config = cloneConfig(config)
}

// ConfigFromMap 从 map 创建新的服务端配置。
func ConfigFromMap(configMap map[string]any) (*Config, error) {
	config := defaultConfig()
	if err := config.SetConfigWithMap(configMap); err != nil {
		return nil, err
	}
	return config, nil
}

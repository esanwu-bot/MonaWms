package mclient

import (
	"fmt"
	"net/http"
	"net/url"
	"time"

	"github.com/graingo/maltose"
)

// Client 是功能增强的 HTTP 客户端。
type Client struct {
	client      *http.Client     // 发起请求所用的 HTTP 客户端。
	config      ClientConfig     // 客户端的默认配置。
	middlewares []MiddlewareFunc // 中间件函数。
}

// New 创建并返回新的 HTTP 客户端对象。
// 它默认内置一组内部中间件，用于错误恢复、链路追踪与指标采集。
func New() *Client {
	transport := http.DefaultTransport
	if defaultTransport, ok := http.DefaultTransport.(*http.Transport); ok {
		transport = defaultTransport.Clone()
	}
	c := &Client{
		client: &http.Client{
			Transport: transport,
			Timeout:   30 * time.Second,
		},
		config: ClientConfig{
			Header: make(http.Header),
		},
		middlewares: make([]MiddlewareFunc, 0),
	}

	// 设置默认 User-Agent。
	c.config.Header.Set("User-Agent", fmt.Sprintf("maltose-mclient/%s", maltose.VERSION))

	// 添加默认内部中间件，它们是可观测性与稳定性的基础保障。
	c.Use(
		internalMiddlewareRecovery(),
		internalMiddlewareTrace(),
		internalMiddlewareMetric(),
	)

	return c
}

// NewWithConfig 根据给定配置创建并返回客户端。
// 注意：内部中间件（错误恢复、链路追踪、指标采集）仍会生效。
func NewWithConfig(config ClientConfig) *Client {
	c := New()

	// 自定义配置中未提供 User-Agent 时，保留默认值。
	if config.Header == nil {
		config.Header = make(http.Header)
	} else {
		config.Header = config.Header.Clone()
	}
	if config.Header.Get("User-Agent") == "" {
		config.Header.Set("User-Agent", c.config.Header.Get("User-Agent"))
	}
	c.config = config

	// 将配置应用到 http.Client
	if config.Timeout > 0 {
		c.client.Timeout = config.Timeout
	}
	if config.Transport != nil {
		c.client.Transport = config.Transport
	}

	return c
}

// Use 为客户端添加中间件处理器。
func (c *Client) Use(middlewares ...MiddlewareFunc) *Client {
	c.middlewares = append(c.middlewares, middlewares...)
	return c
}

// Clone 创建并返回当前客户端的副本。
func (c *Client) Clone() *Client {
	httpClient := *c.client
	newClient := &Client{client: &httpClient}
	newClient.config = c.config
	if c.config.Header != nil {
		newClient.config.Header = c.config.Header.Clone()
	}
	newClient.middlewares = append([]MiddlewareFunc(nil), c.middlewares...)
	return newClient
}

// do 使用底层 HTTP 客户端执行请求。
// 这是供中间件链调用的内部方法。
func (c *Client) do(req *http.Request) (*http.Response, error) {
	// 克隆请求，避免修改原始请求
	reqCopy := req.Clone(req.Context())

	// 应用客户端配置
	if c.config.Header != nil && reqCopy.Header == nil {
		reqCopy.Header = make(http.Header)
	}

	for k, v := range c.config.Header {
		if reqCopy.Header.Get(k) == "" && len(v) > 0 {
			reqCopy.Header[k] = append([]string(nil), v...)
		}
	}

	// 执行请求
	return c.client.Do(reqCopy)
}

// GetClient 返回底层的 http.Client。
func (c *Client) GetClient() *http.Client {
	return c.client
}

// SetTransport 设置客户端的 transport。
func (c *Client) SetTransport(transport http.RoundTripper) *Client {
	c.client.Transport = transport
	c.config.Transport = transport
	return c
}

// SetConfig 设置客户端配置。
func (c *Client) SetConfig(config ClientConfig) *Client {
	if config.Header != nil {
		config.Header = config.Header.Clone()
	}
	c.config = config

	// 将配置应用到 HTTP 客户端
	if config.Timeout > 0 {
		c.client.Timeout = config.Timeout
	}
	if config.Transport != nil {
		c.client.Transport = config.Transport
	}

	return c
}

// NewRequest 创建并返回新的请求对象。
func (c *Client) NewRequest() *Request {
	return &Request{
		client:      c,
		middlewares: make([]MiddlewareFunc, 0),
		queryParams: make(url.Values),
		formParams:  make(url.Values),
		response:    &Response{},
	}
}

// R 返回绑定到该客户端的新请求对象，便于链式调用。
func (c *Client) R() *Request {
	return c.NewRequest()
}

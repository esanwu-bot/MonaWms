package mclient

import (
	"crypto/tls"
	"encoding/base64"
	"net/http"
	"net/http/cookiejar"
	"time"

	"github.com/graingo/maltose/errors/merror"
)

// ClientConfig 是 Client 的配置。
type ClientConfig struct {
	// BaseURL 指定所有请求的基础 URL。
	BaseURL string `mconv:"base_url"`
	// Timeout 指定该客户端发起请求的超时时间。
	Timeout time.Duration `mconv:"timeout"`
	// Transport 指定发起单个 HTTP 请求的机制。
	Transport http.RoundTripper
	// Header 指定请求的默认请求头。
	Header http.Header
}

// SetBrowserMode 开启客户端的浏览器模式。
// 开启后，客户端会通过内存中的 cookie jar 自动保存并回传 cookie。
func (c *Client) SetBrowserMode(enabled bool) *Client {
	if enabled {
		jar, _ := cookiejar.New(nil)
		c.client.Jar = jar
	} else {
		c.client.Jar = nil
	}
	return c
}

// SetHeader 为客户端设置自定义 HTTP 请求头。
func (c *Client) SetHeader(key, value string) *Client {
	if c.config.Header == nil {
		c.config.Header = make(http.Header)
	}
	c.config.Header.Set(key, value)
	return c
}

// SetHeaderMap 通过 map 批量设置自定义 HTTP 请求头。
func (c *Client) SetHeaderMap(m map[string]string) *Client {
	if c.config.Header == nil {
		c.config.Header = make(http.Header)
	}
	for k, v := range m {
		c.config.Header.Set(k, v)
	}
	return c
}

// SetAgent 设置客户端的 User-Agent 请求头。
func (c *Client) SetAgent(agent string) *Client {
	return c.SetHeader("User-Agent", agent)
}

// SetContentType 设置客户端的 HTTP content type。
func (c *Client) SetContentType(contentType string) *Client {
	return c.SetHeader("Content-Type", contentType)
}

// SetCookie 为客户端设置一对 cookie。
func (c *Client) SetCookie(key, value string) *Client {
	if c.client.Jar == nil {
		c.SetBrowserMode(true)
	}
	cookie := (&http.Cookie{Name: key, Value: value}).String()
	if current := c.config.Header.Get("Cookie"); current != "" {
		cookie = current + "; " + cookie
	}
	return c.SetHeader("Cookie", cookie)
}

// SetCookieMap 通过 map 批量设置 cookie。
func (c *Client) SetCookieMap(m map[string]string) *Client {
	if c.client.Jar == nil {
		c.SetBrowserMode(true)
	}
	// 暂时通过请求头设置 cookie
	for k, v := range m {
		c.SetCookie(k, v)
	}
	return c
}

// SetBaseURL 设置所有请求的基础 URL。
func (c *Client) SetBaseURL(baseURL string) *Client {
	c.config.BaseURL = baseURL
	return c
}

// SetTimeout 设置客户端的请求超时时间。
func (c *Client) SetTimeout(t time.Duration) *Client {
	c.client.Timeout = t
	c.config.Timeout = t
	return c
}

// SetRedirectLimit 限制重定向的跳转次数。
// 它会在底层的 http.Client 上设置 CheckRedirect 函数。
// 限制为 0 表示不跟随任何重定向。
func (c *Client) SetRedirectLimit(redirectLimit int) *Client {
	c.client.CheckRedirect = func(_ *http.Request, via []*http.Request) error {
		if len(via) >= redirectLimit {
			return http.ErrUseLastResponse
		}
		return nil
	}
	return c
}

// SetTLSKeyCrt 设置客户端的 TLS 证书与私钥文件。
func (c *Client) SetTLSKeyCrt(crtFile, keyFile string) error {
	cert, err := tls.LoadX509KeyPair(crtFile, keyFile)
	if err != nil {
		return merror.Wrapf(err, "failed to load certificate from %s and key from %s", crtFile, keyFile)
	}

	if transport, ok := c.client.Transport.(*http.Transport); ok {
		transport = transport.Clone()
		tlsConfig := &tls.Config{}
		if transport.TLSClientConfig != nil {
			tlsConfig = transport.TLSClientConfig.Clone()
		}
		tlsConfig.Certificates = append(tlsConfig.Certificates, cert)
		transport.TLSClientConfig = tlsConfig
		c.SetTransport(transport)
		return nil
	}
	return merror.New("cannot set TLSClientConfig for custom Transport of the client")
}

// SetTLSConfig 设置客户端的 TLS 配置。
func (c *Client) SetTLSConfig(tlsConfig *tls.Config) error {
	if transport, ok := c.client.Transport.(*http.Transport); ok {
		transport = transport.Clone()
		if tlsConfig != nil {
			tlsConfig = tlsConfig.Clone()
		}
		transport.TLSClientConfig = tlsConfig
		c.SetTransport(transport)
		return nil
	}
	return merror.New("cannot set TLSClientConfig for custom Transport of the client")
}

// SetBasicAuth 设置客户端的 HTTP Basic 认证。
func (c *Client) SetBasicAuth(username, password string) *Client {
	auth := username + ":" + password
	return c.SetHeader("Authorization", "Basic "+base64.StdEncoding.EncodeToString([]byte(auth)))
}

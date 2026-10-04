package mclient

import (
	"bytes"
	"context"
	"encoding/json"
	"encoding/xml"
	"errors"
	"io"
	"net/http"
	"strings"

	"github.com/graingo/maltose/errors/merror"
	"github.com/graingo/maltose/internal/intlog"
)

// Response 是客户端请求响应的结构体。
type Response struct {
	*http.Response                   // 内嵌的 http.Response，即该请求底层的响应对象。
	cookies        map[string]string // 响应 cookie，只解析一次。
	result         any               // 成功响应时的结果对象。
	errorResult    any               // 错误响应时的结果对象。
}

// initCookie 初始化 Response 的 cookie map 字段。
func (r *Response) initCookie() {
	if r == nil {
		return
	}
	if r.cookies == nil {
		r.cookies = make(map[string]string)
		// Response 可能为 nil。
		if r.Response != nil {
			for _, v := range r.Cookies() {
				r.cookies[v.Name] = v.Value
			}
		}
	}
}

// GetCookie 获取并返回指定 `key` 的 cookie 值。
func (r *Response) GetCookie(key string) string {
	if r == nil {
		return ""
	}
	r.initCookie()
	return r.cookies[key]
}

// GetCookies 获取并返回全部 cookie 值。
func (r *Response) GetCookies() map[string]string {
	if r == nil {
		return nil
	}
	r.initCookie()
	return r.cookies
}

// GetCookieMap 获取并返回当前 cookie 值 map 的副本。
func (r *Response) GetCookieMap() map[string]string {
	if r == nil {
		return nil
	}
	r.initCookie()
	m := make(map[string]string, len(r.cookies))
	for k, v := range r.cookies {
		m[k] = v
	}
	return m
}

// ReadAll 以 []byte 形式获取并返回响应内容。
func (r *Response) ReadAll() []byte {
	// Response 可能为 nil。
	if r == nil || r.Response == nil || r.Response.Body == nil {
		return []byte{}
	}
	body, err := io.ReadAll(r.Response.Body)
	if err != nil {
		ctx := context.Background()
		if r.Request != nil {
			ctx = r.Request.Context()
		}
		intlog.Error(ctx, "ReadAll error:", err)
		return []byte{}
	}
	// 重置 Body 以支持重复读取
	r.SetBodyContent(body)
	return body
}

// ReadAllString 以 string 形式获取并返回响应内容。
func (r *Response) ReadAllString() string {
	return string(r.ReadAll())
}

// Parse 将响应体解析到给定的 result 中。
func (r *Response) Parse(result interface{}) error {
	if r == nil || r.Response == nil || r.Response.Body == nil {
		return errors.New("response or response body is nil")
	}

	// 读取响应体
	body, err := io.ReadAll(r.Response.Body)
	if err != nil {
		return err
	}
	// 原始 body 已被消费，需要关闭。
	r.Response.Body.Close()

	// 重置 Body 以支持重复读取
	r.SetBodyContent(body)

	// 尝试解析响应体
	mediaType := r.Header.Get("Content-Type")
	if idx := strings.Index(mediaType, ";"); idx != -1 {
		mediaType = mediaType[:idx]
	}
	mediaType = strings.TrimSpace(strings.ToLower(mediaType)) // 统一转为小写并去除空格
	switch mediaType {
	case "application/json":
		return json.Unmarshal(body, result)
	case "application/xml", "text/xml":
		return xml.Unmarshal(body, result)
	default:
		resultPtr, ok := result.(*string)
		if !ok {
			return merror.Newf("mclient: text/plain content type requires a *string to unmarshal into, got %T", result)
		}
		*resultPtr = string(body)
	}

	return nil
}

// IsSuccess 判断响应状态码是否处于 2xx 区间，
// 即请求已被服务端成功接收、理解并接受。
func (r *Response) IsSuccess() bool {
	if r == nil || r.Response == nil {
		return false
	}
	return r.StatusCode >= 200 && r.StatusCode < 300
}

// SetBodyContent 用自定义内容覆盖响应内容。
func (r *Response) SetBodyContent(content []byte) {
	if r == nil || r.Response == nil {
		return
	}
	buffer := bytes.NewBuffer(content)
	r.Body = io.NopCloser(buffer)
	r.ContentLength = int64(buffer.Len())
}

// Close 在响应不再使用时将其关闭。
func (r *Response) Close() error {
	if r == nil || r.Response == nil || r.Response.Body == nil {
		return nil
	}
	return r.Response.Body.Close()
}

// SetResult 设置成功响应时的结果对象。
func (r *Response) SetResult(result interface{}) {
	if r == nil {
		return
	}
	r.result = result
}

// SetError 设置错误响应时的结果对象。
func (r *Response) SetError(err interface{}) {
	if r == nil {
		return
	}
	r.errorResult = err
}

// parseResponse 根据状态码解析响应。
func (r *Response) parseResponse() error {
	if r == nil || r.Response == nil {
		return errors.New("response is nil")
	}

	if r.StatusCode >= 200 && r.StatusCode < 300 {
		// 成功响应 —— 若提供了 result 则解析到其中
		if r.result != nil {
			return r.Parse(r.result)
		}
	} else {
		// 错误响应 —— 若提供了 errorResult 则解析到其中
		if r.errorResult != nil {
			return r.Parse(r.errorResult)
		}
	}

	return nil
}

// GetResult 返回结果对象。
func (r *Response) GetResult() any {
	if r == nil {
		return nil
	}
	return r.result
}

// GetError 返回错误结果对象。
func (r *Response) GetError() any {
	if r == nil {
		return nil
	}
	return r.errorResult
}

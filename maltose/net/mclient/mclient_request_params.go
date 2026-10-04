package mclient

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"

	"github.com/graingo/maltose/internal/intlog"
)

// SetQuery 为请求设置查询参数。
func (r *Request) SetQuery(key, value string) *Request {
	r.queryParams.Set(key, value)
	return r
}

// SetQueryMap 通过 map 批量设置查询参数。
func (r *Request) SetQueryMap(params map[string]string) *Request {
	for k, v := range params {
		r.queryParams.Set(k, v)
	}
	return r
}

// SetForm 为请求设置表单参数。
func (r *Request) SetForm(key, value string) *Request {
	r.formParams.Set(key, value)
	return r
}

// SetFormMap 通过 map 批量设置表单参数。
func (r *Request) SetFormMap(params map[string]string) *Request {
	for k, v := range params {
		r.formParams.Set(k, v)
	}
	return r
}

// SetBody 设置请求体。
func (r *Request) SetBody(body any) *Request {
	return r.data(body)
}

// data 设置请求数据。
// 它会智能处理不同类型的数据，并将请求体缓冲到内存中，
// 以保证重试时可以重复读取。
func (r *Request) data(data any) *Request {
	if r.Request == nil {
		r.Request = &http.Request{
			Header: make(http.Header),
		}
	}

	var bodyBytes []byte
	isJSON := false

	switch d := data.(type) {
	case string:
		bodyBytes = []byte(d)
	case []byte:
		bodyBytes = d
	case io.Reader:
		// 对于不可 seek 的通用 reader，必须将其完整缓冲到内存中
		// 才能支持重试。这是在简单性与可靠性之间做出的设计取舍。
		b, err := io.ReadAll(d)
		if err != nil {
			ctx := context.Background()
			if r.Request != nil && r.Request.Context() != nil {
				ctx = r.Request.Context()
			}
			intlog.Errorf(ctx, "mclient: failed to read io.Reader body for retry buffering: %v", err)
			// 兜底方案：仍使用原始 reader，但带请求体的重试会失败。
			r.Request.Body = io.NopCloser(d)
			r.Request.GetBody = nil
			return r
		}
		bodyBytes = b
	default:
		// 其他类型尝试按 JSON 编码
		jsonBytes, err := json.Marshal(data)
		if err != nil {
			ctx := context.Background()
			if r.Request != nil && r.Request.Context() != nil {
				ctx = r.Request.Context()
			}
			intlog.Errorf(ctx, "mclient: json.Marshal failed: %v", err)
			return r
		}
		bodyBytes = jsonBytes
		isJSON = true
	}

	// 设置首次请求的请求体
	r.Request.Body = io.NopCloser(bytes.NewReader(bodyBytes))
	// 设置内容长度
	r.Request.ContentLength = int64(len(bodyBytes))
	// 提供 GetBody 以支持重试，这也是 http.Client 在重定向或重试时
	// 重新发送请求体的标准做法。
	r.Request.GetBody = func() (io.ReadCloser, error) {
		return io.NopCloser(bytes.NewReader(bodyBytes)), nil
	}

	if isJSON && r.Request.Header.Get("Content-Type") == "" {
		r.ContentType("application/json")
	}

	return r
}

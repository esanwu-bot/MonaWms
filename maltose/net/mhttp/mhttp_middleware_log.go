package mhttp

import (
	"bytes"
	"io"
	"sort"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/graingo/maltose/os/mlog"
)

// LogMaxBodySize 控制请求/响应体的日志记录，为 0 时关闭请求体日志。
var LogMaxBodySize = 0

// responseWriter 是自定义的 http.ResponseWriter，用于捕获响应体与状态码。
// 它内嵌 gin.ResponseWriter 以保证完全兼容。
type responseWriter struct {
	gin.ResponseWriter
	body  *bytes.Buffer
	limit int
}

func (w *responseWriter) capture(data []byte) {
	if w.limit == 0 {
		return
	}
	if w.limit < 0 {
		_, _ = w.body.Write(data)
		return
	}
	remaining := w.limit + 1 - w.body.Len()
	if remaining <= 0 {
		return
	}
	if len(data) > remaining {
		data = data[:remaining]
	}
	_, _ = w.body.Write(data)
}

// Write 将数据作为 HTTP 响应的一部分写入连接。
// 同时写入原始 writer 与缓冲区，以捕获响应体。
func (w *responseWriter) Write(b []byte) (int, error) {
	n, err := w.ResponseWriter.Write(b)
	if err == nil {
		w.capture(b[:n])
	}
	return n, err
}

// WriteString 将字符串作为 HTTP 响应的一部分写入连接。
// 同时写入原始 writer 与缓冲区，以捕获响应体。
func (w *responseWriter) WriteString(s string) (int, error) {
	n, err := w.ResponseWriter.WriteString(s)
	if err == nil {
		w.capture([]byte(s[:n]))
	}
	return n, err
}

// MiddlewareLog 是分两步记录 HTTP 请求日志的中间件：
// 1. 处理函数执行前（"started"）。
// 2. 处理函数完成后（"finished"）。
// 这样可以获得更好的可观测性，尤其便于排查挂起或 panic 的请求。
func MiddlewareLog() MiddlewareFunc {
	bodyLimit := LogMaxBodySize
	return func(r *Request) {
		// 跳过健康检查
		if r.Request.URL.Path == r.server.config.HealthCheck {
			r.Next()
			return
		}

		// --- 第 1 步：记录请求开始 ---

		start := time.Now()

		// 安全地读取并捕获请求体用于记录日志，随后将其还原。
		var reqBodyBytes []byte
		if bodyLimit != 0 && r.Request.Body != nil {
			reqBodyBytes, r.Request.Body = readBodyForLog(r.Request.Body, bodyLimit)
		}

		// 创建自定义响应 writer 以捕获响应体与状态码。
		writer := &responseWriter{
			ResponseWriter: r.Writer,
			body:           &bytes.Buffer{},
			limit:          bodyLimit,
		}
		r.Writer = writer

		requestFields := mlog.Fields{
			mlog.String("ip", r.ClientIP()),
			mlog.String("method", r.Request.Method),
			mlog.String("path", r.Request.URL.Path),
		}
		if query := r.Request.URL.Query(); len(query) > 0 {
			keys := make([]string, 0, len(query))
			for key := range query {
				keys = append(keys, key)
			}
			sort.Strings(keys)
			requestFields = append(requestFields, mlog.Any("query_keys", keys))
		}
		if len(reqBodyBytes) > 0 {
			requestFields = append(requestFields, mlog.String("request_body", getBodyString(reqBodyBytes, bodyLimit)))
		}

		r.Logger().Infow(r.Request.Context(), "http server request started", requestFields...)

		// --- 第 2 步：执行处理函数并记录完成 ---

		r.Next()

		duration := time.Since(start)
		status := writer.Status()
		resBodyBytes := writer.body.Bytes()

		msg := "http server request finished"

		// 最终日志需要包含完整的上下文信息。
		// 以请求字段为基础，再补充响应相关信息。
		finalFields := append(requestFields,
			mlog.Int("status", status),
			mlog.Float64("latency_ms", float64(duration.Nanoseconds())/1e6),
		)
		if bodyLimit != 0 && len(resBodyBytes) > 0 {
			finalFields = append(finalFields, mlog.String("response_body", getBodyString(resBodyBytes, bodyLimit)))
		}

		// 根据错误或状态码决定日志级别
		if len(r.Errors) > 0 {
			msg += " with errors"
			// 使用上下文中的真实错误记录日志
			r.Logger().Errorw(r.Request.Context(), r.Errors.Last().Err, msg, finalFields...)
		} else if status >= 400 {
			msg += " with warning status"
			r.Logger().Warnw(r.Request.Context(), msg, finalFields...)
		} else {
			r.Logger().Infow(r.Request.Context(), msg, finalFields...)
		}
	}
}

type replayReadCloser struct {
	io.Reader
	io.Closer
}

func readBodyForLog(body io.ReadCloser, limit int) ([]byte, io.ReadCloser) {
	if limit < 0 {
		data, err := io.ReadAll(body)
		if err != nil {
			return nil, body
		}
		_ = body.Close()
		return data, io.NopCloser(bytes.NewReader(data))
	}
	data, err := io.ReadAll(io.LimitReader(body, int64(limit+1)))
	if err != nil {
		return nil, body
	}
	return data, &replayReadCloser{
		Reader: io.MultiReader(bytes.NewReader(data), body),
		Closer: body,
	}
}

// getBodyString 安全地将字节切片转换为用于日志的字符串，并按上限截断。
func getBodyString(body []byte, limit int) string {
	if len(body) == 0 {
		return ""
	}
	if limit < 0 { // 不限制长度
		return string(body)
	}
	if len(body) > limit {
		return string(body[:limit]) + "..."
	}
	return string(body)
}

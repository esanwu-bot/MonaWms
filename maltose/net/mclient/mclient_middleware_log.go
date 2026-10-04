package mclient

import (
	"bytes"
	"io"
	"net/http"
	"sort"
	"time"

	"github.com/graingo/maltose"
	"github.com/graingo/maltose/os/mlog"
)

// LogMaxBodySize 控制请求/响应体的日志记录，为 0 时关闭请求体日志。
var LogMaxBodySize = 0

// MiddlewareLog 创建分两步记录请求与响应详情的中间件：
// 1. 请求发出前（"started"）。
// 2. 请求完成后（"finished" 或 "error"）。
// 这样可以获得更好的可观测性，尤其便于排查挂起的请求。
func MiddlewareLog(logger *mlog.Logger) MiddlewareFunc {
	if logger == nil {
		return func(next HandlerFunc) HandlerFunc {
			return next
		}
	}
	bodyLimit := LogMaxBodySize

	return func(next HandlerFunc) HandlerFunc {
		return func(req *Request) (*Response, error) {
			ctx := req.Context()
			l := logger.With(mlog.String(maltose.COMPONENT, "mclient"))

			// --- 第 1 步：记录请求开始 ---

			var reqBodyBytes []byte
			if bodyLimit != 0 && req.Body != nil {
				reqBodyBytes, req.Body = readBodyForLog(req.Body, bodyLimit)
			}

			requestFields := mlog.Fields{
				mlog.String("method", req.Request.Method),
				mlog.String("url", urlWithoutQuery(req.Request)),
			}
			if queryKeys := requestQueryKeys(req.Request); len(queryKeys) > 0 {
				requestFields = append(requestFields, mlog.Any("query_keys", queryKeys))
			}
			if len(reqBodyBytes) > 0 {
				requestFields = append(requestFields, mlog.String("request_body", getBodyString(reqBodyBytes, bodyLimit)))
			}

			l.Infow(ctx, "http client request started", requestFields...)

			// --- 第 2 步：执行请求并记录完成 ---

			start := time.Now()
			resp, err := next(req)
			duration := time.Since(start)

			// 最终日志需要包含完整的上下文信息。
			// 以请求相关字段为基础。
			finalFields := append(requestFields, mlog.Float64("duration_ms", float64(duration.Nanoseconds())/1e6))

			if err != nil {
				// 处理尚未获得响应时的网络或其他错误
				finalFields = append(finalFields, mlog.Err(err))
				l.Errorw(ctx, err, "http client request error", finalFields...)
				return resp, err
			}

			// 若已获得响应，则将其详情加入日志
			finalFields = append(finalFields, mlog.Int("status", resp.StatusCode))
			if bodyLimit != 0 && resp.Body != nil {
				bodyBytes, restoredBody := readBodyForLog(resp.Body, bodyLimit)
				resp.Body = restoredBody
				if len(bodyBytes) > 0 {
					finalFields = append(finalFields, mlog.String("response_body", getBodyString(bodyBytes, bodyLimit)))
				}
			}

			if resp.StatusCode >= 400 {
				l.Warnw(ctx, "http client request finished with error status", finalFields...)
			} else {
				l.Infow(ctx, "http client request finished", finalFields...)
			}

			return resp, nil
		}
	}
}

func urlWithoutQuery(request *http.Request) string {
	if request == nil || request.URL == nil {
		return ""
	}
	urlCopy := *request.URL
	urlCopy.RawQuery = ""
	urlCopy.ForceQuery = false
	return urlCopy.String()
}

func requestQueryKeys(request *http.Request) []string {
	if request == nil || request.URL == nil {
		return nil
	}
	query := request.URL.Query()
	keys := make([]string, 0, len(query))
	for key := range query {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	return keys
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

package mclient

import (
	"fmt"
	"net/url"
	"strings"
	"time"

	"github.com/graingo/maltose"
	"github.com/graingo/maltose/errors/merror"
	"github.com/graingo/maltose/net/mtrace"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/trace"
)

const (
	instrumentName = "github.com/graingo/maltose/net/mclient"
	version        = maltose.VERSION
)

// internalMiddlewareRecovery 内部错误恢复中间件
func internalMiddlewareRecovery() MiddlewareFunc {
	return func(next HandlerFunc) HandlerFunc {
		return func(req *Request) (*Response, error) {
			var resp *Response
			var err error

			defer func() {
				if r := recover(); r != nil {
					// 处理 panic
					err = merror.Newf("client panic: %v", r)
				}
			}()

			resp, err = next(req)
			return resp, err
		}
	}
}

// internalMiddlewareMetric 内部指标采集中间件
func internalMiddlewareMetric() MiddlewareFunc {
	return func(next HandlerFunc) HandlerFunc {
		return func(req *Request) (*Response, error) {
			// 记录起始时间
			startTime := time.Now()

			// 请求发出前采集指标
			handleMetricsBeforeRequest(req.Request)

			// 执行下一个中间件
			resp, err := next(req)

			// 请求完成后采集指标
			if resp != nil {
				handleMetricsAfterRequestDone(req.Request, resp.Response, err, startTime)
			} else {
				handleMetricsAfterRequestDone(req.Request, nil, err, startTime)
			}

			return resp, err
		}
	}
}

// internalMiddlewareTrace 客户端链路追踪中间件
func internalMiddlewareTrace() MiddlewareFunc {
	return func(next HandlerFunc) HandlerFunc {
		return func(req *Request) (*Response, error) {
			ctx := req.Request.Context()

			// 创建 tracer
			tr := otel.GetTracerProvider().Tracer(
				instrumentName,
				trace.WithInstrumentationVersion(version),
			)

			// 构造 span 名称
			spanName := "HTTP " + req.Request.Method

			// 创建 span
			ctx, span := tr.Start(
				ctx,
				spanName,
				trace.WithSpanKind(trace.SpanKindClient),
			)
			defer span.End()

			// 设置 span 属性
			span.SetAttributes(
				attribute.String(mtrace.AttributeHTTPMethod, req.Request.Method),
				attribute.String(mtrace.AttributeHTTPUrl, req.Request.URL.String()),
				attribute.String(mtrace.AttributeHTTPHost, getHost(req.Request.URL)),
				attribute.String(mtrace.AttributeHTTPScheme, getSchema(req.Request.URL)),
				attribute.String(mtrace.AttributeHTTPFlavor, getProtocolVersion(req.Request.Proto)),
				attribute.String(mtrace.AttributeHTTPTarget, getPath(req.Request.URL)),
				attribute.String(mtrace.AttributeHTTPUserAgent, req.Request.UserAgent()),
			)

			// 将上下文注入出向请求头
			otel.GetTextMapPropagator().Inject(
				ctx,
				propagation.HeaderCarrier(req.Request.Header),
			)

			// 用追踪上下文更新 request
			req.Request = req.Request.WithContext(ctx)

			// 执行下一个中间件
			resp, err := next(req)

			// 处理响应与错误
			if err != nil {
				span.RecordError(err)
				span.SetStatus(codes.Error, err.Error())
			} else if resp != nil {
				span.SetAttributes(attribute.Int(mtrace.AttributeHTTPStatusCode, resp.StatusCode))
				statusCode, _ := httpStatusCodeToSpanStatus(resp.StatusCode)
				span.SetStatus(statusCode, "")
			}

			return resp, err
		}
	}
}

// httpStatusCodeToSpanStatus 将 HTTP 状态码转换为 span 状态码。
// 返回 span 状态码及其描述。
func httpStatusCodeToSpanStatus(code int) (codes.Code, string) {
	if code < 100 || code >= 600 {
		return codes.Error, fmt.Sprintf("Invalid HTTP status code %d", code)
	}
	if code >= 400 {
		return codes.Error, fmt.Sprintf("HTTP %d", code)
	}
	return codes.Ok, ""
}

// getHost 从 URL 中提取 host
func getHost(u *url.URL) string {
	if u.Host != "" {
		return u.Host
	}
	return "unknown"
}

// getSchema 从 URL 中提取协议类型
func getSchema(u *url.URL) string {
	if u.Scheme != "" {
		return u.Scheme
	}
	return "http"
}

// getPath 从 URL 中提取 path
func getPath(u *url.URL) string {
	if u.Path != "" {
		return u.Path
	}
	return "/"
}

// getProtocolVersion 提取协议版本
func getProtocolVersion(proto string) string {
	if proto != "" {
		return strings.ToLower(proto)
	}
	return "http/1.1"
}

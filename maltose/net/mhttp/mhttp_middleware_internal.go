package mhttp

import (
	"errors"
	"fmt"
	"net"
	"os"
	"strings"
	"time"

	"github.com/graingo/maltose"
	"github.com/graingo/maltose/errors/mcode"
	"github.com/graingo/maltose/errors/merror"
	"github.com/graingo/maltose/net/mtrace"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/trace"
)

const (
	instrumentName = "github.com/graingo/maltose/net/mhttp"
	version        = maltose.VERSION
)

// internalMiddlewareDefaultResponse 内部默认响应处理中间件
func internalMiddlewareDefaultResponse() MiddlewareFunc {
	return func(r *Request) {
		r.Next()

		// 若响应已被其他中间件写入，则跳过
		if r.Writer.Written() {
			return
		}

		// 处理错误场景 —— 仅兜底处理非结构化错误
		// 带错误码的结构化错误交由用户中间件处理
		if len(r.Errors) > 0 {
			err := r.Errors.Last().Err
			code := merror.Code(err)
			if code == mcode.CodeNil {
				r.String(500, fmt.Sprintf("Error: %s", err.Error()))
			} else {
				r.String(codeToHTTPStatus(code), code.Message())
			}
			return
		}

		// 处理来自 handler 或其他中间件的响应
		if res := r.GetHandlerResponse(); res != nil {
			switch v := res.(type) {
			case string:
				r.String(200, v)
			case []byte:
				r.String(200, string(v))
			default:
				r.JSON(200, res)
			}
			return
		}

		// 若没有响应内容，则返回空字符串
		r.String(200, "")
	}
}

// internalMiddlewareRecovery 内部错误恢复中间件
func internalMiddlewareRecovery() MiddlewareFunc {
	return func(r *Request) {
		defer func() {
			if err := recover(); err != nil {
				// 检查连接是否已断开，因为这类情况
				// 并不真正需要打印 panic 堆栈。
				var brokenPipe bool
				if ne, ok := err.(*net.OpError); ok {
					var se *os.SyscallError
					if errors.As(ne, &se) {
						seStr := strings.ToLower(se.Error())
						if strings.Contains(seStr, "broken pipe") ||
							strings.Contains(seStr, "connection reset by peer") {
							brokenPipe = true
						}
					}
				}

				merr := merror.NewCodef(mcode.CodeInternalPanic, "Panic recovered: %s", err)

				if brokenPipe {
					// 连接已断开，无法再写入状态码。
					// 只记录错误日志并中止请求
					r.Logger().Warnf(r.Request.Context(), "Connection broken: %s", err)
					r.Error(merr)
					r.Abort()
				} else {
					// 普通 panic 记录错误日志
					r.Logger().Errorf(r.Request.Context(), merr, "Panic recovered")
					// 调用 panic 处理器
					if r.server.panicHandler != nil {
						r.server.panicHandler(r, merr)
					}
				}
			}
		}()
		r.Next()
	}
}

// internalMiddlewareMetric 内部指标采集中间件
func internalMiddlewareMetric() MiddlewareFunc {
	return func(r *Request) {
		// 记录起始时间
		startTime := time.Now()

		// 请求处理前采集指标
		r.server.handleMetricsBeforeRequest(r)

		// 执行下一个中间件
		r.Next()

		// 请求完成后采集指标
		r.server.handleMetricsAfterRequestDone(r, startTime)
	}
}

// internalMiddlewareTrace 返回用于 OpenTelemetry 链路追踪的中间件
func internalMiddlewareTrace() MiddlewareFunc {
	return func(r *Request) {
		// 跳过健康检查
		if r.Request.URL.Path == r.server.config.HealthCheck {
			r.Next()
			return
		}

		ctx := r.Request.Context()
		tr := otel.GetTracerProvider().Tracer(
			instrumentName,
			trace.WithInstrumentationVersion(version),
		)

		// 提取上下文与 baggage
		ctx = otel.GetTextMapPropagator().Extract(
			ctx,
			propagation.HeaderCarrier(r.Request.Header),
		)

		// 设置 span 名称
		spanName := r.Request.URL.Path
		if spanName == "" {
			spanName = "HTTP " + r.Request.Method
		}

		// 开启新的 span
		ctx, span := tr.Start(
			ctx,
			spanName,
			trace.WithSpanKind(trace.SpanKindServer),
		)
		defer span.End()

		// 将更新后的上下文注入 Request 对象
		r.Request = r.Request.WithContext(ctx)

		// 处理请求
		r.Next()

		// 设置 span 属性
		span.SetAttributes(
			attribute.String(mtrace.AttributeHTTPMethod, r.Request.Method),
			attribute.String(mtrace.AttributeHTTPUrl, r.Request.URL.String()),
			attribute.String(mtrace.AttributeHTTPHost, r.Request.Host),
			attribute.String(mtrace.AttributeHTTPScheme, getSchema(r)),
			attribute.String(mtrace.AttributeHTTPFlavor, r.Request.Proto),
			attribute.String(mtrace.AttributeHTTPUserAgent, r.Request.UserAgent()),
			attribute.String(mtrace.AttributeHTTPRoute, r.FullPath()),
			attribute.Int(mtrace.AttributeHTTPStatusCode, r.Writer.Status()),
		)

		// 设置 span 状态
		if err := r.Errors.Last(); err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
		} else {
			statusCode, _ := httpStatusCodeToSpanStatus(r.Writer.Status())
			span.SetStatus(statusCode, "")
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

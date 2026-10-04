package mtrace

import (
	"context"
	"crypto/rand"
	"strings"

	"github.com/graingo/maltose/container/mvar"
	"github.com/graingo/maltose/errors/merror"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/propagation"
	sdkTrace "go.opentelemetry.io/otel/sdk/trace"
	"go.opentelemetry.io/otel/trace"
)

// 链路属性的语义约定。
// 这些键名基于 OpenTelemetry 语义约定规范。
// 参见：https://opentelemetry.io/docs/specs/semconv/
const (
	AttributeHTTPMethod       = "http.method"
	AttributeHTTPUrl          = "http.url"
	AttributeHTTPTarget       = "http.target"
	AttributeHTTPHost         = "http.host"
	AttributeHTTPScheme       = "http.scheme"
	AttributeHTTPStatusCode   = "http.status_code"
	AttributeHTTPStatusText   = "http.status_text"
	AttributeHTTPFlavor       = "http.flavor"
	AttributeHTTPUserAgent    = "http.user_agent"
	AttributeHTTPRequestSize  = "http.request_content_length"
	AttributeHTTPResponseSize = "http.response_content_length"
	AttributeHTTPRoute        = "http.route"
	AttributeHTTPClientIP     = "http.client_ip"
)

var (
	defaultTextMapPropagator = propagation.NewCompositeTextMapPropagator(
		propagation.TraceContext{},
		propagation.Baggage{},
	)
)

func init() {
	CheckSetDefaultTextMapPropagator()
}

// GetProvider 返回全局 tracer provider。
func GetProvider() trace.TracerProvider {
	return otel.GetTracerProvider()
}

// SetProvider 设置全局 tracer provider。
func SetProvider(p trace.TracerProvider) {
	otel.SetTracerProvider(p)
}

// NewProvider 是对 sdkTrace.NewTracerProvider 的封装。
func NewProvider(opts ...sdkTrace.TracerProviderOption) trace.TracerProvider {
	return sdkTrace.NewTracerProvider(opts...)
}

// CheckSetDefaultTextMapPropagator 检查默认的 TextMapPropagator 是否已设置。
func CheckSetDefaultTextMapPropagator() {
	p := otel.GetTextMapPropagator()
	if len(p.Fields()) == 0 {
		otel.SetTextMapPropagator(GetDefaultTextMapPropagator())
	}
}

// GetDefaultTextMapPropagator 返回用于上下文传播的默认 TextMapPropagator。
func GetDefaultTextMapPropagator() propagation.TextMapPropagator {
	return defaultTextMapPropagator
}

// GetTraceID 从上下文中获取 trace id。
func GetTraceID(ctx context.Context) string {
	if ctx == nil {
		return ""
	}
	traceID := trace.SpanContextFromContext(ctx).TraceID()
	if traceID.IsValid() {
		return traceID.String()
	}
	return ""
}

// GetSpanID 从上下文中获取 span id。
func GetSpanID(ctx context.Context) string {
	if ctx == nil {
		return ""
	}
	spanID := trace.SpanContextFromContext(ctx).SpanID()
	if spanID.IsValid() {
		return spanID.String()
	}
	return ""
}

// SetBaggageValue 是向 baggage 中添加单个键值对的便捷方法。
func SetBaggageValue(ctx context.Context, key string, value any) context.Context {
	return NewBaggage(ctx).SetValue(key, value)
}

// SetBaggageMap 是向 baggage 中批量添加键值对的便捷方法。
func SetBaggageMap(ctx context.Context, data map[string]any) context.Context {
	return NewBaggage(ctx).SetMap(data)
}

// GetBaggageMap 获取并返回 baggage 中的键值对 map。
func GetBaggageMap(ctx context.Context) map[string]any {
	return NewBaggage(ctx).GetMap()
}

// GetBaggageVar 获取并返回 baggage 中指定键的值。
func GetBaggageVar(ctx context.Context, key string) *mvar.Var {
	return NewBaggage(ctx).GetVar(key)
}

// WithUUID 将自定义 UUID 作为 trace id 注入上下文。
func WithUUID(ctx context.Context, uuid string) (context.Context, error) {
	return WithTraceID(ctx, strings.Replace(uuid, "-", "", -1))
}

// WithTraceID 将自定义 trace id 注入上下文。
func WithTraceID(ctx context.Context, traceID string) (context.Context, error) {
	generatedTraceID, err := trace.TraceIDFromHex(traceID)
	if err != nil {
		return ctx, merror.Newf(`invalid custom traceID "%s", a traceID string should be composed with [0-f] and fixed length 32`, traceID)
	}

	sc := trace.SpanContextFromContext(ctx)
	if !sc.IsValid() {
		// 若当前上下文中没有 SpanContext，
		// 则用给定的 traceID 和一个随机生成的 spanID 创建新的 SpanContext。
		var spanID trace.SpanID
		if _, err := rand.Read(spanID[:]); err != nil {
			return ctx, merror.Wrap(err, "generate span ID failed")
		}
		sc = trace.NewSpanContext(trace.SpanContextConfig{
			TraceID: generatedTraceID,
			SpanID:  spanID,
			Remote:  true, // 由于来自自定义 ID，这里标记为 remote。
		})
	} else {
		// 若已存在 SpanContext，则只替换其中的 traceID。
		sc = sc.WithTraceID(generatedTraceID)
	}

	return trace.ContextWithSpanContext(ctx, sc), nil
}

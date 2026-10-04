package mtrace

import (
	"context"

	"go.opentelemetry.io/otel/trace"
)

// Span 封装 trace.Span，用于提供兼容与扩展能力。
type Span struct {
	trace.Span
}

// NewSpan 使用默认 tracer 创建一个 span。
func NewSpan(ctx context.Context, spanName string, opts ...trace.SpanStartOption) (context.Context, *Span) {
	ctx, span := NewTracer().Start(ctx, spanName, opts...)
	return ctx, &Span{
		Span: span,
	}
}

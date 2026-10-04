package mctx

import (
	"context"

	"github.com/graingo/maltose/net/mtrace"
)

type (
	// Ctx 是 context.Context 的简短别名。
	Ctx = context.Context
)

// New 创建并返回带有上下文 ID 的 context。
// 创建的 context 会带有独立的 trace id，用于链路追踪。
func New() context.Context {
	return WithSpan(context.Background(), "mctx.New")
}

// WithSpan 基于给定的父 context `ctx` 创建并返回包含 span 的 context。
func WithSpan(ctx context.Context, spanName string) context.Context {
	if spanName == "" {
		spanName = "mctx.WithSpan"
	}
	ctx, span := mtrace.NewSpan(ctx, spanName)
	// 该 API 只返回 context，调用方拿不到 span 句柄来结束。
	// 因此立即结束这个合成的 context span，避免被永久持有。
	span.End()
	return ctx
}

// CtxID 从 context 中获取并返回上下文 ID。
func CtxID(ctx context.Context) string {
	return mtrace.GetTraceID(ctx)
}

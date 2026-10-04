package mlog

import (
	"github.com/graingo/maltose/net/mtrace"
)

// 内部 hook 名称
const (
	traceHookName = "trace_hook"
	ctxHookName   = "ctx_hook"
)

// traceHook 是自动附加 TraceID 的 hook。
type traceHook struct{}

func (h *traceHook) Name() string { return traceHookName }

func (h *traceHook) Levels() []Level { return AllLevels() }

func (h *traceHook) Fire(entry *Entry) {
	if traceID := mtrace.GetTraceID(entry.GetContext()); traceID != "" {
		entry.AddField(String("trace.id", traceID))
	}
	if spanID := mtrace.GetSpanID(entry.GetContext()); spanID != "" {
		entry.AddField(String("span.id", spanID))
	}
}

// CtxKey 是上下文键的类型。
type CtxKey string

// ctxHook 是从上下文中提取值的 hook。
type ctxHook struct {
	keys []string
}

func (h *ctxHook) Name() string { return ctxHookName }

func (h *ctxHook) Levels() []Level { return AllLevels() }

func (h *ctxHook) Fire(entry *Entry) {
	if entry.GetContext() == nil || len(h.keys) == 0 {
		return
	}
	for _, ctxKey := range h.keys {
		if value := entry.GetContext().Value(CtxKey(ctxKey)); value != nil {
			entry.AddField(Any(ctxKey, value))
		}
	}
}

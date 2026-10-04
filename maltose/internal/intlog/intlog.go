// Package intlog 提供仅供 Maltose 内部开发使用的日志能力。
package intlog

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"time"

	"go.opentelemetry.io/otel/trace"
)

const (
	stackFilterKey = "/internal/intlog"
)

var (
	// debug 是内部日志开关。
	// 默认关闭。
	// 可通过将环境变量 "MALTOSE_DEBUG" 设为 "true" 开启。
	debug = false
)

func init() {
	if v := os.Getenv("MALTOSE_DEBUG"); v != "" {
		if b, _ := strconv.ParseBool(v); b {
			debug = true
		}
	}
}

// SetDebug 设置内部日志的调试开关。
func SetDebug(d bool) {
	debug = d
}

// Print 使用 fmt.Println 打印 `v` 并换行。
// 参数 `v` 可以是多个变量。
func Print(ctx context.Context, v ...interface{}) {
	if !debug {
		return
	}
	doPrint(ctx, fmt.Sprint(v...), false)
}

// Printf 使用 fmt.Printf 按 `format` 格式打印 `v`。
// 参数 `v` 可以是多个变量。
func Printf(ctx context.Context, format string, v ...interface{}) {
	if !debug {
		return
	}
	doPrint(ctx, fmt.Sprintf(format, v...), false)
}

// Error 使用 fmt.Println 打印 `v` 并换行（错误级别）。
// 参数 `v` 可以是多个变量。
func Error(ctx context.Context, v ...interface{}) {
	if !debug {
		return
	}
	doPrint(ctx, fmt.Sprint(v...), true)
}

// Errorf 使用 fmt.Printf 按 `format` 格式打印 `v`（错误级别）。
func Errorf(ctx context.Context, format string, v ...interface{}) {
	if !debug {
		return
	}
	doPrint(ctx, fmt.Sprintf(format, v...), true)
}

func doPrint(ctx context.Context, content string, stack bool) {
	if !debug {
		return
	}

	buffer := bytes.NewBuffer(nil)
	buffer.WriteString(time.Now().Format("2006-01-02 15:04:05.000"))
	buffer.WriteString(" [INTE] ")
	buffer.WriteString(file())
	buffer.WriteString(" ")
	if s := traceIDStr(ctx); s != "" {
		buffer.WriteString(s + " ")
	}
	buffer.WriteString(content)
	buffer.WriteString("\n")

	if stack {
		buffer.WriteString("Caller Stack:\n")
		callerStack := getCallerStack()
		buffer.WriteString(callerStack)
	}

	fmt.Print(buffer.String())
}

// traceIDStr 获取并返回用于日志输出的 trace id 字符串。
func traceIDStr(ctx context.Context) string {
	if ctx == nil {
		return ""
	}
	spanCtx := trace.SpanContextFromContext(ctx)
	if traceID := spanCtx.TraceID(); traceID.IsValid() {
		return "{" + traceID.String() + "}"
	}
	return ""
}

// file 返回调用方文件名及其行号。
func file() string {
	_, file, line, ok := runtime.Caller(3) // 跳过 doPrint、Error/Print 与真正的调用方
	if ok {
		return fmt.Sprintf("%s:%d", filepath.Base(file), line)
	}
	return "unknown:0"
}

// getCallerStack 返回排除本包之外的调用栈信息。
func getCallerStack() string {
	stackBuf := bytes.NewBuffer(nil)

	// 从深度 3 开始，跳过 doPrint、Error/Print 函数
	for i := 3; i < 15; i++ {
		_, file, line, ok := runtime.Caller(i)
		if !ok {
			break
		}
		if isFilteredStack(file) {
			continue
		}
		stackBuf.WriteString(fmt.Sprintf("    %s:%d\n", filepath.Base(file), line))
	}

	return stackBuf.String()
}

// isFilteredStack 判断该栈帧是否需要被过滤掉。
func isFilteredStack(file string) bool {
	return filepath.Base(file) == "intlog.go"
}

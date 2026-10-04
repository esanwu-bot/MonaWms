package mlog

import (
	"context"
	"sync/atomic"
)

// ILogger 是 logger 的接口。
type ILogger interface {
	Debugf(ctx context.Context, format string, v ...any)                // Debugf 以 Debug 级别记录日志。
	Debugw(ctx context.Context, msg string, fields ...Field)            // Debugw 以 Debug 级别记录日志。
	Infof(ctx context.Context, format string, v ...any)                 // Infof 以 Info 级别记录日志。
	Infow(ctx context.Context, msg string, fields ...Field)             // Infow 以 Info 级别记录日志。
	Warnf(ctx context.Context, format string, v ...any)                 // Warnf 以 Warn 级别记录日志。
	Warnw(ctx context.Context, msg string, fields ...Field)             // Warnw 以 Warn 级别记录日志。
	Errorf(ctx context.Context, err error, format string, v ...any)     // Errorf 以 Error 级别记录日志。
	Errorw(ctx context.Context, err error, msg string, fields ...Field) // Errorw 以 Error 级别记录日志。
	Fatalf(ctx context.Context, err error, format string, v ...any)     // Fatalf 以 Fatal 级别记录日志。
	Fatalw(ctx context.Context, err error, msg string, fields ...Field) // Fatalw 以 Fatal 级别记录日志。
	Panicf(ctx context.Context, err error, format string, v ...any)     // Panicf 以 Panic 级别记录日志。
	Panicw(ctx context.Context, err error, msg string, fields ...Field) // Panicw 以 Panic 级别记录日志。
}

const (
	defaultFile       = ""
	defaultTimeFormat = "2006-01-02T15:04:05.000"
	defaultFormat     = "text"
	defaultLevel      = InfoLevel
)

var (
	// 确保 Logger 实现了 ILogger 接口
	_ ILogger = &Logger{}

	defaultLogger atomic.Pointer[Logger]
)

func init() {
	defaultLogger.Store(New())
}

// DefaultLogger 返回默认 logger。
func DefaultLogger() *Logger {
	return defaultLogger.Load()
}

// SetDefaultLogger 设置 glog 包的默认 logger。
// 注意：在不同 goroutine 中调用该函数可能存在并发安全问题。
func SetDefaultLogger(l *Logger) {
	if l == nil {
		l = New()
	}
	defaultLogger.Store(l)
}

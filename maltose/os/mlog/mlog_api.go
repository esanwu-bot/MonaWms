package mlog

import "context"

// Debugf 以 [DEBU] 前缀、自定义格式打印日志内容并换行。
func Debugf(ctx context.Context, format string, v ...any) {
	DefaultLogger().Debugf(ctx, format, v...)
}

// Debugw 以 [DEBU] 前缀、自定义格式打印日志内容并换行。
func Debugw(ctx context.Context, msg string, fields ...Field) {
	DefaultLogger().Debugw(ctx, msg, fields...)
}

// Infof 以 [INFO] 前缀、自定义格式打印日志内容并换行。
func Infof(ctx context.Context, format string, v ...any) {
	DefaultLogger().Infof(ctx, format, v...)
}

// Infow 以 [INFO] 前缀打印日志内容并换行。
func Infow(ctx context.Context, msg string, fields ...Field) {
	DefaultLogger().Infow(ctx, msg, fields...)
}

// Warnf 以 [WARN] 前缀、自定义格式打印日志内容并换行。
func Warnf(ctx context.Context, format string, v ...any) {
	DefaultLogger().Warnf(ctx, format, v...)
}

// Warnw 以 [WARN] 前缀、自定义格式打印日志内容并换行。
func Warnw(ctx context.Context, msg string, fields ...Field) {
	DefaultLogger().Warnw(ctx, msg, fields...)
}

// Errorf 以 [ERRO] 前缀、自定义格式打印日志内容并换行。
func Errorf(ctx context.Context, err error, format string, v ...any) {
	DefaultLogger().Errorf(ctx, err, format, v...)
}

// Errorw 以 [ERRO] 前缀、自定义格式打印日志内容并换行。
func Errorw(ctx context.Context, err error, msg string, fields ...Field) {
	DefaultLogger().Errorw(ctx, err, msg, fields...)
}

// Fatalf 以 [FATA] 前缀、自定义格式打印日志内容并换行，随后退出当前进程。
func Fatalf(ctx context.Context, err error, format string, v ...any) {
	DefaultLogger().Fatalf(ctx, err, format, v...)
}

// Fatalw 以 [FATA] 前缀、自定义格式打印日志内容并换行，随后退出当前进程。
func Fatalw(ctx context.Context, err error, msg string, fields ...Field) {
	DefaultLogger().Fatalw(ctx, err, msg, fields...)
}

// Panicf 以 [PANI] 前缀、自定义格式打印日志内容并换行，随后触发 panic。
func Panicf(ctx context.Context, err error, format string, v ...any) {
	DefaultLogger().Panicf(ctx, err, format, v...)
}

// Panicw 以 [PANI] 前缀、自定义格式打印日志内容并换行，随后触发 panic。
func Panicw(ctx context.Context, err error, msg string, fields ...Field) {
	DefaultLogger().Panicw(ctx, err, msg, fields...)
}

// With 返回附加了指定属性的新 logger。
func With(fields ...Field) *Logger {
	return DefaultLogger().With(fields...)
}

// AddHook 为 logger 添加一个 hook。
func AddHook(hook Hook) {
	_ = DefaultLogger().AddHook(hook)
}

// RemoveHook 从 logger 中移除一个 hook。
func RemoveHook(hookName string) {
	DefaultLogger().RemoveHook(hookName)
}

// Close 关闭 logger 及其底层资源。
func Close() error {
	return DefaultLogger().Close()
}

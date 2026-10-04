package mlog

import (
	"context"
	"io"
	"os"
	"slices"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

func (l *Logger) refreshHooks() {
	l.RemoveHook(ctxHookName)
	if len(l.config.CtxKeys) > 0 {
		l.AddHook(&ctxHook{keys: l.config.CtxKeys})
	}
}

func buildZapLogger(config *Config) (*zap.Logger, zap.AtomicLevel, io.Closer, error) {
	encoderCfg := zap.NewProductionEncoderConfig()

	// 时间格式
	if config.TimeFormat != "" {
		encoderCfg.EncodeTime = zapcore.TimeEncoderOfLayout(config.TimeFormat)
	} else {
		encoderCfg.EncodeTime = zapcore.ISO8601TimeEncoder
	}

	// 编码器
	var encoder zapcore.Encoder
	if config.Format == "json" {
		encoder = zapcore.NewJSONEncoder(encoderCfg)
	} else {
		encoder = zapcore.NewConsoleEncoder(encoderCfg)
	}

	// 输出目标
	var fileWriter io.WriteCloser
	var err error
	var maxWriters = 5
	var defaultCallerSkip = 2
	writers := make([]zapcore.WriteSyncer, 0, maxWriters)
	if config.Stdout {
		writers = append(writers, zapcore.AddSync(os.Stdout))
	}
	if config.Filepath != "" {
		fileWriter, err = newFileWriter(config.Filepath, &rotationConfig{
			MaxSize:    config.MaxSize,
			MaxBackups: config.MaxBackups,
			MaxAge:     config.MaxAge,
		})
		if err != nil {
			return nil, zap.AtomicLevel{}, nil, err
		}
		writers = append(writers, zapcore.AddSync(fileWriter))
	}
	if config.Writer != nil {
		writers = append(writers, zapcore.AddSync(config.Writer))
	}

	if len(writers) == 0 {
		writers = append(writers, zapcore.AddSync(os.Stdout))
	}
	writeSyncer := zapcore.NewMultiWriteSyncer(writers...)

	// 级别
	level := zap.NewAtomicLevelAt(zapcore.Level(config.Level))
	// Core
	core := zapcore.NewCore(encoder, writeSyncer, level)
	// Logger 实例
	zapLogger := zap.New(core)

	// 选项
	var opts []zap.Option
	// 服务名称
	if config.ServiceName != "" {
		opts = append(opts, zap.Fields(zap.String("service.name", config.ServiceName)))
	}
	// 调用方信息
	if config.Caller {
		opts = append(opts, zap.AddCaller(), zap.AddCallerSkip(defaultCallerSkip))
	}
	// 开发模式
	if config.Development {
		opts = append(opts, zap.Development())
	}

	return zapLogger.WithOptions(opts...), level, fileWriter, nil
}

func toZapFields(fields []Field) []zap.Field {
	zapFields := make([]zap.Field, len(fields))
	for i, field := range fields {
		zapFields[i] = zap.Field{
			Key:       field.Key,
			Type:      field.Type,
			Integer:   field.Integer,
			String:    field.String,
			Interface: field.Interface,
		}
	}
	return zapFields
}

// log 按给定级别与属性记录日志。
func (l *Logger) log(ctx context.Context, level Level, msg string, fields ...Field) {
	l.mu.RLock()
	defer l.mu.RUnlock()
	if l.parent == nil {
		return
	}

	// 从对象池获取日志条目。
	entry := entryPool.Get().(*Entry)
	entry.ctx = ctx
	entry.msg = msg
	entry.fields = append(entry.fields[:0], fields...)

	// 重置日志条目并放回对象池。
	defer func() {
		entry.reset()
		entryPool.Put(entry)
	}()

	// 触发 hook。
	l.hookMu.RLock()
	hooks := append([]Hook(nil), l.hooks...)
	l.hookMu.RUnlock()
	for _, hook := range hooks {
		if slices.Contains(hook.Levels(), level) {
			hook.Fire(entry)
		}
	}

	zapFields := toZapFields(entry.fields)
	switch level {
	case DebugLevel:
		l.parent.Debug(entry.msg, zapFields...)
	case InfoLevel:
		l.parent.Info(entry.msg, zapFields...)
	case WarnLevel:
		l.parent.Warn(entry.msg, zapFields...)
	case ErrorLevel:
		l.parent.Error(entry.msg, zapFields...)
	case FatalLevel:
		l.parent.Fatal(entry.msg, zapFields...)
	case PanicLevel:
		l.parent.Panic(entry.msg, zapFields...)
	}
}

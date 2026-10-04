package mlog

import (
	"strings"

	"github.com/graingo/maltose/errors/merror"
	"go.uber.org/zap/zapcore"
)

// Level 是日志级别。
type Level int8

const (
	DebugLevel Level = Level(zapcore.DebugLevel)
	InfoLevel  Level = Level(zapcore.InfoLevel)
	WarnLevel  Level = Level(zapcore.WarnLevel)
	ErrorLevel Level = Level(zapcore.ErrorLevel)
	FatalLevel Level = Level(zapcore.FatalLevel)
	PanicLevel Level = Level(zapcore.PanicLevel)
)

func AllLevels() []Level {
	return []Level{
		DebugLevel,
		InfoLevel,
		WarnLevel,
		ErrorLevel,
		FatalLevel,
		PanicLevel,
	}
}

// SetLevel 设置日志级别。
func (l *Logger) SetLevel(level Level) {
	l.mu.RLock()
	defer l.mu.RUnlock()
	l.level.SetLevel(zapcore.Level(level))
}

// GetLevel 返回当前日志级别。
func (l *Logger) GetLevel() Level {
	l.mu.RLock()
	defer l.mu.RUnlock()
	return Level(l.level.Level())
}

// ParseLevel 解析字符串形式的级别并返回对应的 Level 值。
func ParseLevel(level string) (Level, error) {
	switch strings.ToLower(level) {
	case "debug":
		return DebugLevel, nil
	case "info":
		return InfoLevel, nil
	case "warn":
		return WarnLevel, nil
	case "error":
		return ErrorLevel, nil
	case "fatal":
		return FatalLevel, nil
	case "panic":
		return PanicLevel, nil
	default:
		return 0, merror.Newf("invalid log level: %s", level)
	}
}

// String 返回级别的字符串表示。
func (l Level) String() string {
	switch l {
	case DebugLevel:
		return "debug"
	case InfoLevel:
		return "info"
	case WarnLevel:
		return "warn"
	case ErrorLevel:
		return "error"
	case FatalLevel:
		return "fatal"
	case PanicLevel:
		return "panic"
	default:
		return "unknown"
	}
}

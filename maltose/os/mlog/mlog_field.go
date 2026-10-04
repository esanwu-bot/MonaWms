package mlog

import (
	"math"
	"time"

	"go.uber.org/zap/zapcore"
)

// Field 是用于结构化日志的键值对，它是一种类型安全且经过优化的日志字段表示，
// 结构上与主流高性能日志库的内部字段类型保持一致，以实现零开销转换。
type Field struct {
	Key       string
	Type      zapcore.FieldType
	Integer   int64
	String    string
	Interface any
}

// Fields 是 Field 的切片类型。
type Fields []Field

// Any 接收一个键与任意值，并选择最合适的方式将其表示为字段。
func Any(key string, value any) Field {
	// 在真实的高性能场景中，可以像 zap 那样在此处为常见类型补充类型分支，
	// 以避免反射开销。就当前这层封装而言，
	// 依赖 zapcore.ReflectType 是较好的折中方案。
	return Field{Key: key, Type: zapcore.ReflectType, Interface: value}
}

// Bool 构造布尔类型字段。
func Bool(key string, val bool) Field {
	var intVal int64
	if val {
		intVal = 1
	}
	return Field{Key: key, Type: zapcore.BoolType, Integer: intVal}
}

// Err 构造 error 类型字段。若 error 为 nil，
// 则返回一个会被 logger 忽略的空操作字段。
func Err(err error) Field {
	if err == nil {
		return Skip()
	}
	return Field{Key: "error", Type: zapcore.ErrorType, Interface: err}
}

// Duration 构造 time.Duration 类型字段。
func Duration(key string, val time.Duration) Field {
	return Field{Key: key, Type: zapcore.DurationType, Integer: int64(val)}
}

// Float64 构造 float64 类型字段。
func Float64(key string, val float64) Field {
	return Field{Key: key, Type: zapcore.Float64Type, Integer: int64(math.Float64bits(val))}
}

// Int 构造 int 类型字段。
func Int(key string, val int) Field {
	return Field{Key: key, Type: zapcore.Int64Type, Integer: int64(val)}
}

// Int64 构造 int64 类型字段。
func Int64(key string, val int64) Field {
	return Field{Key: key, Type: zapcore.Int64Type, Integer: val}
}

// String 构造 string 类型字段。
func String(key string, val string) Field {
	return Field{Key: key, Type: zapcore.StringType, String: val}
}

// Time 构造 time.Time 类型字段，
// 其格式为自 Unix 纪元起的浮点秒数。
func Time(key string, val time.Time) Field {
	return Field{Key: key, Type: zapcore.TimeType, Integer: val.UnixNano(), Interface: val.Location()}
}

// Uint 构造无符号整型字段。
func Uint(key string, val uint) Field {
	return Field{Key: key, Type: zapcore.Uint64Type, Integer: int64(val)}
}

// Uint64 构造 uint64 类型字段。
func Uint64(key string, val uint64) Field {
	return Field{Key: key, Type: zapcore.Uint64Type, Integer: int64(val)}
}

// Skip 构造一个会被 logger 忽略的空操作字段。
func Skip() Field {
	return Field{Type: zapcore.SkipType}
}

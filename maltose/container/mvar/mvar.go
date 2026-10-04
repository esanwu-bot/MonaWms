package mvar

import (
	"encoding/json"
	"sync"
	"time"

	"github.com/graingo/mconv"
)

// Var 是通用变量类型的实现。
type Var struct {
	value any  // 底层值。
	safe  bool // 是否开启线程安全，默认 false。
	mu    sync.RWMutex
}

// New 创建并返回一个新的 Var。
// safe 参数用于指定是否开启线程安全，默认 false。
func New(value any, safe ...bool) *Var {
	if len(safe) > 0 && safe[0] {
		return &Var{
			value: value,
			safe:  true,
			mu:    sync.RWMutex{},
		}
	}
	return &Var{
		value: value,
	}
}

// Val 返回原始值。
func (v *Var) Val() any {
	if v == nil {
		return nil
	}
	if v.safe {
		v.mu.RLock()
		defer v.mu.RUnlock()
	}
	return v.value
}

// Interface 是 Val 的别名。
func (v *Var) Interface() any {
	return v.Val()
}

// String 将值转换为 string。
func (v *Var) String() string {
	if v == nil {
		return ""
	}
	return mconv.ToString(v.Val())
}

// Bool 将值转换为 bool。
func (v *Var) Bool() bool {
	if v == nil {
		return false
	}
	return mconv.ToBool(v.Val())
}

// Int 将值转换为 int。
func (v *Var) Int() int {
	return int(v.Int64())
}

// Int64 将值转换为 int64。
func (v *Var) Int64() int64 {
	if v == nil {
		return 0
	}
	return mconv.ToInt64(v.Val())
}

// Uint64 将值转换为 uint64。
func (v *Var) Uint64() uint64 {
	if v == nil {
		return 0
	}
	return mconv.ToUint64(v.Val())
}

// Float64 将值转换为 float64。
func (v *Var) Float64() float64 {
	if v == nil {
		return 0
	}
	return mconv.ToFloat64(v.Val())
}

// Time 将值转换为 time.Time。
// format 参数用于指定时间字符串的格式。
func (v *Var) Time(format ...string) time.Time {
	if v == nil {
		return time.Time{}
	}
	return mconv.ToTime(v.Val(), format...)
}

// Struct 将值映射到结构体。
// pointer 参数应为结构体指针。
// hooks 参数用于指定转换过程中的钩子函数。
func (v *Var) Struct(pointer any, hooks ...mconv.HookFunc) error {
	if v == nil {
		return nil
	}
	return mconv.ToStructE(v.Val(), pointer, hooks...)
}

// MarshalJSON 实现 json.Marshaler 接口。
func (v *Var) MarshalJSON() ([]byte, error) {
	return json.Marshal(v.Val())
}

// UnmarshalJSON 实现 json.Unmarshaler 接口。
func (v *Var) UnmarshalJSON(b []byte) error {
	var i any
	err := json.Unmarshal(b, &i)
	if err != nil {
		return err
	}
	v.Set(i)
	return nil
}

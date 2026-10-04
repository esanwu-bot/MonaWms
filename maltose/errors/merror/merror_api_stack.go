package merror

import (
	"errors"
	"runtime"
)

// stack 表示程序计数器组成的调用栈。
type stack []uintptr

const (
	// maxStackDepth 表示调用栈的最大深度。
	maxStackDepth = 64
)

// Cause 返回 `err` 的根因错误。
func Cause(err error) error {
	if err == nil {
		return nil
	}
	if e, ok := err.(ICause); ok {
		return e.Cause()
	}
	if e, ok := err.(IUnwrap); ok {
		return Cause(e.Unwrap())
	}
	return err
}

// Stack 返回调用栈信息的字符串。
// 若 `err` 不支持调用栈，则直接返回错误字符串。
func Stack(err error) string {
	if err == nil {
		return ""
	}
	if e, ok := err.(IStack); ok {
		return e.Stack()
	}
	return err.Error()
}

// Current 创建并返回当前层的错误。
// 若当前层错误为 nil，则返回 nil。
func Current(err error) error {
	if err == nil {
		return nil
	}
	if e, ok := err.(ICurrent); ok {
		return e.Current()
	}
	return err
}

// Unwrap 返回下一层的错误。
// 若当前层或下一层的错误为 nil，则返回 nil。
func Unwrap(err error) error {
	if err == nil {
		return nil
	}
	if e, ok := err.(IUnwrap); ok {
		return e.Unwrap()
	}
	return nil
}

// HasStack 检查并报告 `err` 是否实现了 `gerror.IStack` 接口。
func HasStack(err error) bool {
	_, ok := err.(IStack)
	return ok
}

// Equal 报告 `err` 是否与 `target` 相等。
// 注意：在 `Error` 的默认比较逻辑中，
// 若两个错误的 `code` 与 `text` 相同，则认为它们相同。
func Equal(err, target error) bool {
	if err == nil || target == nil {
		return err == nil && target == nil
	}
	if e, ok := err.(IEqual); ok {
		return e.Equal(target)
	}
	if e, ok := target.(IEqual); ok {
		return e.Equal(err)
	}
	return false
}

// Is 报告 `err` 是否存在于错误链中。
// 另有类似函数 `HasError`，它设计实现于 Go 标准库提供 `errors.Is` 之前。
// 现在它是标准库 `errors.Is` 的别名，以保证与标准库一致的性能。
func Is(err, target error) bool {
	return errors.Is(err, target)
}

// As 在错误链中查找第一个匹配 `target` 的错误。
// 若找到，则将 `target` 设为该错误值并返回 true。
//
// 错误链由 `err` 自身，以及反复调用 `Unwrap` 得到的错误序列组成。
//
// 若错误的具体值可赋值给 `target` 所指向的值，或该错误拥有 `As(interface{}) bool`
// 方法且 `As(target)` 返回 true，则认为该错误匹配 target；后一种情况下
// 由 As 方法负责设置 target。
//
// 若 target 不是实现了 error 接口的类型指针或接口类型，As 会 panic。
// 若 err 为 nil，As 返回 false。
func As(err error, target any) bool {
	return errors.As(err, target)
}

// callers 返回调用栈信息。
// 注意：这里只获取调用方的内存地址数组，而非调用方信息。
func callers(skip ...int) stack {
	var (
		pcs [maxStackDepth]uintptr
		n   = 3
	)
	if len(skip) > 0 {
		n += skip[0]
	}
	return pcs[:runtime.Callers(n, pcs[:])]
}

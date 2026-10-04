package merror

import (
	"errors"
	"fmt"

	"github.com/graingo/maltose/errors/mcode"
)

// Error 是错误的内部结构。
type Error struct {
	error error
	text  string
	code  mcode.Code
	stack stack
}

// Error 实现 error 接口，返回完整的错误信息。
func (err *Error) Error() string {
	if err == nil {
		return ""
	}
	errStr := err.text
	if errStr == "" && err.code != nil {
		errStr = err.code.Message()
	}
	if err.error != nil {
		if errStr != "" {
			errStr += ": "
		}
		errStr += err.error.Error()
	}
	return errStr
}

// Cause 返回根因错误。
func (err *Error) Cause() error {
	if err == nil {
		return nil
	}
	loop := err
	for loop != nil {
		if loop.error != nil {
			if e, ok := loop.error.(*Error); ok {
				// 内部 Error 结构。
				loop = e
			} else if e, ok := loop.error.(ICause); ok {
				// 其他实现了 ApiCause 接口的 Error。
				return e.Cause()
			} else {
				return loop.error
			}
		} else {
			// 返回 loop
							//
							// 为兼容 https://github.com/pkg/errors 中的 Case 行为。
			return errors.New(loop.text)
		}
	}
	return nil
}

// Current 创建并返回当前层的错误。
// 若当前错误为 nil，则返回 nil。
func (err *Error) Current() error {
	if err == nil {
		return nil
	}
	return &Error{
		error: nil,
		stack: err.stack,
		text:  err.text,
		code:  err.code,
	}
}

// Unwrap 是 `Next` 的别名函数。
// 仅为在 Go 1.17 之后实现标准库 errors.Unwrap 接口而存在。
func (err *Error) Unwrap() error {
	if err == nil {
		return nil
	}
	return err.error
}

// Equal 比较两个错误是否相等。
// 注意：默认的比较逻辑中，只有两个错误的 `code` 与 `text` 都相同时才认为相等。
func (err *Error) Equal(target error) bool {
	if err == nil || target == nil {
		return err == nil && target == nil
	}
	// 错误码必须相同。
	// 注意：若两个错误的错误码都为 nil，同样视为相等。
	if !equalCode(err.code, Code(target)) {
		return false
	}
	// 错误信息必须相同。
	if err.text != fmt.Sprintf(`%-s`, target) {
		return false
	}
	return true
}

func equalCode(left, right mcode.Code) bool {
	if left == nil || right == nil {
		return left == nil && right == nil
	}
	return left.Code() == right.Code()
}

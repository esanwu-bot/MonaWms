package merror

import (
	"fmt"
	"strings"

	"github.com/graingo/maltose/errors/mcode"
)

// NewCode 创建带指定错误码的新错误。
// 示例：err := merror.NewCode(mcode.ValidationError)
func NewCode(code mcode.Code, text ...string) error {
	return &Error{
		stack: callers(),
		text:  strings.Join(text, commaSeparatorSpace),
		code:  code,
	}
}

// NewCodef 创建带指定错误码的新错误。
// 示例：err := merror.NewCodef(mcode.ValidationError, "username %s cannot be empty", admin)
func NewCodef(code mcode.Code, format string, args ...any) error {
	return &Error{
		stack: callers(),
		text:  fmt.Sprintf(format, args...),
		code:  code,
	}
}

// WrapCode 包装一个错误并附加指定错误码。
// 示例：err := merror.WrapCode(err, mcode.ValidationError)
func WrapCode(err error, code mcode.Code, text ...string) error {
	if err == nil {
		return nil
	}
	return &Error{
		error: err,
		stack: callers(),
		text:  strings.Join(text, commaSeparatorSpace),
		code:  code,
	}
}

// WrapCodef 包装一个错误，并附加指定错误码与格式化文本。
// 示例：err := merror.WrapCodef(err, mcode.ValidationError, "username %s cannot be empty", admin)
func WrapCodef(err error, code mcode.Code, format string, args ...any) error {
	if err == nil {
		return nil
	}
	return &Error{
		error: err,
		stack: callers(),
		text:  fmt.Sprintf(format, args...),
		code:  code,
	}
}

// Code 获取错误的错误码。
// 若错误没有错误码，且未实现 ICode 接口，则返回 CodeNil。
func Code(err error) mcode.Code {
	if err == nil {
		return mcode.CodeNil
	}
	if e, ok := err.(ICode); ok {
		return e.Code()
	}
	if e, ok := err.(IUnwrap); ok {
		return Code(e.Unwrap())
	}
	return mcode.CodeNil
}

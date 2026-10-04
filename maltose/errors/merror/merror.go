package merror

import "github.com/graingo/maltose/errors/mcode"

// IEqual 定义比较两个错误是否相等的接口。
type IEqual interface {
	Error() string
	Equal(target error) bool
}

// ICode 定义错误码相关能力的接口。
type ICode interface {
	Error() string
	Code() mcode.Code
}

// IStack 定义调用栈相关能力的接口。
type IStack interface {
	Error() string
	Stack() string
}

// ICause 定义根因相关能力的接口。
type ICause interface {
	Error() string
	Cause() error
}

// ICurrent 定义获取当前层错误的接口。
type ICurrent interface {
	Error() string
	Current() error
}

// IUnwrap 定义解包下一层错误的接口。
type IUnwrap interface {
	Error() string
	Unwrap() error
}

const (
	commaSeparatorSpace = ", "
)

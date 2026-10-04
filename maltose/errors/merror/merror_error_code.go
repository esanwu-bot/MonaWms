package merror

import (
	"github.com/graingo/maltose/errors/mcode"
)

// Code 返回错误码。
// 若错误自身未设置错误码，则返回 `Unwrap` 方法所返回错误的错误码。
func (err *Error) Code() mcode.Code {
	if err == nil {
		return mcode.CodeNil
	}
	if err.code == mcode.CodeNil {
		return Code(err.Unwrap())
	}
	return err.code
}

// SetCode 设置错误码。
func (err *Error) SetCode(code mcode.Code) {
	if err == nil {
		return
	}
	err.code = code
}

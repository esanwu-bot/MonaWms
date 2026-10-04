package merror

import (
	"fmt"
	"io"
)

// Format 实现 fmt.Formatter 接口，可对错误信息进行格式化。
//
// 格式化占位符：
//
//	%s：错误信息
//	+v：错误信息与调用栈信息
func (err *Error) Format(s fmt.State, verb rune) {
	switch verb {
	case 's', 'v':
		switch {
		case s.Flag('-'):
			_, _ = io.WriteString(s, err.Error())
		case s.Flag('+'):
			if verb == 's' {
				_, _ = io.WriteString(s, err.Stack())
			} else {
				_, _ = io.WriteString(s, err.Error()+"\n"+err.Stack())
			}
		default:
			_, _ = io.WriteString(s, err.Error())
		}
	}
}

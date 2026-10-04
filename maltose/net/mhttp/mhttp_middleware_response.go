package mhttp

import (
	"net/http"

	"github.com/graingo/maltose/errors/mcode"
	"github.com/graingo/maltose/errors/merror"
)

// DefaultResponse 标准响应结构
type DefaultResponse struct {
	Code    int    `json:"code"`    // 业务状态码
	Message string `json:"message"` // 提示信息
	Data    any    `json:"data"`    // 业务数据
}

func codeToHTTPStatus(code mcode.Code) int {
	switch code {
	case mcode.CodeOK:
		return http.StatusOK
	case mcode.CodeValidationFailed:
		return http.StatusBadRequest
	case mcode.CodeNotFound:
		return http.StatusNotFound
	case mcode.CodeNotAuthorized:
		return http.StatusUnauthorized
	case mcode.CodeForbidden:
		return http.StatusForbidden
	default:
		return http.StatusInternalServerError
	}
}

// MiddlewareResponse 标准响应中间件
func MiddlewareResponse() MiddlewareFunc {
	return func(r *Request) {
		r.Next()

		// 若响应已写入，则跳过
		if r.Writer.Written() {
			return
		}

		var (
			msg  string
			code mcode.Code = mcode.CodeOK
			data            = r.GetHandlerResponse()
		)

		// 处理错误场景
		if len(r.Errors) > 0 {
			err := r.Errors.Last().Err
			// 获取错误码
			code = merror.Code(err)
			if code == mcode.CodeNil {
				code = mcode.CodeInternalError
			}
			msg = err.Error()
			data = nil
		} else {
			msg = code.Message()
		}

		// 返回标准响应
		httpStatus := codeToHTTPStatus(code)
		r.JSON(httpStatus, DefaultResponse{
			Code:    code.Code(),
			Message: msg,
			Data:    data,
		})
	}
}

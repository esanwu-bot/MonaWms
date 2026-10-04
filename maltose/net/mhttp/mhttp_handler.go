package mhttp

import (
	"context"
	"reflect"
	"strings"

	"github.com/go-playground/validator/v10"
	"github.com/graingo/maltose/errors/mcode"
	"github.com/graingo/maltose/errors/merror"
)

// HandlerFunc 定义基础的处理函数类型。
type HandlerFunc func(*Request)

// handleValidationErrors 处理参数校验错误。
func handleValidationErrors(r *Request, err error) error {
	if validationErrors, ok := err.(validator.ValidationErrors); ok {
		var errMsgs []string
		trans := r.GetTranslator()
		for _, e := range validationErrors.Translate(trans) {
			errMsgs = append(errMsgs, e)
		}
		if len(errMsgs) > 0 {
			return merror.NewCode(mcode.CodeValidationFailed, strings.Join(errMsgs, "; "))
		}
	}
	return err
}

// handleRequest 处理请求并返回结果。
func handleRequest(r *Request, method reflect.Method, val reflect.Value, req interface{}) error {
	// 从 URI 绑定参数。这里的错误可以忽略，
	// 因为并非所有请求都带 URI 参数。请求体、查询参数等的
	// 主要校验由下面的 ShouldBind 处理。
	_ = r.ShouldBindUri(req)

	// 从 query、form、body 等绑定参数
	if err := r.ShouldBind(req); err != nil {
		return handleValidationErrors(r, err)
	}

	// 调用方法
	results := method.Func.Call([]reflect.Value{
		val,
		reflect.ValueOf(r.Request.Context()),
		reflect.ValueOf(req),
	})

	// 处理返回值
	if !results[1].IsNil() {
		return results[1].Interface().(error)
	}

	// 将响应写入 Request，供中间件使用
	response := results[0].Interface()
	r.SetHandlerResponse(response)

	return nil
}

// checkMethodSignature 校验方法签名。
func checkMethodSignature(typ reflect.Type) error {
	// 检查参数个数与返回值个数
	if typ.NumIn() != 3 || typ.NumOut() != 2 {
		return merror.New("invalid method signature, required: func(*Controller) (context.Context, *XxxReq) (*XxxRes, error)")
	}

	// 检查第二个参数是否为 context.Context
	if !typ.In(1).Implements(reflect.TypeOf((*context.Context)(nil)).Elem()) {
		return merror.New("first parameter should be context.Context")
	}

	// 检查第三个参数是否为请求参数
	reqType := typ.In(2)
	if reqType.Kind() != reflect.Pointer {
		return merror.New("request parameter should be pointer type")
	}
	if !strings.HasSuffix(reqType.Elem().Name(), "Req") {
		return merror.New("request parameter should end with 'Req'")
	}

	// 检查第一个返回值是否为响应参数
	resType := typ.Out(0)
	if resType.Kind() != reflect.Pointer {
		return merror.New("response parameter should be pointer type")
	}
	if !strings.HasSuffix(resType.Elem().Name(), "Res") {
		return merror.New("response parameter should end with 'Res'")
	}

	// 检查第二个返回值是否为 error
	if !typ.Out(1).Implements(reflect.TypeOf((*error)(nil)).Elem()) {
		return merror.New("second return value should be error")
	}

	return nil
}

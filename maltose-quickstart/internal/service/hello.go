// =================================================================================
// 代码由 Maltose 工具生成并维护，可按需自行修改。
// =================================================================================
package service

import (
	"context"

	"github.com/graingo/maltose-quickstart/internal/model"
)

type IHello interface {
	// Hello 根据传入的姓名生成问候语。
	Hello(ctx context.Context, req *model.HelloInput) (res *model.HelloOutput, err error)
}

var localHello IHello

// Hello 返回已注册的 IHello 实现。
func Hello() IHello {
	if localHello == nil {
		panic("implement not found for interface IHello, forgot register?")
	}
	return localHello
}

// RegisterHello 注册 IHello 的实现。
func RegisterHello(i IHello) {
	localHello = i
}

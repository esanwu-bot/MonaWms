// =================================================================================
// 代码由 Maltose 工具生成并维护，可按需自行修改。
// =================================================================================
package hello

import (
	"context"

	"github.com/graingo/maltose-quickstart/internal/model"
	"github.com/graingo/maltose-quickstart/internal/service"
)

func init() {
	service.RegisterHello(New())
}

type sHello struct{}

// New 创建一个新的 service logic 实现。
func New() service.IHello {
	return &sHello{}
}

func (s *sHello) Hello(_ context.Context, input *model.HelloInput) (output *model.HelloOutput, err error) {
	return &model.HelloOutput{Greeting: "Hello, " + input.Name + "!"}, nil
}

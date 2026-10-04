// =================================================================================
// 代码由 Maltose 工具生成并维护，可按需自行修改。
// =================================================================================
package hello

import (
	"context"

	"github.com/graingo/maltose-quickstart/api/hello/v1"
	"github.com/graingo/maltose-quickstart/internal/model"
	"github.com/graingo/maltose-quickstart/internal/service"
)

// Hello 是 Hello 接口的处理函数。
func (c *HelloV1) Hello(ctx context.Context, req *v1.HelloReq) (res *v1.HelloRes, err error) {
	output, err := service.Hello().Hello(ctx, &model.HelloInput{Name: req.Name})
	if err != nil {
		return nil, err
	}
	return &v1.HelloRes{Name: output.Greeting}, nil
}

// Bye 是 Bye 接口的处理函数。
func (c *HelloV1) Bye(_ context.Context, req *v1.ByeReq) (res *v1.ByeRes, err error) {
	return &v1.ByeRes{Name: "Goodbye, " + req.Name + "!"}, nil
}

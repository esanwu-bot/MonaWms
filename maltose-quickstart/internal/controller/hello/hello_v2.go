// =================================================================================
// 代码由 Maltose 工具生成并维护，可按需自行修改。
// =================================================================================
package hello

import (
	"context"

	"github.com/graingo/maltose-quickstart/api/hello/v2"
)

// Bye 是 Bye 接口的处理函数。
func (c *HelloV2) Bye(_ context.Context, req *v2.ByeReq) (res *v2.ByeRes, err error) {
	return &v2.ByeRes{Name: "See you again, " + req.Name + "!"}, nil
}

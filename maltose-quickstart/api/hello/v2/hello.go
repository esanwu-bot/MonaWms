package v2

import "github.com/graingo/maltose/frame/m"

// ByeReq 是 v2 版本 bye 接口的入参。
type ByeReq struct {
	m.Meta `method:"POST" path:"/bye" summary:"告别示例 V2" tag:"公共服务"`
	Name   string `json:"name" dc:"姓名" binding:"required"`
}

// ByeRes 是 v2 版本 bye 接口返回的消息。
type ByeRes struct {
	Name string `json:"name" dc:"姓名"`
}

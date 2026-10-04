package v1

import "github.com/graingo/maltose/frame/m"

// HelloReq 是 hello 接口的入参。
type HelloReq struct {
	m.Meta `method:"GET" path:"/hello" summary:"问候示例" tag:"公共服务"`
	Name   string `form:"name" dc:"姓名" binding:"required"`
}

// HelloRes 是 hello 接口返回的问候语。
type HelloRes struct {
	Name string `json:"name" dc:"姓名"`
}

// ByeReq 是 bye 接口的入参。
type ByeReq struct {
	m.Meta `method:"POST" path:"/bye" summary:"告别示例" tag:"公共服务"`
	Name   string `json:"name" dc:"姓名" binding:"required"`
}

// ByeRes 是 bye 接口返回的消息。
type ByeRes struct {
	Name string `json:"name" dc:"姓名"`
}

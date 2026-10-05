package v1

import "github.com/graingo/maltose/frame/m"

// SupplierItem 是供应商的对外响应结构。
type SupplierItem struct {
	Id            int    `json:"id"`
	Code          string `json:"code"`
	Name          string `json:"name"`
	ContactPerson string `json:"contact_person,omitempty"`
	Phone         string `json:"phone,omitempty"`
	Email         string `json:"email,omitempty"`
	Address       string `json:"address,omitempty"`
	Status        string `json:"status"`
	StatusText    string `json:"status_text"`
	CreatedAt     string `json:"created_at,omitempty"`
	UpdatedAt     string `json:"updated_at,omitempty"`
}

// SupplierListReq 是供应商列表接口的入参。
type SupplierListReq struct {
	m.Meta        `method:"GET" path:"/suppliers" summary:"供应商列表" tag:"往来单位"`
	Page          int    `form:"page" json:"page" dc:"页码"`
	Limit         int    `form:"limit" json:"limit" dc:"每页条数"`
	Name          string `form:"name" json:"name" dc:"名称模糊匹配"`
	Code          string `form:"code" json:"code" dc:"编码模糊匹配"`
	ContactPerson string `form:"contact_person" json:"contact_person" dc:"联系人模糊匹配"`
	Status        string `form:"status" json:"status" dc:"状态过滤"`
}

// SupplierListRes 是供应商列表接口返回的数据。
type SupplierListRes struct {
	List       []SupplierItem `json:"list"`
	Pagination Pagination     `json:"pagination"`
}

// SupplierDetailReq 是供应商详情接口的入参。
type SupplierDetailReq struct {
	m.Meta `method:"GET" path:"/suppliers/:id" summary:"供应商详情" tag:"往来单位"`
	Id     int `uri:"id" dc:"供应商ID"`
}

// SupplierDetailRes 是供应商详情接口返回的数据。
type SupplierDetailRes struct {
	SupplierItem
}

// SupplierOptionsReq 是供应商选项接口的入参。
type SupplierOptionsReq struct {
	m.Meta `method:"GET" path:"/suppliers/options" summary:"供应商选项" tag:"往来单位"`
}

// SupplierOptionsRes 是供应商选项接口返回的数据。
type SupplierOptionsRes []OptionItem

// SupplierCreateReq 是创建供应商的入参。
type SupplierCreateReq struct {
	m.Meta        `method:"POST" path:"/suppliers" summary:"创建供应商" tag:"往来单位"`
	Code          string `json:"code" dc:"供应商编码" binding:"required,max=50"`
	Name          string `json:"name" dc:"供应商名称" binding:"required,max=100"`
	ContactPerson string `json:"contact_person" dc:"联系人" binding:"required,max=50"`
	Phone         string `json:"phone" dc:"联系电话" binding:"required,max=20"`
	Email         string `json:"email" dc:"邮箱"`
	Address       string `json:"address" dc:"地址"`
	Status        string `json:"status" dc:"状态 active/inactive"`
}

// SupplierCreateRes 是创建供应商返回的数据。
type SupplierCreateRes struct {
	SupplierItem
}

// SupplierUpdateReq 是更新供应商的入参。未提供（零值）的字段保持不变。
type SupplierUpdateReq struct {
	m.Meta        `method:"PUT" path:"/suppliers/:id" summary:"更新供应商" tag:"往来单位"`
	Id            int    `uri:"id" dc:"供应商ID"`
	Code          string `json:"code" dc:"供应商编码"`
	Name          string `json:"name" dc:"供应商名称"`
	ContactPerson string `json:"contact_person" dc:"联系人"`
	Phone         string `json:"phone" dc:"联系电话"`
	Email         string `json:"email" dc:"邮箱"`
	Address       string `json:"address" dc:"地址"`
	Status        string `json:"status" dc:"状态"`
}

// SupplierUpdateRes 是更新供应商返回的数据。
type SupplierUpdateRes struct {
	SupplierItem
}

// SupplierDeleteReq 是删除供应商的入参。
type SupplierDeleteReq struct {
	m.Meta `method:"DELETE" path:"/suppliers/:id" summary:"删除供应商" tag:"往来单位"`
	Id     int `uri:"id" dc:"供应商ID"`
}

// SupplierDeleteRes 是删除供应商返回的数据。
type SupplierDeleteRes struct{}

// CustomerItem 是客户的对外响应结构。
type CustomerItem struct {
	Id            int    `json:"id"`
	Code          string `json:"code"`
	Name          string `json:"name"`
	ContactPerson string `json:"contact_person,omitempty"`
	Phone         string `json:"phone,omitempty"`
	Email         string `json:"email,omitempty"`
	Address       string `json:"address,omitempty"`
	Status        string `json:"status"`
	StatusText    string `json:"status_text"`
	CreatedAt     string `json:"created_at,omitempty"`
	UpdatedAt     string `json:"updated_at,omitempty"`
}

// CustomerListReq 是客户列表接口的入参。
type CustomerListReq struct {
	m.Meta        `method:"GET" path:"/customers" summary:"客户列表" tag:"往来单位"`
	Page          int    `form:"page" json:"page" dc:"页码"`
	Limit         int    `form:"limit" json:"limit" dc:"每页条数"`
	Name          string `form:"name" json:"name" dc:"名称模糊匹配"`
	Code          string `form:"code" json:"code" dc:"编码模糊匹配"`
	ContactPerson string `form:"contact_person" json:"contact_person" dc:"联系人模糊匹配"`
	Status        string `form:"status" json:"status" dc:"状态过滤"`
}

// CustomerListRes 是客户列表接口返回的数据。
type CustomerListRes struct {
	List       []CustomerItem `json:"list"`
	Pagination Pagination     `json:"pagination"`
}

// CustomerDetailReq 是客户详情接口的入参。
type CustomerDetailReq struct {
	m.Meta `method:"GET" path:"/customers/:id" summary:"客户详情" tag:"往来单位"`
	Id     int `uri:"id" dc:"客户ID"`
}

// CustomerDetailRes 是客户详情接口返回的数据。
type CustomerDetailRes struct {
	CustomerItem
}

// CustomerOptionsReq 是客户选项接口的入参。
type CustomerOptionsReq struct {
	m.Meta `method:"GET" path:"/customers/options" summary:"客户选项" tag:"往来单位"`
}

// CustomerOptionsRes 是客户选项接口返回的数据。
type CustomerOptionsRes []OptionItem

// CustomerCreateReq 是创建客户的入参。
type CustomerCreateReq struct {
	m.Meta        `method:"POST" path:"/customers" summary:"创建客户" tag:"往来单位"`
	Code          string `json:"code" dc:"客户编码" binding:"required,max=50"`
	Name          string `json:"name" dc:"客户名称" binding:"required,max=100"`
	ContactPerson string `json:"contact_person" dc:"联系人" binding:"required,max=50"`
	Phone         string `json:"phone" dc:"联系电话" binding:"required,max=20"`
	Email         string `json:"email" dc:"邮箱"`
	Address       string `json:"address" dc:"地址"`
	Status        string `json:"status" dc:"状态 active/inactive"`
}

// CustomerCreateRes 是创建客户返回的数据。
type CustomerCreateRes struct {
	CustomerItem
}

// CustomerUpdateReq 是更新客户的入参。未提供（零值）的字段保持不变。
type CustomerUpdateReq struct {
	m.Meta        `method:"PUT" path:"/customers/:id" summary:"更新客户" tag:"往来单位"`
	Id            int    `uri:"id" dc:"客户ID"`
	Code          string `json:"code" dc:"客户编码"`
	Name          string `json:"name" dc:"客户名称"`
	ContactPerson string `json:"contact_person" dc:"联系人"`
	Phone         string `json:"phone" dc:"联系电话"`
	Email         string `json:"email" dc:"邮箱"`
	Address       string `json:"address" dc:"地址"`
	Status        string `json:"status" dc:"状态"`
}

// CustomerUpdateRes 是更新客户返回的数据。
type CustomerUpdateRes struct {
	CustomerItem
}

// CustomerDeleteReq 是删除客户的入参。
type CustomerDeleteReq struct {
	m.Meta `method:"DELETE" path:"/customers/:id" summary:"删除客户" tag:"往来单位"`
	Id     int `uri:"id" dc:"客户ID"`
}

// CustomerDeleteRes 是删除客户返回的数据。
type CustomerDeleteRes struct{}

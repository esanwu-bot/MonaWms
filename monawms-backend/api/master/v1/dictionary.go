package v1

import "github.com/graingo/maltose/frame/m"

// DictionaryTypeItem 是数据字典类型的对外响应结构。
type DictionaryTypeItem struct {
	Id          int    `json:"id"`
	Code        string `json:"code"`
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
	Status      string `json:"status"`
	CreatedAt   string `json:"created_at,omitempty"`
	UpdatedAt   string `json:"updated_at,omitempty"`
}

// DictionaryItemItem 是数据字典项的对外响应结构。
type DictionaryItemItem struct {
	Id        int    `json:"id"`
	TypeId    int    `json:"type_id"`
	TypeCode  string `json:"type_code,omitempty"`
	TypeName  string `json:"type_name,omitempty"`
	Code      string `json:"code"`
	Name      string `json:"name"`
	Value     string `json:"value,omitempty"`
	SortOrder int    `json:"sort_order"`
	Status    string `json:"status"`
	CreatedAt string `json:"created_at,omitempty"`
	UpdatedAt string `json:"updated_at,omitempty"`
}

// DictionaryTypeListReq 是字典类型列表接口的入参。
type DictionaryTypeListReq struct {
	m.Meta `method:"GET" path:"/dictionary/types" summary:"字典类型列表" tag:"数据字典"`
	Status string `form:"status" json:"status" dc:"状态过滤"`
}

// DictionaryTypeListRes 是字典类型列表接口返回的数据。
type DictionaryTypeListRes []DictionaryTypeItem

// DictionaryTypeDetailReq 是字典类型详情接口的入参。
type DictionaryTypeDetailReq struct {
	m.Meta `method:"GET" path:"/dictionary/types/:id" summary:"字典类型详情" tag:"数据字典"`
	Id     int `uri:"id" dc:"类型ID"`
}

// DictionaryTypeDetailRes 是字典类型详情接口返回的数据。
type DictionaryTypeDetailRes struct {
	DictionaryTypeItem
}

// DictionaryTypeCreateReq 是创建字典类型的入参。
type DictionaryTypeCreateReq struct {
	m.Meta      `method:"POST" path:"/dictionary/types" summary:"创建字典类型" tag:"数据字典"`
	Code        string `json:"code" dc:"类型编码" binding:"required,max=50"`
	Name        string `json:"name" dc:"类型名称" binding:"required,max=100"`
	Description string `json:"description" dc:"描述"`
	Status      string `json:"status" dc:"状态 active/inactive"`
}

// DictionaryTypeCreateRes 是创建字典类型返回的数据。
type DictionaryTypeCreateRes struct {
	DictionaryTypeItem
}

// DictionaryTypeUpdateReq 是更新字典类型的入参。未提供（零值）的字段保持不变。
type DictionaryTypeUpdateReq struct {
	m.Meta      `method:"PUT" path:"/dictionary/types/:id" summary:"更新字典类型" tag:"数据字典"`
	Id          int    `uri:"id" dc:"类型ID"`
	Code        string `json:"code" dc:"类型编码"`
	Name        string `json:"name" dc:"类型名称"`
	Description string `json:"description" dc:"描述"`
	Status      string `json:"status" dc:"状态"`
}

// DictionaryTypeUpdateRes 是更新字典类型返回的数据。
type DictionaryTypeUpdateRes struct {
	DictionaryTypeItem
}

// DictionaryTypeDeleteReq 是删除字典类型的入参。
type DictionaryTypeDeleteReq struct {
	m.Meta `method:"DELETE" path:"/dictionary/types/:id" summary:"删除字典类型" tag:"数据字典"`
	Id     int `uri:"id" dc:"类型ID"`
}

// DictionaryTypeDeleteRes 是删除字典类型返回的数据。
type DictionaryTypeDeleteRes struct{}

// DictionaryItemByTypeReq 是按类型ID查询字典项的入参。
type DictionaryItemByTypeReq struct {
	m.Meta `method:"GET" path:"/dictionary/items/:typeId" summary:"按类型查询字典项" tag:"数据字典"`
	TypeId int    `uri:"typeId" dc:"字典类型ID"`
	Status string `form:"status" json:"status" dc:"状态过滤"`
}

// DictionaryItemByCodeReq 是按类型编码查询字典项的入参。
type DictionaryItemByCodeReq struct {
	m.Meta   `method:"GET" path:"/dictionary/items/type/:typeCode" summary:"按类型编码查询字典项" tag:"数据字典"`
	TypeCode string `uri:"typeCode" dc:"字典类型编码"`
	Status   string `form:"status" json:"status" dc:"状态过滤"`
}

// DictionaryItemListRes 是字典项列表接口返回的数据。
type DictionaryItemListRes []DictionaryItemItem

// DictionaryItemDetailReq 是字典项详情接口的入参。
type DictionaryItemDetailReq struct {
	m.Meta `method:"GET" path:"/dictionary/items/detail/:id" summary:"字典项详情" tag:"数据字典"`
	Id     int `uri:"id" dc:"字典项ID"`
}

// DictionaryItemDetailRes 是字典项详情接口返回的数据。
type DictionaryItemDetailRes struct {
	DictionaryItemItem
}

// DictionaryItemCreateReq 是创建字典项的入参。
type DictionaryItemCreateReq struct {
	m.Meta    `method:"POST" path:"/dictionary/items" summary:"创建字典项" tag:"数据字典"`
	TypeId    int    `json:"type_id" dc:"字典类型ID" binding:"required"`
	Code      string `json:"code" dc:"字典项编码" binding:"required,max=50"`
	Name      string `json:"name" dc:"字典项名称" binding:"required,max=100"`
	Value     string `json:"value" dc:"字典项值"`
	SortOrder int    `json:"sort_order" dc:"排序"`
	Status    string `json:"status" dc:"状态 active/inactive"`
}

// DictionaryItemCreateRes 是创建字典项返回的数据。
type DictionaryItemCreateRes struct {
	DictionaryItemItem
}

// DictionaryItemUpdateReq 是更新字典项的入参。未提供（零值）的字段保持不变。
type DictionaryItemUpdateReq struct {
	m.Meta    `method:"PUT" path:"/dictionary/items/:id" summary:"更新字典项" tag:"数据字典"`
	Id        int    `uri:"id" dc:"字典项ID"`
	TypeId    int    `json:"type_id" dc:"字典类型ID"`
	Code      string `json:"code" dc:"字典项编码"`
	Name      string `json:"name" dc:"字典项名称"`
	Value     string `json:"value" dc:"字典项值"`
	SortOrder int    `json:"sort_order" dc:"排序"`
	Status    string `json:"status" dc:"状态"`
}

// DictionaryItemUpdateRes 是更新字典项返回的数据。
type DictionaryItemUpdateRes struct {
	DictionaryItemItem
}

// DictionaryItemDeleteReq 是删除字典项的入参。
type DictionaryItemDeleteReq struct {
	m.Meta `method:"DELETE" path:"/dictionary/items/:id" summary:"删除字典项" tag:"数据字典"`
	Id     int `uri:"id" dc:"字典项ID"`
}

// DictionaryItemDeleteRes 是删除字典项返回的数据。
type DictionaryItemDeleteRes struct{}

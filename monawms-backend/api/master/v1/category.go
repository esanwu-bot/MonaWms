package v1

import "github.com/graingo/maltose/frame/m"

// CategoryItem 是物资分类的对外响应结构。
type CategoryItem struct {
	Id           int    `json:"id"`
	Code         string `json:"code,omitempty"`
	Name         string `json:"name"`
	Description  string `json:"description,omitempty"`
	ParentId     int    `json:"parent_id"`
	Level        int    `json:"level" dc:"层级，顶级为1"`
	Path         string `json:"path" dc:"分类路径，如 /1/12/"`
	SortOrder    int    `json:"sort_order"`
	ProductCount int64  `json:"product_count" dc:"挂在该分类下的物资数（含子类统计口径为直接挂载）"`
	Status       string `json:"status"`
	StatusText   string `json:"status_text"`
	CreatedAt    string `json:"created_at,omitempty"`
	UpdatedAt    string `json:"updated_at,omitempty"`
}

// CategoryNode 是分类树节点，仅树接口返回。
type CategoryNode struct {
	Id          int            `json:"id"`
	Code        string         `json:"code,omitempty"`
	Name        string         `json:"name"`
	Description string         `json:"description,omitempty"`
	ParentId    int            `json:"parent_id"`
	Level       int            `json:"level"`
	Path        string         `json:"path"`
	SortOrder   int            `json:"sort_order"`
	Status      string         `json:"status"`
	StatusText  string         `json:"status_text"`
	Children    []CategoryNode `json:"children,omitempty"`
}

// CategoryStatistics 是分类统计信息。
type CategoryStatistics struct {
	Total         int64 `json:"total"`
	Root          int64 `json:"rootCategories"`
	MaxLevel      int   `json:"maxLevel"`
	ActiveCount   int64 `json:"active"`
	InactiveCount int64 `json:"inactive"`
}

// CategoryListReq 是分类列表接口的入参。
type CategoryListReq struct {
	m.Meta   `method:"GET" path:"/categories" summary:"分类列表" tag:"物资主数据"`
	Page     int    `form:"page" json:"page" dc:"页码"`
	Limit    int    `form:"limit" json:"limit" dc:"每页条数"`
	Name     string `form:"name" json:"name" dc:"名称模糊匹配"`
	Code     string `form:"code" json:"code" dc:"编码模糊匹配"`
	ParentId int    `form:"parent_id" json:"parent_id" dc:"父级分类"`
	Status   string `form:"status" json:"status" dc:"状态过滤"`
}

// CategoryListRes 是分类列表接口返回的数据。
type CategoryListRes struct {
	List       []CategoryItem `json:"list"`
	Pagination Pagination     `json:"pagination"`
}

// CategoryTreeReq 是分类树接口的入参。
type CategoryTreeReq struct {
	m.Meta `method:"GET" path:"/categories/tree" summary:"分类树" tag:"物资主数据"`
	Status string `form:"status" json:"status" dc:"状态过滤"`
}

// CategoryTreeRes 是分类树接口返回的数据。
type CategoryTreeRes []CategoryNode

// CategoryStatisticsReq 是分类统计接口的入参。
type CategoryStatisticsReq struct {
	m.Meta `method:"GET" path:"/categories/statistics" summary:"分类统计" tag:"物资主数据"`
}

// CategoryStatisticsRes 是分类统计接口返回的数据。
type CategoryStatisticsRes struct {
	CategoryStatistics
}

// CategoryOptionsReq 是分类选项接口的入参。
type CategoryOptionsReq struct {
	m.Meta `method:"GET" path:"/categories/options" summary:"分类选项" tag:"物资主数据"`
	Status string `form:"status" json:"status" dc:"状态过滤"`
}

// CategoryOptionsRes 是分类选项接口返回的数据。
type CategoryOptionsRes []OptionItem

// CategoryDetailReq 是分类详情接口的入参。
type CategoryDetailReq struct {
	m.Meta `method:"GET" path:"/categories/:id" summary:"分类详情" tag:"物资主数据"`
	Id     int `uri:"id" dc:"分类ID"`
}

// CategoryDetailRes 是分类详情接口返回的数据。
type CategoryDetailRes struct {
	CategoryItem
}

// CategoryCreateReq 是创建分类的入参。
type CategoryCreateReq struct {
	m.Meta      `method:"POST" path:"/categories" summary:"创建分类" tag:"物资主数据"`
	Code        string `json:"code" dc:"分类编码" binding:"max=50"`
	Name        string `json:"name" dc:"分类名称" binding:"required,max=50"`
	ParentId    int    `json:"parent_id" dc:"父级分类ID，0 表示顶级"`
	Description string `json:"description" dc:"描述"`
	SortOrder   int    `json:"sort_order" dc:"排序"`
	Status      string `json:"status" dc:"状态 active/inactive"`
}

// CategoryCreateRes 是创建分类返回的数据。
type CategoryCreateRes struct {
	CategoryItem
}

// CategoryUpdateReq 是更新分类的入参。未提供（零值）的字段保持不变。
type CategoryUpdateReq struct {
	m.Meta      `method:"PUT" path:"/categories/:id" summary:"更新分类" tag:"物资主数据"`
	Id          int    `uri:"id" dc:"分类ID"`
	Code        string `json:"code" dc:"分类编码"`
	Name        string `json:"name" dc:"分类名称"`
	ParentId    int    `json:"parent_id" dc:"父级分类ID"`
	Description string `json:"description" dc:"描述"`
	SortOrder   int    `json:"sort_order" dc:"排序"`
	Status      string `json:"status" dc:"状态"`
}

// CategoryUpdateRes 是更新分类返回的数据。
type CategoryUpdateRes struct {
	CategoryItem
}

// CategoryDeleteReq 是删除分类的入参。
type CategoryDeleteReq struct {
	m.Meta `method:"DELETE" path:"/categories/:id" summary:"删除分类" tag:"物资主数据"`
	Id     int `uri:"id" dc:"分类ID"`
}

// CategoryDeleteRes 是删除分类返回的数据。
type CategoryDeleteRes struct{}

// Package v1 定义主数据模块的接口契约，字段命名与原 PHP 后端响应保持一致（snake_case）。
package v1

// Pagination 是分页元信息，与原 PHP Response::paginate 保持一致。
type Pagination struct {
	Total int64 `json:"total" dc:"总记录数"`
	Page  int   `json:"page" dc:"当前页码"`
	Limit int   `json:"limit" dc:"每页条数"`
	Pages int64 `json:"pages" dc:"总页数"`
}

// OptionItem 是下拉选项项，字段与原后端 options 接口保持一致。
type OptionItem struct {
	Value int    `json:"value" dc:"选项值"`
	Label string `json:"label" dc:"展示文本"`
	Id    int    `json:"id" dc:"主键"`
	Code  string `json:"code" dc:"编码"`
	Name  string `json:"name" dc:"名称"`
}

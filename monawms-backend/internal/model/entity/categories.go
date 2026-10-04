// =================================================================================
// 代码由 Maltose 工具生成并维护，请勿修改。
// =================================================================================
package entity

import "time"

// Category 是数据表 categories 对应的 Go 结构体。
type Category struct {
	Id          int       `gorm:"column:id" json:"id"`
	Name        string    `gorm:"column:name" json:"name"`
	Code        string    `gorm:"column:code" json:"code"`
	ParentId    int       `gorm:"column:parent_id" json:"parentId"`
	Description string    `gorm:"column:description" json:"description"`
	Status      string    `gorm:"column:status" json:"status"`
	SortOrder   int       `gorm:"column:sort_order" json:"sortOrder"`
	CreatedAt   time.Time `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt   time.Time `gorm:"column:updated_at" json:"updatedAt"`
}

// TableName 返回数据表名。
func (*Category) TableName() string {
	return "categories"
}

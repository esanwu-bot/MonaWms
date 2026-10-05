// =================================================================================
// 代码由 Maltose 工具生成并维护，请勿修改。
// =================================================================================
package entity

import "time"

// DictionaryItem 是数据表 dictionary_items 对应的 Go 结构体。
type DictionaryItem struct {
	Id        int       `gorm:"column:id" json:"id"`
	TypeId    int       `gorm:"column:type_id" json:"typeId"`
	Code      string    `gorm:"column:code" json:"code"`
	Name      string    `gorm:"column:name" json:"name"`
	Value     string    `gorm:"column:value" json:"value"`
	SortOrder int       `gorm:"column:sort_order" json:"sortOrder"`
	Status    string    `gorm:"column:status" json:"status"`
	CreatedAt time.Time `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt time.Time `gorm:"column:updated_at" json:"updatedAt"`
}

// TableName 返回数据表名。
func (*DictionaryItem) TableName() string {
	return "dictionary_items"
}

// =================================================================================
// 代码由 Maltose 工具生成并维护，请勿修改。
// =================================================================================
package entity

import "time"

// Shelf 是数据表 shelves 对应的 Go 结构体。
type Shelf struct {
	Id          int       `gorm:"column:id" json:"id"`
	ZoneId      int       `gorm:"column:zone_id" json:"zoneId"`
	Code        string    `gorm:"column:code" json:"code"`
	Name        string    `gorm:"column:name" json:"name"`
	Description string    `gorm:"column:description" json:"description"`
	CreatedAt   time.Time `gorm:"column:created_at" json:"createdAt"`
}

// TableName 返回数据表名。
func (*Shelf) TableName() string {
	return "shelves"
}

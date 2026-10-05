// =================================================================================
// 代码由 Maltose 工具生成并维护，请勿修改。
// =================================================================================
package entity

import "time"

// Zone 是数据表 zones 对应的 Go 结构体。
type Zone struct {
	Id          int       `gorm:"column:id" json:"id"`
	WarehouseId int       `gorm:"column:warehouse_id" json:"warehouseId"`
	Code        string    `gorm:"column:code" json:"code"`
	Name        string    `gorm:"column:name" json:"name"`
	Type        string    `gorm:"column:type" json:"type"`
	Description string    `gorm:"column:description" json:"description"`
	CreatedAt   time.Time `gorm:"column:created_at" json:"createdAt"`
}

// TableName 返回数据表名。
func (*Zone) TableName() string {
	return "zones"
}

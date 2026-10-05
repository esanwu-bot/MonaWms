// =================================================================================
// 代码由 Maltose 工具生成并维护，请勿修改。
// =================================================================================
package entity

import "time"

// BomHeader 是数据表 bom_headers 对应的 Go 结构体。
type BomHeader struct {
	Id          int       `gorm:"column:id" json:"id"`
	BomCode     string    `gorm:"column:bom_code" json:"bomCode"`
	ProductId   int       `gorm:"column:product_id" json:"productId"`
	Version     string    `gorm:"column:version" json:"version"`
	Description string    `gorm:"column:description" json:"description"`
	Status      string    `gorm:"column:status" json:"status"`
	CreatedAt   time.Time `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt   time.Time `gorm:"column:updated_at" json:"updatedAt"`
}

// TableName 返回数据表名。
func (*BomHeader) TableName() string {
	return "bom_headers"
}

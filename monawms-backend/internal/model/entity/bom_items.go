// =================================================================================
// 代码由 Maltose 工具生成并维护，请勿修改。
// =================================================================================
package entity

import "time"

import "github.com/shopspring/decimal"

// BomItem 是数据表 bom_items 对应的 Go 结构体。
type BomItem struct {
	Id          int             `gorm:"column:id" json:"id"`
	BomHeaderId int             `gorm:"column:bom_header_id" json:"bomHeaderId"`
	ProductId   int             `gorm:"column:product_id" json:"productId"`
	Quantity    decimal.Decimal `gorm:"column:quantity" json:"quantity"`
	Unit        string          `gorm:"column:unit" json:"unit"`
	Notes       string          `gorm:"column:notes" json:"notes"`
	CreatedAt   time.Time       `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt   time.Time       `gorm:"column:updated_at" json:"updatedAt"`
}

// TableName 返回数据表名。
func (*BomItem) TableName() string {
	return "bom_items"
}

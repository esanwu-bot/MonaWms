// =================================================================================
// 代码由 Maltose 工具生成并维护，请勿修改。
// =================================================================================
package entity

import "time"

import "github.com/shopspring/decimal"

// Inventory 是数据表 inventory 对应的 Go 结构体。
type Inventory struct {
	Id                int             `gorm:"column:id" json:"id"`
	ProductId         int             `gorm:"column:product_id" json:"productId"`
	LocationId        int             `gorm:"column:location_id" json:"locationId"`
	WarehouseId       int             `gorm:"column:warehouse_id" json:"warehouseId"`
	Quantity          decimal.Decimal `gorm:"column:quantity" json:"quantity"`                    // 库存数量
	ReservedQuantity  decimal.Decimal `gorm:"column:reserved_quantity" json:"reservedQuantity"`   // 预留数量
	AvailableQuantity decimal.Decimal `gorm:"column:available_quantity" json:"availableQuantity"` // 可用数量
	BatchNumber       string          `gorm:"column:batch_number" json:"batchNumber"`
	ExpiryDate        time.Time       `gorm:"column:expiry_date" json:"expiryDate"`
	CreatedAt         time.Time       `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt         time.Time       `gorm:"column:updated_at" json:"updatedAt"`
}

// TableName 返回数据表名。
func (*Inventory) TableName() string {
	return "inventory"
}

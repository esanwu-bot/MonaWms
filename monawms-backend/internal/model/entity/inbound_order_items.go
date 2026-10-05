// =================================================================================
// 代码由 Maltose 工具生成并维护，请勿修改。
// =================================================================================
package entity

import "time"

import "github.com/shopspring/decimal"

// InboundOrderItem 是数据表 inbound_order_items 对应的 Go 结构体。
type InboundOrderItem struct {
	Id               int             `gorm:"column:id" json:"id"`
	InboundOrderId   int             `gorm:"column:inbound_order_id" json:"inboundOrderId"`
	ProductId        int             `gorm:"column:product_id" json:"productId"`
	Unit             string          `gorm:"column:unit" json:"unit"` // 单位快照(过账时固化，避免主数据变更导致历史语义漂移)
	LocationId       int             `gorm:"column:location_id" json:"locationId"`
	Quantity         decimal.Decimal `gorm:"column:quantity" json:"quantity"`                  // 入库数量
	ReceivedQuantity decimal.Decimal `gorm:"column:received_quantity" json:"receivedQuantity"` // 实收数量
	UnitPrice        decimal.Decimal `gorm:"column:unit_price" json:"unitPrice"`               // 单价
	BatchNumber      string          `gorm:"column:batch_number" json:"batchNumber"`
	ExpiryDate       time.Time       `gorm:"column:expiry_date" json:"expiryDate"`
	RequiresSerial   int8            `gorm:"column:requires_serial" json:"requiresSerial"`
	Notes            string          `gorm:"column:notes" json:"notes"`
	CreatedAt        time.Time       `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt        time.Time       `gorm:"column:updated_at" json:"updatedAt"`
}

// TableName 返回数据表名。
func (*InboundOrderItem) TableName() string {
	return "inbound_order_items"
}

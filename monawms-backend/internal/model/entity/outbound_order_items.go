// =================================================================================
// 代码由 Maltose 工具生成并维护，请勿修改。
// =================================================================================
package entity

import "time"

import "github.com/shopspring/decimal"

// OutboundOrderItem 是数据表 outbound_order_items 对应的 Go 结构体。
type OutboundOrderItem struct {
	Id              int             `gorm:"column:id" json:"id"`
	OutboundOrderId int             `gorm:"column:outbound_order_id" json:"outboundOrderId"`
	ProductId       int             `gorm:"column:product_id" json:"productId"`
	Unit            string          `gorm:"column:unit" json:"unit"` // 单位快照
	LocationId      int             `gorm:"column:location_id" json:"locationId"`
	Quantity        decimal.Decimal `gorm:"column:quantity" json:"quantity"`              // 出库数量
	PickedQuantity  decimal.Decimal `gorm:"column:picked_quantity" json:"pickedQuantity"` // 已拣数量
	UnitPrice       decimal.Decimal `gorm:"column:unit_price" json:"unitPrice"`           // 单价
	BatchNumber     string          `gorm:"column:batch_number" json:"batchNumber"`
	RequiresSerial  int8            `gorm:"column:requires_serial" json:"requiresSerial"`
	ProjectId       int             `gorm:"column:project_id" json:"projectId"`
	Notes           string          `gorm:"column:notes" json:"notes"`
	CreatedAt       time.Time       `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt       time.Time       `gorm:"column:updated_at" json:"updatedAt"`
	PickedBatches   string          `gorm:"column:picked_batches" json:"pickedBatches"` // P9: 批次扣减轨迹 JSON [{batch_id,batch_no,location_id,quantity}]
}

// TableName 返回数据表名。
func (*OutboundOrderItem) TableName() string {
	return "outbound_order_items"
}

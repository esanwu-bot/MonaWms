// =================================================================================
// 代码由 Maltose 工具生成并维护，请勿修改。
// =================================================================================
package entity

import "time"

import "github.com/shopspring/decimal"

// InventoryBatch 是数据表 inventory_batches 对应的 Go 结构体。
type InventoryBatch struct {
	Id                int             `gorm:"column:id" json:"id"`
	ProductId         int             `gorm:"column:product_id" json:"productId"`                 // 商品ID
	WarehouseId       int             `gorm:"column:warehouse_id" json:"warehouseId"`             // 仓库ID
	LocationId        int             `gorm:"column:location_id" json:"locationId"`               // 库位ID
	BatchNo           string          `gorm:"column:batch_no" json:"batchNo"`                     // 批次号/卷号
	InitialQuantity   decimal.Decimal `gorm:"column:initial_quantity" json:"initialQuantity"`     // 初始数量
	RemainingQuantity decimal.Decimal `gorm:"column:remaining_quantity" json:"remainingQuantity"` // 剩余数量
	Unit              string          `gorm:"column:unit" json:"unit"`                            // 单位快照
	Status            string          `gorm:"column:status" json:"status"`                        // active在用/exhausted已用完
	InboundItemId     int             `gorm:"column:inbound_item_id" json:"inboundItemId"`        // 入库明细ID
	InboundOrderId    int             `gorm:"column:inbound_order_id" json:"inboundOrderId"`      // 入库单ID
	InboundAt         time.Time       `gorm:"column:inbound_at" json:"inboundAt"`                 // 入库时间（FIFO 排序依据）
	Notes             string          `gorm:"column:notes" json:"notes"`
	CreatedAt         time.Time       `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt         time.Time       `gorm:"column:updated_at" json:"updatedAt"`
}

// TableName 返回数据表名。
func (*InventoryBatch) TableName() string {
	return "inventory_batches"
}

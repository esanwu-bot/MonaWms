// =================================================================================
// 代码由 Maltose 工具生成并维护，请勿修改。
// =================================================================================
package entity

import "time"

import "github.com/shopspring/decimal"

// StocktakeItem 是数据表 stocktake_items 对应的 Go 结构体。
type StocktakeItem struct {
	Id               int             `gorm:"column:id" json:"id"`
	StocktakeOrderId int             `gorm:"column:stocktake_order_id" json:"stocktakeOrderId"` // ???ID
	ProductId        int             `gorm:"column:product_id" json:"productId"`                // ??ID
	LocationId       int             `gorm:"column:location_id" json:"locationId"`              // ??ID
	WarehouseId      int             `gorm:"column:warehouse_id" json:"warehouseId"`            // ??ID???????????
	IsPiece          int8            `gorm:"column:is_piece" json:"isPiece"`                    // 1??(SN)/0??(??)
	SerialNumber     string          `gorm:"column:serial_number" json:"serialNumber"`          // ??SN???????
	BatchNo          string          `gorm:"column:batch_no" json:"batchNo"`                    // ????/?????????
	SnapshotQty      decimal.Decimal `gorm:"column:snapshot_qty" json:"snapshotQty"`            // ?????????1?
	CountedQty       decimal.Decimal `gorm:"column:counted_qty" json:"countedQty"`              // ?????NULL=???
	DiffQty          decimal.Decimal `gorm:"column:diff_qty" json:"diffQty"`                    // ??????/????
	Reason           string          `gorm:"column:reason" json:"reason"`                       // ?????????/??/??/????/?????
	Status           string          `gorm:"column:status" json:"status"`                       // pending??/counted??
	IsSurplus        int8            `gorm:"column:is_surplus" json:"isSurplus"`                // 1??????????????????SN???
	CountedBy        int             `gorm:"column:counted_by" json:"countedBy"`                // ???
	CountedAt        time.Time       `gorm:"column:counted_at" json:"countedAt"`                // ????
	CreatedAt        time.Time       `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt        time.Time       `gorm:"column:updated_at" json:"updatedAt"`
}

// TableName 返回数据表名。
func (*StocktakeItem) TableName() string {
	return "stocktake_items"
}

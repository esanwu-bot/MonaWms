// =================================================================================
// 代码由 Maltose 工具生成并维护，请勿修改。
// =================================================================================
package entity

import "time"

import "github.com/shopspring/decimal"

// StocktakeOrder 是数据表 stocktake_orders 对应的 Go 结构体。
type StocktakeOrder struct {
	Id               int             `gorm:"column:id" json:"id"`
	OrderNumber      string          `gorm:"column:order_number" json:"orderNumber"`            // ?????PD+Ymd+4????
	WarehouseId      int             `gorm:"column:warehouse_id" json:"warehouseId"`            // ??ID
	Type             string          `gorm:"column:type" json:"type"`                           // full??/partial??/dynamic????
	ScopeType        string          `gorm:"column:scope_type" json:"scopeType"`                // all??/category???/location?????
	ScopeValue       string          `gorm:"column:scope_value" json:"scopeValue"`              // ??????ID/??ID?????
	Status           string          `gorm:"column:status" json:"status"`                       // draft/counting/pending_review/completed/cancelled
	KeeperId         int             `gorm:"column:keeper_id" json:"keeperId"`                  // ?????
	SnapshotAt       time.Time       `gorm:"column:snapshot_at" json:"snapshotAt"`              // ????????????
	SubmittedAt      time.Time       `gorm:"column:submitted_at" json:"submittedAt"`            // ??????
	ReviewerId       int             `gorm:"column:reviewer_id" json:"reviewerId"`              // ???
	ReviewedAt       time.Time       `gorm:"column:reviewed_at" json:"reviewedAt"`              // ????
	ReviewNotes      string          `gorm:"column:review_notes" json:"reviewNotes"`            // ????
	AdjustmentNumber string          `gorm:"column:adjustment_number" json:"adjustmentNumber"`  // ??????????PD-ADJ-Ymd-???
	TotalSnapshotQty decimal.Decimal `gorm:"column:total_snapshot_qty" json:"totalSnapshotQty"` // ????
	TotalCountedQty  decimal.Decimal `gorm:"column:total_counted_qty" json:"totalCountedQty"`   // ????
	TotalDiffQty     decimal.Decimal `gorm:"column:total_diff_qty" json:"totalDiffQty"`         // ????????????
	ItemTotal        int             `gorm:"column:item_total" json:"itemTotal"`                // ????
	ItemCounted      int             `gorm:"column:item_counted" json:"itemCounted"`            // ????
	ItemDiff         int             `gorm:"column:item_diff" json:"itemDiff"`                  // ????
	Notes            string          `gorm:"column:notes" json:"notes"`                         // ??
	CreatedBy        int             `gorm:"column:created_by" json:"createdBy"`
	UpdatedBy        int             `gorm:"column:updated_by" json:"updatedBy"`
	CreatedAt        time.Time       `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt        time.Time       `gorm:"column:updated_at" json:"updatedAt"`
	DeletedAt        time.Time       `gorm:"column:deleted_at" json:"deletedAt"`
}

// TableName 返回数据表名。
func (*StocktakeOrder) TableName() string {
	return "stocktake_orders"
}

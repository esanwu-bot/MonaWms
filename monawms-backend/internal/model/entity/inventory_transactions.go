// =================================================================================
// 代码由 Maltose 工具生成并维护，请勿修改。
// =================================================================================
package entity

import "time"

import "github.com/shopspring/decimal"

// InventoryTransaction 是数据表 inventory_transactions 对应的 Go 结构体。
type InventoryTransaction struct {
	Id              int             `gorm:"column:id" json:"id"`
	ProductId       int             `gorm:"column:product_id" json:"productId"`
	LocationId      int             `gorm:"column:location_id" json:"locationId"`
	InventoryId     int             `gorm:"column:inventory_id" json:"inventoryId"`
	Type            string          `gorm:"column:type" json:"type"`
	Quantity        decimal.Decimal `gorm:"column:quantity" json:"quantity"`                // 变动数量(正入负出)
	BalanceQuantity decimal.Decimal `gorm:"column:balance_quantity" json:"balanceQuantity"` // 变动后结存
	OperatorId      int             `gorm:"column:operator_id" json:"operatorId"`
	Reason          string          `gorm:"column:reason" json:"reason"`
	Remark          string          `gorm:"column:remark" json:"remark"` // 备注（调整/转移说明）
	ReferenceType   string          `gorm:"column:reference_type" json:"referenceType"`
	ReferenceId     int             `gorm:"column:reference_id" json:"referenceId"`
	CreatedAt       time.Time       `gorm:"column:created_at" json:"createdAt"`
}

// TableName 返回数据表名。
func (*InventoryTransaction) TableName() string {
	return "inventory_transactions"
}

// =================================================================================
// 代码由 Maltose 工具生成并维护，请勿修改。
// =================================================================================
package entity

import "time"

import "github.com/shopspring/decimal"

// ProjectInventoryReservation 是数据表 project_inventory_reservations 对应的 Go 结构体。
type ProjectInventoryReservation struct {
	Id        int             `gorm:"column:id" json:"id"`
	ProjectId int             `gorm:"column:project_id" json:"projectId"`
	ProductId int             `gorm:"column:product_id" json:"productId"`
	Quantity  decimal.Decimal `gorm:"column:quantity" json:"quantity"`
	Status    string          `gorm:"column:status" json:"status"`
	Notes     string          `gorm:"column:notes" json:"notes"`
	CreatedAt time.Time       `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt time.Time       `gorm:"column:updated_at" json:"updatedAt"`
}

// TableName 返回数据表名。
func (*ProjectInventoryReservation) TableName() string {
	return "project_inventory_reservations"
}

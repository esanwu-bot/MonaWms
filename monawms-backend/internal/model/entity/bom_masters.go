// =================================================================================
// 代码由 Maltose 工具生成并维护，请勿修改。
// =================================================================================
package entity

import "time"

// BomMaster 是数据表 bom_masters 对应的 Go 结构体。
type BomMaster struct {
	Id            int       `gorm:"column:id" json:"id"`
	BomCode       string    `gorm:"column:bom_code" json:"bomCode"`
	Name          string    `gorm:"column:name" json:"name"`
	ProductId     int       `gorm:"column:product_id" json:"productId"`
	Version       string    `gorm:"column:version" json:"version"`
	Description   string    `gorm:"column:description" json:"description"`
	Status        string    `gorm:"column:status" json:"status"`
	EffectiveDate time.Time `gorm:"column:effective_date" json:"effectiveDate"`
	ExpiryDate    time.Time `gorm:"column:expiry_date" json:"expiryDate"`
	CreatedBy     int       `gorm:"column:created_by" json:"createdBy"`
	Notes         string    `gorm:"column:notes" json:"notes"`
	CreatedAt     time.Time `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt     time.Time `gorm:"column:updated_at" json:"updatedAt"`
}

// TableName 返回数据表名。
func (*BomMaster) TableName() string {
	return "bom_masters"
}

// =================================================================================
// 代码由 Maltose 工具生成并维护，请勿修改。
// =================================================================================
package entity

import (
	"time"

	"gorm.io/gorm"
)

// Device 是数据表 devices 对应的 Go 结构体。
type Device struct {
	Id              int            `gorm:"column:id" json:"id"`
	DeviceCode      string         `gorm:"column:device_code" json:"deviceCode"`
	DeviceName      string         `gorm:"column:device_name" json:"deviceName"`
	DeviceType      string         `gorm:"column:device_type" json:"deviceType"`
	Model           string         `gorm:"column:model" json:"model"`
	Brand           string         `gorm:"column:brand" json:"brand"`
	SerialNumber    string         `gorm:"column:serial_number" json:"serialNumber"`
	ProductId       int            `gorm:"column:product_id" json:"productId"`   // 迁移后归属物资
	MigratedAt      time.Time      `gorm:"column:migrated_at" json:"migratedAt"` // 迁移时间
	Status          string         `gorm:"column:status" json:"status"`
	Location        string         `gorm:"column:location" json:"location"`
	PurchaseDate    time.Time      `gorm:"column:purchase_date" json:"purchaseDate"`
	WarrantyPeriod  int            `gorm:"column:warranty_period" json:"warrantyPeriod"`
	WarrantyEndDate time.Time      `gorm:"column:warranty_end_date" json:"warrantyEndDate"`
	Notes           string         `gorm:"column:notes" json:"notes"`
	CreatedAt       time.Time      `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt       time.Time      `gorm:"column:updated_at" json:"updatedAt"`
	DeletedAt       gorm.DeletedAt `gorm:"column:deleted_at" json:"deletedAt"`
}

// TableName 返回数据表名。
func (*Device) TableName() string {
	return "devices"
}

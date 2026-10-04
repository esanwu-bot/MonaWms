// =================================================================================
// 代码由 Maltose 工具生成并维护，请勿修改。
// =================================================================================
package entity

import "time"

// SerialNumber 是数据表 serial_numbers 对应的 Go 结构体。
type SerialNumber struct {
	Id              int       `gorm:"column:id" json:"id"`
	SerialNumber    string    `gorm:"column:serial_number" json:"serialNumber"`
	ProductId       int       `gorm:"column:product_id" json:"productId"`
	WarehouseId     int       `gorm:"column:warehouse_id" json:"warehouseId"` // 所属仓库ID
	LocationId      int       `gorm:"column:location_id" json:"locationId"`   // 当前库位ID
	StockId         int       `gorm:"column:stock_id" json:"stockId"`
	InboundId       int       `gorm:"column:inbound_id" json:"inboundId"`
	OutboundId      int       `gorm:"column:outbound_id" json:"outboundId"`
	ManufactureDate time.Time `gorm:"column:manufacture_date" json:"manufactureDate"`
	WarrantyPeriod  int       `gorm:"column:warranty_period" json:"warrantyPeriod"`
	WarrantyEndDate time.Time `gorm:"column:warranty_end_date" json:"warrantyEndDate"`
	Status          string    `gorm:"column:status" json:"status"`
	Location        string    `gorm:"column:location" json:"location"`
	MacAddress      string    `gorm:"column:mac_address" json:"macAddress"`
	Notes           string    `gorm:"column:notes" json:"notes"`
	CreatedAt       time.Time `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt       time.Time `gorm:"column:updated_at" json:"updatedAt"`
}

// TableName 返回数据表名。
func (*SerialNumber) TableName() string {
	return "serial_numbers"
}

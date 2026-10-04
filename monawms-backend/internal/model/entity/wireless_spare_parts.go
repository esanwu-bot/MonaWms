// =================================================================================
// 代码由 Maltose 工具生成并维护，请勿修改。
// =================================================================================
package entity

import "time"

// WirelessSparePart 是数据表 wireless_spare_parts 对应的 Go 结构体。
type WirelessSparePart struct {
	Id           int       `gorm:"column:id" json:"id"`
	Code         string    `gorm:"column:code" json:"code"`
	PartName     string    `gorm:"column:part_name" json:"partName"`
	Model        string    `gorm:"column:model" json:"model"`
	SerialNumber string    `gorm:"column:serial_number" json:"serialNumber"`
	Type         string    `gorm:"column:type" json:"type"`
	Quantity     int       `gorm:"column:quantity" json:"quantity"`
	Operator     string    `gorm:"column:operator" json:"operator"`
	Project      string    `gorm:"column:project" json:"project"`
	Status       string    `gorm:"column:status" json:"status"`
	CreatedAt    time.Time `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt    time.Time `gorm:"column:updated_at" json:"updatedAt"`
}

// TableName 返回数据表名。
func (*WirelessSparePart) TableName() string {
	return "wireless_spare_parts"
}

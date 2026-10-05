// =================================================================================
// 代码由 Maltose 工具生成并维护，请勿修改。
// =================================================================================
package entity

import "time"

// SerialNumberHistory 是数据表 serial_number_history 对应的 Go 结构体。
type SerialNumberHistory struct {
	Id             int       `gorm:"column:id" json:"id"`
	SerialNumberId int       `gorm:"column:serial_number_id" json:"serialNumberId"`
	EventType      string    `gorm:"column:event_type" json:"eventType"`
	StatusBefore   string    `gorm:"column:status_before" json:"statusBefore"`
	StatusAfter    string    `gorm:"column:status_after" json:"statusAfter"`
	LocationBefore int       `gorm:"column:location_before" json:"locationBefore"`
	LocationAfter  int       `gorm:"column:location_after" json:"locationAfter"`
	ReferenceType  string    `gorm:"column:reference_type" json:"referenceType"`
	ReferenceId    int       `gorm:"column:reference_id" json:"referenceId"`
	OperatorId     int       `gorm:"column:operator_id" json:"operatorId"`
	Notes          string    `gorm:"column:notes" json:"notes"`
	CreatedAt      time.Time `gorm:"column:created_at" json:"createdAt"`
}

// TableName 返回数据表名。
func (*SerialNumberHistory) TableName() string {
	return "serial_number_history"
}

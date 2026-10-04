// =================================================================================
// 代码由 Maltose 工具生成并维护，请勿修改。
// =================================================================================
package entity

import "time"

// OutboundOrder 是数据表 outbound_orders 对应的 Go 结构体。
type OutboundOrder struct {
	Id             int       `gorm:"column:id" json:"id"`
	OrderNumber    string    `gorm:"column:order_number" json:"orderNumber"`
	WarehouseId    int       `gorm:"column:warehouse_id" json:"warehouseId"`
	CustomerId     int       `gorm:"column:customer_id" json:"customerId"`
	ReceiverUnit   string    `gorm:"column:receiver_unit" json:"receiverUnit"`   // 领用单位
	ReceiverName   string    `gorm:"column:receiver_name" json:"receiverName"`   // 领用人
	ReceiverPhone  string    `gorm:"column:receiver_phone" json:"receiverPhone"` // 领用人手机号
	OperatorId     int       `gorm:"column:operator_id" json:"operatorId"`
	CreatedBy      int       `gorm:"column:created_by" json:"createdBy"`
	Status         string    `gorm:"column:status" json:"status"`
	Type           string    `gorm:"column:type" json:"type"`
	Priority       string    `gorm:"column:priority" json:"priority"`
	ExpectedDate   time.Time `gorm:"column:expected_date" json:"expectedDate"`
	ShippedDate    time.Time `gorm:"column:shipped_date" json:"shippedDate"`
	ShippedAt      time.Time `gorm:"column:shipped_at" json:"shippedAt"` // 出库时间(业务发生时间)
	TrackingNumber string    `gorm:"column:tracking_number" json:"trackingNumber"`
	ProjectId      int       `gorm:"column:project_id" json:"projectId"`
	Notes          string    `gorm:"column:notes" json:"notes"`
	CreatedAt      time.Time `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt      time.Time `gorm:"column:updated_at" json:"updatedAt"`
	DeletedAt      time.Time `gorm:"column:deleted_at" json:"deletedAt"` // 归档时间（软删除）
}

// TableName 返回数据表名。
func (*OutboundOrder) TableName() string {
	return "outbound_orders"
}

// =================================================================================
// 代码由 Maltose 工具生成并维护，请勿修改。
// =================================================================================
package entity

import "time"

// InboundOrder 是数据表 inbound_orders 对应的 Go 结构体。
type InboundOrder struct {
	Id             int       `gorm:"column:id" json:"id"`
	OrderNumber    string    `gorm:"column:order_number" json:"orderNumber"`
	WarehouseId    int       `gorm:"column:warehouse_id" json:"warehouseId"`
	SupplierId     int       `gorm:"column:supplier_id" json:"supplierId"`
	Source         string    `gorm:"column:source" json:"source"`                  // 入库来源(字典 inbound_source)
	TransferFrom   string    `gorm:"column:transfer_from" json:"transferFrom"`     // 调出仓库/地点（从哪里调拨）
	TransferRemark string    `gorm:"column:transfer_remark" json:"transferRemark"` // 调拨说明（无设备编号调拨须注明从哪到哪、依据）
	HandlerName    string    `gorm:"column:handler_name" json:"handlerName"`       // 经手人姓名
	HandlerPhone   string    `gorm:"column:handler_phone" json:"handlerPhone"`     // 经手人电话
	OperatorId     int       `gorm:"column:operator_id" json:"operatorId"`
	CreatedBy      int       `gorm:"column:created_by" json:"createdBy"`
	Status         string    `gorm:"column:status" json:"status"`
	Type           string    `gorm:"column:type" json:"type"`
	ExpectedDate   time.Time `gorm:"column:expected_date" json:"expectedDate"`
	ReceivedDate   time.Time `gorm:"column:received_date" json:"receivedDate"`
	ReceivedAt     time.Time `gorm:"column:received_at" json:"receivedAt"` // 入库时间(业务发生时间)
	Notes          string    `gorm:"column:notes" json:"notes"`
	CreatedAt      time.Time `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt      time.Time `gorm:"column:updated_at" json:"updatedAt"`
	DeletedAt      time.Time `gorm:"column:deleted_at" json:"deletedAt"` // 归档时间（软删除）
}

// TableName 返回数据表名。
func (*InboundOrder) TableName() string {
	return "inbound_orders"
}

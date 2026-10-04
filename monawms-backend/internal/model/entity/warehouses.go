// =================================================================================
// 代码由 Maltose 工具生成并维护，请勿修改。
// =================================================================================
package entity

import "time"

// Warehouse 是数据表 warehouses 对应的 Go 结构体。
type Warehouse struct {
	Id            int       `gorm:"column:id" json:"id"`
	Code          string    `gorm:"column:code" json:"code"`
	Name          string    `gorm:"column:name" json:"name"`
	Address       string    `gorm:"column:address" json:"address"`
	ManagerId     int       `gorm:"column:manager_id" json:"managerId"`
	Status        string    `gorm:"column:status" json:"status"`
	TotalCapacity int       `gorm:"column:total_capacity" json:"totalCapacity"`
	CreatedAt     time.Time `gorm:"column:created_at" json:"createdAt"`
	DeletedAt     time.Time `gorm:"column:deleted_at" json:"deletedAt"` // 软删除时间
}

// TableName 返回数据表名。
func (*Warehouse) TableName() string {
	return "warehouses"
}

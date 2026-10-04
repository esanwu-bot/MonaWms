// =================================================================================
// 代码由 Maltose 工具生成并维护，请勿修改。
// =================================================================================
package entity

import "time"

// Supplier 是数据表 suppliers 对应的 Go 结构体。
type Supplier struct {
	Id            int       `gorm:"column:id" json:"id"`
	Code          string    `gorm:"column:code" json:"code"`
	Name          string    `gorm:"column:name" json:"name"`
	ContactPerson string    `gorm:"column:contact_person" json:"contactPerson"`
	Phone         string    `gorm:"column:phone" json:"phone"`
	Email         string    `gorm:"column:email" json:"email"`
	Address       string    `gorm:"column:address" json:"address"`
	Status        string    `gorm:"column:status" json:"status"`
	CreatedAt     time.Time `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt     time.Time `gorm:"column:updated_at" json:"updatedAt"`
}

// TableName 返回数据表名。
func (*Supplier) TableName() string {
	return "suppliers"
}

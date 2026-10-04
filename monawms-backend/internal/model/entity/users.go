// =================================================================================
// 代码由 Maltose 工具生成并维护，请勿修改。
// =================================================================================
package entity

import "time"

// User 是数据表 users 对应的 Go 结构体。
type User struct {
	Id            int       `gorm:"column:id" json:"id"`
	Username      string    `gorm:"column:username" json:"username"`
	RealName      string    `gorm:"column:real_name" json:"realName"`
	Email         string    `gorm:"column:email" json:"email"`
	Phone         string    `gorm:"column:phone" json:"phone"`
	PasswordHash  string    `gorm:"column:password_hash" json:"passwordHash"`
	Role          string    `gorm:"column:role" json:"role"`
	VendorId      int       `gorm:"column:vendor_id" json:"vendorId"`         // 代维方归属（可空）
	DepartmentId  int       `gorm:"column:department_id" json:"departmentId"` // 部门ID（保留，不做隔离）
	Status        string    `gorm:"column:status" json:"status"`
	LastLoginTime time.Time `gorm:"column:last_login_time" json:"lastLoginTime"`
	LastLoginAt   time.Time `gorm:"column:last_login_at" json:"lastLoginAt"`
	CreatedAt     time.Time `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt     time.Time `gorm:"column:updated_at" json:"updatedAt"`
	DeletedAt     time.Time `gorm:"column:deleted_at" json:"deletedAt"` // 软删除时间
}

// TableName 返回数据表名。
func (*User) TableName() string {
	return "users"
}

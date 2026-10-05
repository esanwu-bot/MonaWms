// =================================================================================
// 代码由 Maltose 工具生成并维护，请勿修改。
// =================================================================================
package entity

import "time"

import "github.com/shopspring/decimal"

// Project 是数据表 projects 对应的 Go 结构体。
type Project struct {
	Id           int             `gorm:"column:id" json:"id"`
	ProjectCode  string          `gorm:"column:project_code" json:"projectCode"`
	ProjectName  string          `gorm:"column:project_name" json:"projectName"`
	Description  string          `gorm:"column:description" json:"description"`
	Manager      string          `gorm:"column:manager" json:"manager"`
	ManagerId    int             `gorm:"column:manager_id" json:"managerId"`
	ContactPhone string          `gorm:"column:contact_phone" json:"contactPhone"`
	ContactEmail string          `gorm:"column:contact_email" json:"contactEmail"`
	Address      string          `gorm:"column:address" json:"address"`
	Status       string          `gorm:"column:status" json:"status"`
	Budget       decimal.Decimal `gorm:"column:budget" json:"budget"`
	StartDate    time.Time       `gorm:"column:start_date" json:"startDate"`
	EndDate      time.Time       `gorm:"column:end_date" json:"endDate"`
	CustomerId   int             `gorm:"column:customer_id" json:"customerId"`
	CreatedAt    time.Time       `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt    time.Time       `gorm:"column:updated_at" json:"updatedAt"`
}

// TableName 返回数据表名。
func (*Project) TableName() string {
	return "projects"
}

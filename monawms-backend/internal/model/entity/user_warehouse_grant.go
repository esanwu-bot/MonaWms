// =================================================================================
// 代码由 Maltose 工具生成并维护，请勿修改。
// =================================================================================
package entity

import "time"

// UserWarehouseGrant 是数据表 user_warehouse_grant 对应的 Go 结构体。
type UserWarehouseGrant struct {
	Id          int       `gorm:"column:id" json:"id"`
	UserId      int       `gorm:"column:user_id" json:"userId"`           // 被授权账号ID
	WarehouseId int       `gorm:"column:warehouse_id" json:"warehouseId"` // 授权仓库ID
	GrantRole   string    `gorm:"column:grant_role" json:"grantRole"`     // 仓库级角色：manager=可审核过账，operator=仅录入
	Status      string    `gorm:"column:status" json:"status"`            // active 生效 / revoked 已撤销（留痕不删）
	GrantedBy   int       `gorm:"column:granted_by" json:"grantedBy"`     // 授权人（系统管理员）
	GrantedAt   time.Time `gorm:"column:granted_at" json:"grantedAt"`     // 授权时间
	RevokedBy   int       `gorm:"column:revoked_by" json:"revokedBy"`     // 撤销人
	RevokedAt   time.Time `gorm:"column:revoked_at" json:"revokedAt"`     // 撤销时间
	Remark      string    `gorm:"column:remark" json:"remark"`            // 备注（代维方名称、授权事由）
	CreatedAt   time.Time `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt   time.Time `gorm:"column:updated_at" json:"updatedAt"`
	DeletedAt   time.Time `gorm:"column:deleted_at" json:"deletedAt"` // 软删除（正常不用，授权变更走 status）
}

// TableName 返回数据表名。
func (*UserWarehouseGrant) TableName() string {
	return "user_warehouse_grant"
}

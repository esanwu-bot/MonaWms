// =================================================================================
// 代码由 Maltose 工具生成并维护，请勿修改。
// =================================================================================
package entity

import "time"

// OperationLog 是数据表 operation_log 对应的 Go 结构体。
type OperationLog struct {
	Id         int64     `gorm:"column:id" json:"id"`
	OperatorId int       `gorm:"column:operator_id" json:"operatorId"` // 操作人ID
	Action     string    `gorm:"column:action" json:"action"`          // 动作，如 create/update/delete/grant:grant
	TargetType string    `gorm:"column:target_type" json:"targetType"` // 目标类型
	TargetId   int       `gorm:"column:target_id" json:"targetId"`     // 目标ID
	Before     string    `gorm:"column:before" json:"before"`          // 变更前 JSON diff
	After      string    `gorm:"column:after" json:"after"`            // 变更后 JSON diff
	Method     string    `gorm:"column:method" json:"method"`          // HTTP 方法
	Path       string    `gorm:"column:path" json:"path"`              // 请求路径
	Ip         string    `gorm:"column:ip" json:"ip"`                  // 来源IP
	CreatedAt  time.Time `gorm:"column:created_at" json:"createdAt"`   // 操作时间
}

// TableName 返回数据表名。
func (*OperationLog) TableName() string {
	return "operation_log"
}

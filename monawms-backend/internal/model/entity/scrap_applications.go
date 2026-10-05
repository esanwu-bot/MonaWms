// =================================================================================
// 代码由 Maltose 工具生成并维护，请勿修改。
// =================================================================================
package entity

import (
	"time"

	"gorm.io/gorm"

	"github.com/shopspring/decimal"
)

// ScrapApplication 是数据表 scrap_applications 对应的 Go 结构体。
type ScrapApplication struct {
	Id              int             `gorm:"column:id" json:"id"`
	ScrapNumber     string          `gorm:"column:scrap_number" json:"scrapNumber"`
	DeviceId        int             `gorm:"column:device_id" json:"deviceId"`
	ReasonType      string          `gorm:"column:reason_type" json:"reasonType"`
	Description     string          `gorm:"column:description" json:"description"`
	Images          string          `gorm:"column:images" json:"images"` // 报废图片 URL 列表
	EstimatedLoss   decimal.Decimal `gorm:"column:estimated_loss" json:"estimatedLoss"`
	ActualLoss      decimal.Decimal `gorm:"column:actual_loss" json:"actualLoss"`
	ApplicantId     int             `gorm:"column:applicant_id" json:"applicantId"`
	Status          string          `gorm:"column:status" json:"status"`
	ApprovedBy      int             `gorm:"column:approved_by" json:"approvedBy"`
	ApprovedAt      time.Time       `gorm:"column:approved_at" json:"approvedAt"`
	ApprovalNotes   string          `gorm:"column:approval_notes" json:"approvalNotes"`
	ProcessedBy     int             `gorm:"column:processed_by" json:"processedBy"`
	ProcessedAt     time.Time       `gorm:"column:processed_at" json:"processedAt"`
	ProcessingNotes string          `gorm:"column:processing_notes" json:"processingNotes"`
	CreatedAt       time.Time       `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt       time.Time       `gorm:"column:updated_at" json:"updatedAt"`
	DeletedAt       gorm.DeletedAt  `gorm:"column:deleted_at" json:"deletedAt"`
}

// TableName 返回数据表名。
func (*ScrapApplication) TableName() string {
	return "scrap_applications"
}

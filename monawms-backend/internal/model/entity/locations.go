// =================================================================================
// 代码由 Maltose 工具生成并维护，请勿修改。
// =================================================================================
package entity

import "time"

import "github.com/shopspring/decimal"

// Location 是数据表 locations 对应的 Go 结构体。
type Location struct {
	Id          int             `gorm:"column:id" json:"id"`
	ShelfId     int             `gorm:"column:shelf_id" json:"shelfId"`
	WarehouseId int             `gorm:"column:warehouse_id" json:"warehouseId"`
	ZoneId      int             `gorm:"column:zone_id" json:"zoneId"`
	Code        string          `gorm:"column:code" json:"code"`
	Name        string          `gorm:"column:name" json:"name"`
	Barcode     string          `gorm:"column:barcode" json:"barcode"`
	Description string          `gorm:"column:description" json:"description"`
	Type        string          `gorm:"column:type" json:"type"`
	Status      string          `gorm:"column:status" json:"status"`
	CreatedAt   time.Time       `gorm:"column:created_at" json:"createdAt"`
	Capacity    int             `gorm:"column:capacity" json:"capacity"`
	Length      decimal.Decimal `gorm:"column:length" json:"length"`
	Width       decimal.Decimal `gorm:"column:width" json:"width"`
	Height      decimal.Decimal `gorm:"column:height" json:"height"`
	WeightLimit decimal.Decimal `gorm:"column:weight_limit" json:"weightLimit"`
}

// TableName 返回数据表名。
func (*Location) TableName() string {
	return "locations"
}

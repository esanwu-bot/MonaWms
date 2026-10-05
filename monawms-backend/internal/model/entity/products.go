// =================================================================================
// 代码由 Maltose 工具生成并维护，请勿修改。
// =================================================================================
package entity

import "time"

import "github.com/shopspring/decimal"

// Product 是数据表 products 对应的 Go 结构体。
type Product struct {
	Id          int    `gorm:"column:id" json:"id"`
	Sku         string `gorm:"column:sku" json:"sku"`
	Name        string `gorm:"column:name" json:"name"`
	Description string `gorm:"column:description" json:"description"`
	DeviceType  string `gorm:"column:device_type" json:"deviceType"`
	ModelNumber string `gorm:"column:model_number" json:"modelNumber"`
	Brand       string `gorm:"column:brand" json:"brand"` // 品牌
	// 生产日期为可空列，nil 时写入 NULL，避免 MySQL 严格模式拒绝零值日期。
	ProductionDate    *time.Time      `gorm:"column:production_date" json:"productionDate"` // 生产日期
	WarrantyMonths    int             `gorm:"column:warranty_months" json:"warrantyMonths"` // 保修期（月）
	FrequencyProtocol string          `gorm:"column:frequency_protocol" json:"frequencyProtocol"`
	FirmwareVersion   string          `gorm:"column:firmware_version" json:"firmwareVersion"`
	CategoryId        int             `gorm:"column:category_id" json:"categoryId"`
	Barcode           string          `gorm:"column:barcode" json:"barcode"`
	BarcodeImage      string          `gorm:"column:barcode_image" json:"barcodeImage"` // 条码图片URL
	Price             decimal.Decimal `gorm:"column:price" json:"price"`                // 售价
	CostPrice         decimal.Decimal `gorm:"column:cost_price" json:"costPrice"`       // 成本价
	Unit              string          `gorm:"column:unit" json:"unit"`
	MeasureType       string          `gorm:"column:measure_type" json:"measureType"`       // 计量方式 count计件/length长度/weight重量/area面积/volume体积
	RequiresSerial    int8            `gorm:"column:requires_serial" json:"requiresSerial"` // 是否需要序列号(由 measure_type 推导：计件=1，长度/重量/面积/体积=0)
	Weight            decimal.Decimal `gorm:"column:weight" json:"weight"`
	Length            decimal.Decimal `gorm:"column:length" json:"length"`
	Width             decimal.Decimal `gorm:"column:width" json:"width"`
	Height            decimal.Decimal `gorm:"column:height" json:"height"`
	MinStock          int             `gorm:"column:min_stock" json:"minStock"`
	MaxStock          int             `gorm:"column:max_stock" json:"maxStock"`
	StockQuantity     int             `gorm:"column:stock_quantity" json:"stockQuantity"`
	MinStockLevel     int             `gorm:"column:min_stock_level" json:"minStockLevel"`
	Status            string          `gorm:"column:status" json:"status"`
	ProjectId         int             `gorm:"column:project_id" json:"projectId"`
	CreatedAt         time.Time       `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt         time.Time       `gorm:"column:updated_at" json:"updatedAt"`
}

// TableName 返回数据表名。
func (*Product) TableName() string {
	return "products"
}

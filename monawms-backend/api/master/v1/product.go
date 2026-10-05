package v1

import "github.com/graingo/maltose/frame/m"

// ProductItem 是物资主数据的对外响应结构，字段与原 PHP Product 模型保持一致。
type ProductItem struct {
	Id                int    `json:"id"`
	Sku               string `json:"sku"`
	Name              string `json:"name"`
	Description       string `json:"description,omitempty"`
	DeviceType        string `json:"device_type,omitempty"`
	ModelNumber       string `json:"model_number,omitempty"`
	Brand             string `json:"brand,omitempty"`
	ProductionDate    string `json:"production_date,omitempty"`
	WarrantyMonths    int    `json:"warranty_months,omitempty"`
	FrequencyProtocol string `json:"frequency_protocol,omitempty"`
	FirmwareVersion   string `json:"firmware_version,omitempty"`
	CategoryId        int    `json:"category_id"`
	CategoryName      string `json:"category_name,omitempty"`
	Barcode           string `json:"barcode,omitempty"`
	BarcodeImage      string `json:"barcode_image,omitempty"`
	// price / cost_price 与原后端一样以字符串返回，避免浮点精度误差。
	Price           string `json:"price"`
	CostPrice       string `json:"cost_price"`
	Unit            string `json:"unit"`
	MeasureType     string `json:"measure_type"`
	MeasureTypeText string `json:"measure_type_text"`
	RequiresSerial  int    `json:"requires_serial"`
	Weight          string `json:"weight"`
	Length          string `json:"length"`
	Width           string `json:"width"`
	Height          string `json:"height"`
	Volume          string `json:"volume"`
	MinStock        int    `json:"min_stock"`
	MaxStock        int    `json:"max_stock"`
	MinStockLevel   int    `json:"min_stock_level"`
	StockQuantity   int    `json:"stock_quantity"`
	TotalStock      int64  `json:"total_stock"`
	AvailableStock  int64  `json:"available_stock"`
	StockStatus     string `json:"stock_status"`
	StockStatusText string `json:"stock_status_text"`
	Status          string `json:"status"`
	StatusText      string `json:"status_text"`
	ProjectId       int    `json:"project_id,omitempty"`
	CreatedAt       string `json:"created_at,omitempty"`
	UpdatedAt       string `json:"updated_at,omitempty"`
}

// ProductBrief 是创建/更新接口返回的精简结构，与原 PHP 保持一致。
type ProductBrief struct {
	Id         int    `json:"id"`
	Sku        string `json:"sku"`
	Name       string `json:"name"`
	CategoryId int    `json:"category_id"`
	Status     string `json:"status"`
	StatusText string `json:"status_text"`
}

// ProductStatistics 是物资统计信息。
type ProductStatistics struct {
	Total      int64 `json:"total"`
	Active     int64 `json:"active"`
	Inactive   int64 `json:"inactive"`
	LowStock   int64 `json:"lowStock"`
	Categories int64 `json:"categories"`
}

// ProductListReq 是物资列表接口的入参。
type ProductListReq struct {
	m.Meta      `method:"GET" path:"/products" summary:"物资列表" tag:"物资主数据"`
	Page        int    `form:"page" json:"page" dc:"页码"`
	Limit       int    `form:"limit" json:"limit" dc:"每页条数"`
	Sku         string `form:"sku" json:"sku" dc:"SKU 模糊匹配"`
	Name        string `form:"name" json:"name" dc:"名称模糊匹配"`
	Barcode     string `form:"barcode" json:"barcode" dc:"条码模糊匹配"`
	CategoryId  int    `form:"category_id" json:"category_id" dc:"分类过滤，含二级分类"`
	Status      string `form:"status" json:"status" dc:"状态过滤"`
	Search      string `form:"search" json:"search" dc:"综合搜索：名称/SKU/条码"`
	WarehouseId int    `form:"warehouse_id" json:"warehouse_id" dc:"仓库过滤：仅返回该仓有库存的物资"`
}

// ProductListRes 是物资列表接口返回的数据。
type ProductListRes struct {
	List       []ProductItem `json:"list"`
	Pagination Pagination    `json:"pagination"`
}

// ProductDetailReq 是物资详情接口的入参。
type ProductDetailReq struct {
	m.Meta `method:"GET" path:"/products/:id" summary:"物资详情" tag:"物资主数据"`
	Id     int `uri:"id" dc:"物资ID"`
}

// ProductDetailRes 是物资详情接口返回的数据（结构展开，与原 PHP getDetailInfo 一致）。
type ProductDetailRes struct {
	ProductItem
}

// ProductFindBySkuReq 是按 SKU 查询物资的入参。
type ProductFindBySkuReq struct {
	m.Meta `method:"GET" path:"/products/sku/:sku" summary:"按SKU查询物资" tag:"物资主数据"`
	Sku    string `uri:"sku" dc:"SKU"`
}

// ProductFindBySkuRes 是按 SKU 查询物资的响应。
type ProductFindBySkuRes struct {
	ProductItem
}

// ProductFindByBarcodeReq 是按条码查询物资的入参。
type ProductFindByBarcodeReq struct {
	m.Meta  `method:"GET" path:"/products/barcode/:barcode" summary:"按条码查询物资" tag:"物资主数据"`
	Barcode string `uri:"barcode" dc:"条码"`
}

// ProductFindByBarcodeRes 是按条码查询物资的响应。
type ProductFindByBarcodeRes struct {
	ProductItem
}

// ProductStatisticsReq 是物资统计接口的入参。
type ProductStatisticsReq struct {
	m.Meta `method:"GET" path:"/products/statistics" summary:"物资统计" tag:"物资主数据"`
}

// ProductStatisticsRes 是物资统计接口返回的数据。
type ProductStatisticsRes struct {
	ProductStatistics
}

// ProductOptionsReq 是物资选项接口的入参。
type ProductOptionsReq struct {
	m.Meta `method:"GET" path:"/products/options" summary:"物资选项" tag:"物资主数据"`
	Name   string `form:"name" json:"name" dc:"名称模糊匹配"`
}

// ProductOptionsRes 是物资选项接口返回的数据。
type ProductOptionsRes []OptionItem

// ProductCreateReq 是创建物资的入参。零值字段表示不填充。
type ProductCreateReq struct {
	m.Meta            `method:"POST" path:"/products" summary:"创建物资" tag:"物资主数据"`
	Sku               string `json:"sku" dc:"SKU" binding:"required,max=50"`
	Name              string `json:"name" dc:"名称" binding:"required,max=100"`
	Description       string `json:"description" dc:"描述"`
	DeviceType        string `json:"device_type" dc:"设备类型"`
	ModelNumber       string `json:"model_number" dc:"型号"`
	Brand             string `json:"brand" dc:"品牌"`
	ProductionDate    string `json:"production_date" dc:"生产日期 YYYY-MM-DD"`
	WarrantyMonths    int    `json:"warranty_months" dc:"保修期（月）"`
	FrequencyProtocol string `json:"frequency_protocol" dc:"频段/协议"`
	FirmwareVersion   string `json:"firmware_version" dc:"固件版本"`
	CategoryId        int    `json:"category_id" dc:"分类ID" binding:"required"`
	Barcode           string `json:"barcode" dc:"条码"`
	BarcodeImage      string `json:"barcode_image" dc:"条码图片URL"`
	Price             string `json:"price" dc:"售价，建议传字符串避免精度损失"`
	CostPrice         string `json:"cost_price" dc:"成本价"`
	Unit              string `json:"unit" dc:"单位"`
	MeasureType       string `json:"measure_type" dc:"计量方式 count/length/weight/area/volume"`
	Weight            string `json:"weight" dc:"重量"`
	Length            string `json:"length" dc:"长度"`
	Width             string `json:"width" dc:"宽度"`
	Height            string `json:"height" dc:"高度"`
	MinStock          int    `json:"min_stock" dc:"最小库存"`
	MaxStock          int    `json:"max_stock" dc:"最大库存"`
	MinStockLevel     int    `json:"min_stock_level" dc:"安全库存下限"`
	Status            string `json:"status" dc:"状态 active/inactive/discontinued/repairing/to_scrap"`
	ProjectId         int    `json:"project_id" dc:"所属项目ID"`
}

// ProductCreateRes 是创建物资返回的数据。
type ProductCreateRes struct {
	ProductBrief
}

// ProductUpdateReq 是更新物资的入参。未提供（零值）的字段保持不变。
type ProductUpdateReq struct {
	m.Meta            `method:"PUT" path:"/products/:id" summary:"更新物资" tag:"物资主数据"`
	Id                int    `uri:"id" dc:"物资ID"`
	Sku               string `json:"sku" dc:"SKU"`
	Name              string `json:"name" dc:"名称"`
	Description       string `json:"description" dc:"描述"`
	DeviceType        string `json:"device_type" dc:"设备类型"`
	ModelNumber       string `json:"model_number" dc:"型号"`
	Brand             string `json:"brand" dc:"品牌"`
	ProductionDate    string `json:"production_date" dc:"生产日期"`
	WarrantyMonths    int    `json:"warranty_months" dc:"保修期（月）"`
	FrequencyProtocol string `json:"frequency_protocol" dc:"频段/协议"`
	FirmwareVersion   string `json:"firmware_version" dc:"固件版本"`
	CategoryId        int    `json:"category_id" dc:"分类ID"`
	Barcode           string `json:"barcode" dc:"条码"`
	BarcodeImage      string `json:"barcode_image" dc:"条码图片URL"`
	Price             string `json:"price" dc:"售价"`
	CostPrice         string `json:"cost_price" dc:"成本价"`
	Unit              string `json:"unit" dc:"单位"`
	MeasureType       string `json:"measure_type" dc:"计量方式"`
	Weight            string `json:"weight" dc:"重量"`
	Length            string `json:"length" dc:"长度"`
	Width             string `json:"width" dc:"宽度"`
	Height            string `json:"height" dc:"高度"`
	MinStock          int    `json:"min_stock" dc:"最小库存"`
	MaxStock          int    `json:"max_stock" dc:"最大库存"`
	MinStockLevel     int    `json:"min_stock_level" dc:"安全库存下限"`
	Status            string `json:"status" dc:"状态"`
	ProjectId         int    `json:"project_id" dc:"所属项目ID"`
}

// ProductUpdateRes 是更新物资返回的数据。
type ProductUpdateRes struct {
	ProductBrief
}

// ProductDeleteReq 是删除物资的入参。
type ProductDeleteReq struct {
	m.Meta `method:"DELETE" path:"/products/:id" summary:"删除物资" tag:"物资主数据"`
	Id     int `uri:"id" dc:"物资ID"`
}

// ProductDeleteRes 是删除物资返回的数据。
type ProductDeleteRes struct{}

package v1

import "github.com/graingo/maltose/frame/m"

// WarehouseStatistics 是仓库级库存/单据统计信息，字段与原 PHP Warehouse::getStatistics 对齐并补充了库位数。
type WarehouseStatistics struct {
	ZonesCount          int64 `json:"zones_count"`
	ShelvesCount        int64 `json:"shelves_count"`
	LocationsCount      int64 `json:"locations_count"`
	ProductsCount       int64 `json:"products_count"`
	InventoryCount      int64 `json:"inventory_count"`
	InboundOrdersCount  int64 `json:"inbound_orders_count"`
	OutboundOrdersCount int64 `json:"outbound_orders_count"`
}

// WarehouseItem 是仓库的对外响应结构。
type WarehouseItem struct {
	Id            int                 `json:"id"`
	Code          string              `json:"code"`
	Name          string              `json:"name"`
	Address       string              `json:"address,omitempty"`
	ManagerId     int                 `json:"manager_id,omitempty"`
	ManagerName   string              `json:"manager_name,omitempty"`
	TotalCapacity int                 `json:"total_capacity,omitempty"`
	Status        string              `json:"status"`
	StatusText    string              `json:"status_text"`
	Statistics    WarehouseStatistics `json:"statistics"`
	CreatedAt     string              `json:"created_at,omitempty"`
	UpdatedAt     string              `json:"updated_at,omitempty"`
}

// WarehouseTotalStatistics 是全部仓库的汇总统计。
type WarehouseTotalStatistics struct {
	Total          int64 `json:"total"`
	Active         int64 `json:"active"`
	Inactive       int64 `json:"inactive"`
	ZonesCount     int64 `json:"zones_count"`
	LocationsCount int64 `json:"locations_count"`
	InventoryCount int64 `json:"inventory_count"`
}

// WarehouseListReq 是仓库列表接口的入参。
type WarehouseListReq struct {
	m.Meta    `method:"GET" path:"/warehouses" summary:"仓库列表" tag:"仓储结构"`
	Page      int    `form:"page" json:"page" dc:"页码"`
	Limit     int    `form:"limit" json:"limit" dc:"每页条数"`
	Code      string `form:"code" json:"code" dc:"编码模糊匹配"`
	Name      string `form:"name" json:"name" dc:"名称模糊匹配"`
	Status    string `form:"status" json:"status" dc:"状态过滤"`
	ManagerId int    `form:"manager_id" json:"manager_id" dc:"负责人过滤"`
}

// WarehouseListRes 是仓库列表接口返回的数据。
type WarehouseListRes struct {
	List       []WarehouseItem `json:"list"`
	Pagination Pagination      `json:"pagination"`
}

// WarehouseDetailReq 是仓库详情接口的入参。
type WarehouseDetailReq struct {
	m.Meta `method:"GET" path:"/warehouses/:id" summary:"仓库详情" tag:"仓储结构"`
	Id     int `uri:"id" dc:"仓库ID"`
}

// WarehouseDetailRes 是仓库详情接口返回的数据。
type WarehouseDetailRes struct {
	WarehouseItem
}

// WarehouseByCodeReq 是按编码查询仓库的入参。
type WarehouseByCodeReq struct {
	m.Meta `method:"GET" path:"/warehouses/code/:code" summary:"按编码查询仓库" tag:"仓储结构"`
	Code   string `uri:"code" dc:"仓库编码"`
}

// WarehouseByCodeRes 是按编码查询仓库的响应。
type WarehouseByCodeRes struct {
	WarehouseItem
}

// WarehouseStatisticsReq 是仓库统计接口的入参。
type WarehouseStatisticsReq struct {
	m.Meta `method:"GET" path:"/warehouses/statistics" summary:"仓库汇总统计" tag:"仓储结构"`
}

// WarehouseStatisticsRes 是仓库汇总统计的响应。
type WarehouseStatisticsRes struct {
	WarehouseTotalStatistics
}

// WarehouseOptionsReq 是仓库选项接口的入参。
type WarehouseOptionsReq struct {
	m.Meta `method:"GET" path:"/warehouses/options" summary:"仓库选项" tag:"仓储结构"`
}

// WarehouseOptionsRes 是仓库选项接口返回的数据。
type WarehouseOptionsRes []OptionItem

// WarehouseCreateReq 是创建仓库的入参。
type WarehouseCreateReq struct {
	m.Meta        `method:"POST" path:"/warehouses" summary:"创建仓库" tag:"仓储结构"`
	Code          string `json:"code" dc:"仓库编码" binding:"required,max=20"`
	Name          string `json:"name" dc:"仓库名称" binding:"required,max=100"`
	Address       string `json:"address" dc:"地址"`
	ManagerId     int    `json:"manager_id" dc:"负责人（用户ID）"`
	TotalCapacity int    `json:"total_capacity" dc:"总容量"`
	Status        string `json:"status" dc:"状态 active/inactive"`
}

// WarehouseCreateRes 是创建仓库返回的数据。
type WarehouseCreateRes struct {
	WarehouseItem
}

// WarehouseUpdateReq 是更新仓库的入参。未提供（零值）的字段保持不变。
type WarehouseUpdateReq struct {
	m.Meta        `method:"PUT" path:"/warehouses/:id" summary:"更新仓库" tag:"仓储结构"`
	Id            int    `uri:"id" dc:"仓库ID"`
	Code          string `json:"code" dc:"仓库编码"`
	Name          string `json:"name" dc:"仓库名称"`
	Address       string `json:"address" dc:"地址"`
	ManagerId     int    `json:"manager_id" dc:"负责人（用户ID）"`
	TotalCapacity int    `json:"total_capacity" dc:"总容量"`
	Status        string `json:"status" dc:"状态"`
}

// WarehouseUpdateRes 是更新仓库返回的数据。
type WarehouseUpdateRes struct {
	WarehouseItem
}

// WarehouseDeleteReq 是删除仓库的入参。
type WarehouseDeleteReq struct {
	m.Meta `method:"DELETE" path:"/warehouses/:id" summary:"删除仓库" tag:"仓储结构"`
	Id     int `uri:"id" dc:"仓库ID"`
}

// WarehouseDeleteRes 是删除仓库返回的数据。
type WarehouseDeleteRes struct{}

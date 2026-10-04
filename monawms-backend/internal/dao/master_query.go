// 本文件是主数据模块的手工查询扩展，与 maltose gen dao 生成的基础方法分开放置，
// 生成文件（products.go / internal/*.go）保持原样，重新生成时不会被覆盖。
package dao

import (
	"context"

	"github.com/esanwu-bot/monawms-backend/internal/model/entity"
	"github.com/graingo/maltose/database/mdb"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

// ============================ 通用工具 ============================

// likeCond 把模糊关键字转成 LIKE 条件。
func likeCond(field, value string) (string, string) {
	return field + " LIKE ?", "%" + value + "%"
}

// countBy 统计满足条件的记录数。
func countBy(ctx context.Context, source *mdb.DB, model any, cond map[string]any) (int64, error) {
	var total int64
	if err := source.WithContext(ctx).Model(model).Where(cond).Count(&total).Error; err != nil {
		return 0, err
	}
	return total, nil
}

// CountBy 按条件统计记录数，供 logic 层做存在性与统计判断。
// source 为默认数据库连接（logic 层传入 m.DB()）。
func CountBy(ctx context.Context, source *mdb.DB, model any, cond map[string]any) (int64, error) {
	return countBy(ctx, source, model, cond)
}

// ============================ 物资 ============================

// ProductSearch 是物资列表的动态查询条件。
type ProductSearch struct {
	Sku         string
	Name        string
	Barcode     string
	Search      string // 综合搜索：名称/SKU/条码 任一命中
	Status      string
	CategoryIds []int // 支持传父级分类 + 二级分类集合
	WarehouseId int   // 仅返回该仓库有库存的物资
}

func (d *ProductDao) applyProductSearch(ctx context.Context, cond ProductSearch) *gorm.DB {
	db := d.DB.WithContext(ctx).Model(&entity.Product{})
	if cond.Sku != "" {
		expr, value := likeCond("sku", cond.Sku)
		db = db.Where(expr, value)
	}
	if cond.Name != "" {
		expr, value := likeCond("name", cond.Name)
		db = db.Where(expr, value)
	}
	if cond.Barcode != "" {
		expr, value := likeCond("barcode", cond.Barcode)
		db = db.Where(expr, value)
	}
	if cond.Search != "" {
		keyword := "%" + cond.Search + "%"
		db = db.Where(d.DB.WithContext(ctx).
			Where("sku LIKE ?", keyword).
			Or("name LIKE ?", keyword).
			Or("barcode LIKE ?", keyword))
	}
	if len(cond.CategoryIds) > 0 {
		db = db.Where("category_id IN ?", cond.CategoryIds)
	}
	if cond.Status != "" {
		db = db.Where("status = ?", cond.Status)
	}
	if cond.WarehouseId > 0 {
		db = db.Where("id IN (?)", d.DB.WithContext(ctx).
			Model(&entity.Inventory{}).
			Select("DISTINCT product_id").
			Where("warehouse_id = ?", cond.WarehouseId))
	}
	return db.Order("created_at DESC, id DESC")
}

// SearchPage 按动态条件分页查询物资。
func (d *ProductDao) SearchPage(ctx context.Context, cond ProductSearch, offset, limit int) ([]*entity.Product, int64, error) {
	var total int64
	if err := d.applyProductSearch(ctx, cond).Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var list []*entity.Product
	if err := d.applyProductSearch(ctx, cond).Offset(offset).Limit(limit).Find(&list).Error; err != nil {
		return nil, 0, err
	}
	return list, total, nil
}

// CountLowStock 统计低库存物资数量：库存量 <= 安全库存下限（优先 min_stock_level）。
func (d *ProductDao) CountLowStock(ctx context.Context) (int64, error) {
	var total int64
	err := d.DB.WithContext(ctx).Model(&entity.Product{}).
		Where("stock_quantity <= IFNULL(min_stock_level, IFNULL(min_stock, 0))").
		Count(&total).Error
	return total, err
}

// CountDistinctCategory 统计已挂分类的物资分类数。
func (d *ProductDao) CountDistinctCategory(ctx context.Context) (int64, error) {
	var total int64
	err := d.DB.WithContext(ctx).Model(&entity.Product{}).
		Where("category_id IS NOT NULL AND category_id > 0").
		Distinct("category_id").
		Count(&total).Error
	return total, err
}

// SumStock 统计某物资在全部仓库的库存总量。
func (d *ProductDao) SumStock(ctx context.Context, productID int) (int64, error) {
	var total decimal.Decimal
	err := d.DB.WithContext(ctx).Model(&entity.Inventory{}).
		Where("product_id = ?", productID).
		Select("COALESCE(SUM(quantity), 0)").
		Scan(&total).Error
	if err != nil {
		return 0, err
	}
	return total.IntPart(), nil
}

// ProductStockRow 是按物资汇总的库存行。
type ProductStockRow struct {
	ProductId int
	Total     decimal.Decimal
}

// SumStockByProducts 批量统计物资的库存总量，避免列表出现 N+1 查询。
func (d *ProductDao) SumStockByProducts(ctx context.Context, productIDs []int) (map[int]int64, error) {
	result := make(map[int]int64, len(productIDs))
	if len(productIDs) == 0 {
		return result, nil
	}

	var rows []ProductStockRow
	err := d.DB.WithContext(ctx).Model(&entity.Inventory{}).
		Select("product_id AS product_id, COALESCE(SUM(quantity), 0) AS total").
		Where("product_id IN ?", productIDs).
		Group("product_id").
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	for _, row := range rows {
		result[row.ProductId] = row.Total.IntPart()
	}
	return result, nil
}

// CountRelatedOrders 统计物资关联的入库/出库明细数量。
func (d *ProductDao) CountRelatedOrders(ctx context.Context, productID int) (int64, error) {
	inbound, err := countBy(ctx, d.DB, &entity.InboundOrderItem{}, map[string]any{"product_id": productID})
	if err != nil {
		return 0, err
	}
	outbound, err := countBy(ctx, d.DB, &entity.OutboundOrderItem{}, map[string]any{"product_id": productID})
	if err != nil {
		return 0, err
	}
	return inbound + outbound, nil
}

// CountInCategory 统计直接挂在某分类下的物资数量。
func (d *ProductDao) CountInCategory(ctx context.Context, categoryID int) (int64, error) {
	return countBy(ctx, d.DB, &entity.Product{}, map[string]any{"category_id": categoryID})
}

// ============================ 分类 ============================

// CategorySearch 是分类列表的动态查询条件。
type CategorySearch struct {
	Name     string
	Code     string
	Status   string
	ParentId int // 0 表示不限
}

func (d *CategoryDao) applyCategorySearch(ctx context.Context, cond CategorySearch) *gorm.DB {
	db := d.DB.WithContext(ctx).Model(&entity.Category{}).Where("id > 0")
	if cond.Name != "" {
		expr, value := likeCond("name", cond.Name)
		db = db.Where(expr, value)
	}
	if cond.Code != "" {
		expr, value := likeCond("code", cond.Code)
		db = db.Where(expr, value)
	}
	if cond.Status != "" {
		db = db.Where("status = ?", cond.Status)
	}
	if cond.ParentId > 0 {
		db = db.Where("parent_id = ?", cond.ParentId)
	}
	return db.Order("sort_order ASC, id ASC")
}

// SearchPage 按动态条件分页查询分类。
func (d *CategoryDao) SearchPage(ctx context.Context, cond CategorySearch, offset, limit int) ([]*entity.Category, int64, error) {
	var total int64
	if err := d.applyCategorySearch(ctx, cond).Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var list []*entity.Category
	if err := d.applyCategorySearch(ctx, cond).Offset(offset).Limit(limit).Find(&list).Error; err != nil {
		return nil, 0, err
	}
	return list, total, nil
}

// FindOrdered 取全量分类（ASC 排序），用于构建分类树。
func (d *CategoryDao) FindOrdered(ctx context.Context, status string) ([]*entity.Category, error) {
	db := d.DB.WithContext(ctx).Model(&entity.Category{}).Where("id > 0")
	if status != "" {
		db = db.Where("status = ?", status)
	}
	var list []*entity.Category
	if err := db.Order("sort_order ASC, id ASC").Find(&list).Error; err != nil {
		return nil, err
	}
	return list, nil
}

// CountChildren 统计直接子分类数量。
func (d *CategoryDao) CountChildren(ctx context.Context, parentID int) (int64, error) {
	return countBy(ctx, d.DB, &entity.Category{}, map[string]any{"parent_id": parentID})
}

// ============================ 仓库 ============================

// WarehouseSearch 是仓库列表的动态查询条件。
type WarehouseSearch struct {
	Code      string
	Name      string
	Status    string
	ManagerId int
}

func (d *WarehouseDao) applyWarehouseSearch(ctx context.Context, cond WarehouseSearch) *gorm.DB {
	db := d.DB.WithContext(ctx).Model(&entity.Warehouse{})
	if cond.Code != "" {
		expr, value := likeCond("code", cond.Code)
		db = db.Where(expr, value)
	}
	if cond.Name != "" {
		expr, value := likeCond("name", cond.Name)
		db = db.Where(expr, value)
	}
	if cond.Status != "" {
		db = db.Where("status = ?", cond.Status)
	}
	if cond.ManagerId > 0 {
		db = db.Where("manager_id = ?", cond.ManagerId)
	}
	return db.Order("created_at DESC, id DESC")
}

// SearchPage 按动态条件分页查询仓库。
func (d *WarehouseDao) SearchPage(ctx context.Context, cond WarehouseSearch, offset, limit int) ([]*entity.Warehouse, int64, error) {
	var total int64
	if err := d.applyWarehouseSearch(ctx, cond).Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var list []*entity.Warehouse
	if err := d.applyWarehouseSearch(ctx, cond).Offset(offset).Limit(limit).Find(&list).Error; err != nil {
		return nil, 0, err
	}
	return list, total, nil
}

// WarehouseCounters 是仓库的下级对象计数。
type WarehouseCounters struct {
	Zones    int64
	Shelves  int64
	Locs     int64
	Products int64
	Stock    int64
	Inbound  int64
	Outbound int64
}

// CountStructure 统计仓库的库区/货架/库位数量。
func (d *WarehouseDao) CountStructure(ctx context.Context, warehouseID int) (WarehouseCounters, error) {
	var counters WarehouseCounters
	var err error
	if counters.Zones, err = countBy(ctx, d.DB, &entity.Zone{}, map[string]any{"warehouse_id": warehouseID}); err != nil {
		return counters, err
	}
	if counters.Shelves, err = d.shelvesCount(ctx, warehouseID); err != nil {
		return counters, err
	}
	if counters.Locs, err = countBy(ctx, d.DB, &entity.Location{}, map[string]any{"warehouse_id": warehouseID}); err != nil {
		return counters, err
	}
	return counters, nil
}

// shelvesCount 通过库区间接统计货架数量：shelves.zone_id IN (该仓库的库区)。
func (d *WarehouseDao) shelvesCount(ctx context.Context, warehouseID int) (int64, error) {
	var total int64
	err := d.DB.WithContext(ctx).Model(&entity.Shelf{}).
		Where("zone_id IN (?)", d.DB.WithContext(ctx).
			Model(&entity.Zone{}).
			Select("id").
			Where("warehouse_id = ?", warehouseID)).
		Count(&total).Error
	return total, err
}

// CountStock 统计仓库库存总量与涉及物资数。
func (d *WarehouseDao) CountStock(ctx context.Context, warehouseID int) (productCount int64, quantity int64, err error) {
	var stock decimal.Decimal
	err = d.DB.WithContext(ctx).Model(&entity.Inventory{}).
		Where("warehouse_id = ?", warehouseID).
		Select("COALESCE(SUM(quantity), 0)").
		Scan(&stock).Error
	if err != nil {
		return 0, 0, err
	}
	quantity = stock.IntPart()

	err = d.DB.WithContext(ctx).Model(&entity.Inventory{}).
		Where("warehouse_id = ?", warehouseID).
		Distinct("product_id").
		Count(&productCount).Error
	if err != nil {
		return 0, 0, err
	}
	return productCount, quantity, nil
}

// WarehouseCountRow 是按仓库聚合的计数行（库区/库位/单据通用）。
type WarehouseCountRow struct {
	WarehouseId int
	Cnt         int64
}

// WarehouseStockRow 是按仓库聚合的库存行。
type WarehouseStockRow struct {
	WarehouseId int
	Stock       decimal.Decimal
}

// StatsBatch 批量统计仓库的库区数、库位数与库存总量，避免列表出现 N+1 查询。
func (d *WarehouseDao) StatsBatch(ctx context.Context, warehouseIDs []int) (map[int]WarehouseCounters, error) {
	result := make(map[int]WarehouseCounters, len(warehouseIDs))
	if len(warehouseIDs) == 0 {
		return result, nil
	}

	var zoneRows []WarehouseCountRow
	if err := d.DB.WithContext(ctx).Model(&entity.Zone{}).
		Select("warehouse_id AS warehouse_id, COUNT(*) AS cnt").
		Where("warehouse_id IN ?", warehouseIDs).
		Group("warehouse_id").Scan(&zoneRows).Error; err != nil {
		return nil, err
	}
	for _, row := range zoneRows {
		counter := result[row.WarehouseId]
		counter.Zones = row.Cnt
		result[row.WarehouseId] = counter
	}

	var locationRows []WarehouseCountRow
	if err := d.DB.WithContext(ctx).Model(&entity.Location{}).
		Select("warehouse_id AS warehouse_id, COUNT(*) AS cnt").
		Where("warehouse_id IN ?", warehouseIDs).
		Group("warehouse_id").Scan(&locationRows).Error; err != nil {
		return nil, err
	}
	for _, row := range locationRows {
		counter := result[row.WarehouseId]
		counter.Locs = row.Cnt
		result[row.WarehouseId] = counter
	}

	var stockRows []WarehouseStockRow
	if err := d.DB.WithContext(ctx).Model(&entity.Inventory{}).
		Select("warehouse_id AS warehouse_id, COALESCE(SUM(quantity), 0) AS stock").
		Where("warehouse_id IN ?", warehouseIDs).
		Group("warehouse_id").Scan(&stockRows).Error; err != nil {
		return nil, err
	}
	for _, row := range stockRows {
		counter := result[row.WarehouseId]
		counter.Stock = row.Stock.IntPart()
		result[row.WarehouseId] = counter
	}

	return result, nil
}

// TotalStockQuantity 统计全部仓库的库存总量。
func (d *WarehouseDao) TotalStockQuantity(ctx context.Context) (int64, error) {
	var stock decimal.Decimal
	err := d.DB.WithContext(ctx).Model(&entity.Inventory{}).Select("COALESCE(SUM(quantity), 0)").Scan(&stock).Error
	if err != nil {
		return 0, err
	}
	return stock.IntPart(), nil
}

// ============================ 数据字典 ============================

// DictionaryItemSearch 是字典项的查询条件。
type DictionaryItemSearch struct {
	TypeId   int
	TypeCode string
	Status   string
}

// SearchItems 按类型 ID 或类型编码查询字典项。
func (d *DictionaryItemDao) SearchItems(ctx context.Context, cond DictionaryItemSearch) ([]*entity.DictionaryItem, error) {
	db := d.DB.WithContext(ctx).Model(&entity.DictionaryItem{})
	if cond.TypeId > 0 {
		db = db.Where("dictionary_items.type_id = ?", cond.TypeId)
	}
	if cond.TypeCode != "" {
		db = db.Where("dictionary_items.type_id IN (?)", d.DB.WithContext(ctx).
			Model(&entity.DictionaryType{}).
			Select("id").
			Where("code = ?", cond.TypeCode))
	}
	if cond.Status != "" {
		db = db.Where("dictionary_items.status = ?", cond.Status)
	}
	var list []*entity.DictionaryItem
	if err := db.Order("sort_order ASC, id ASC").Find(&list).Error; err != nil {
		return nil, err
	}
	return list, nil
}

// ============================ 往来单位 ============================

// PartnerSearch 是供应商/客户列表的动态查询条件。
type PartnerSearch struct {
	Name          string
	Code          string
	ContactPerson string
	Status        string
}

func likeSearch(ctx context.Context, source *mdb.DB, model any, cond PartnerSearch, order string) *gorm.DB {
	query := source.WithContext(ctx).Model(model)
	if cond.Name != "" {
		expr, value := likeCond("name", cond.Name)
		query = query.Where(expr, value)
	}
	if cond.Code != "" {
		expr, value := likeCond("code", cond.Code)
		query = query.Where(expr, value)
	}
	if cond.ContactPerson != "" {
		expr, value := likeCond("contact_person", cond.ContactPerson)
		query = query.Where(expr, value)
	}
	if cond.Status != "" {
		query = query.Where("status = ?", cond.Status)
	}
	return query.Order(order)
}

// SearchPage 按动态条件分页查询供应商。
func (d *SupplierDao) SearchPage(ctx context.Context, cond PartnerSearch, offset, limit int) ([]*entity.Supplier, int64, error) {
	var total int64
	if err := likeSearch(ctx, d.DB, &entity.Supplier{}, cond, "created_at DESC, id DESC").Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var list []*entity.Supplier
	if err := likeSearch(ctx, d.DB, &entity.Supplier{}, cond, "created_at DESC, id DESC").
		Offset(offset).Limit(limit).Find(&list).Error; err != nil {
		return nil, 0, err
	}
	return list, total, nil
}

// SearchPage 按动态条件分页查询客户。
func (d *CustomerDao) SearchPage(ctx context.Context, cond PartnerSearch, offset, limit int) ([]*entity.Customer, int64, error) {
	var total int64
	if err := likeSearch(ctx, d.DB, &entity.Customer{}, cond, "created_at DESC, id DESC").Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var list []*entity.Customer
	if err := likeSearch(ctx, d.DB, &entity.Customer{}, cond, "created_at DESC, id DESC").
		Offset(offset).Limit(limit).Find(&list).Error; err != nil {
		return nil, 0, err
	}
	return list, total, nil
}

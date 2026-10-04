package master

import (
	"context"
	"strings"
	"time"

	"github.com/esanwu-bot/monawms-backend/api/master/v1"
	"github.com/esanwu-bot/monawms-backend/internal/dao"
	"github.com/esanwu-bot/monawms-backend/internal/model/entity"
	"github.com/esanwu-bot/monawms-backend/internal/pkg/oplog"
	"github.com/esanwu-bot/monawms-backend/internal/pkg/page"
	"github.com/esanwu-bot/monawms-backend/internal/service"
	"github.com/graingo/maltose/errors/mcode"
	"github.com/graingo/maltose/errors/merror"
	"github.com/graingo/maltose/frame/m"
)

// 物资状态枚举，与原 PHP Product 模型常量一致。
const (
	productStatusActive       = "active"
	productStatusInactive     = "inactive"
	productStatusDiscontinued = "discontinued"
	productStatusRepairing    = "repairing"
	productStatusToScrap      = "to_scrap"
)

// 计量方式枚举，决定是否要求序列号（计件类需要 SN）。
const (
	measureCount  = "count"
	measureLength = "length"
	measureWeight = "weight"
	measureArea   = "area"
	measureVolume = "volume"
)

// productStatuses 是允许的产品状态取值。
var productStatuses = []string{
	productStatusActive, productStatusInactive, productStatusDiscontinued,
	productStatusRepairing, productStatusToScrap,
}

func init() {
	service.RegisterProduct(NewProduct())
}

type sProduct struct{}

// NewProduct 创建物资主数据的 service 实现。
func NewProduct() service.IProduct {
	return &sProduct{}
}

// List 分页查询物资列表，并批量补齐分类名与库存汇总。
func (s *sProduct) List(ctx context.Context, input *v1.ProductListReq) (output *v1.ProductListRes, err error) {
	output = new(v1.ProductListRes)

	params := page.Normalize(input.Page, input.Limit)
	cond := dao.ProductSearch{
		Sku:         input.Sku,
		Name:        input.Name,
		Barcode:     input.Barcode,
		Search:      input.Search,
		Status:      input.Status,
		WarehouseId: input.WarehouseId,
	}
	// 按一级分类筛选时，同时包含其下二级分类（物资精确挂在二级分类上）。
	if input.CategoryId > 0 {
		ids := []int{input.CategoryId}
		children, err := dao.NewCategoryDao(m.DB()).FindList(ctx, map[string]any{"parent_id": input.CategoryId})
		if err != nil {
			return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "查询子分类失败")
		}
		for _, child := range children {
			ids = append(ids, child.Id)
		}
		cond.CategoryIds = ids
	}

	list, total, err := dao.NewProductDao(m.DB()).SearchPage(ctx, cond, params.Offset(), params.Limit)
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "查询物资列表失败")
	}

	items, err := s.buildItems(ctx, list)
	if err != nil {
		return nil, err
	}

	output.List = items
	output.Pagination = buildPagination(total, params.Page, params.Limit, page.Pages(total, params.Limit))
	return output, nil
}

// Detail 查询物资详情。
func (s *sProduct) Detail(ctx context.Context, input *v1.ProductDetailReq) (output *v1.ProductDetailRes, err error) {
	item, err := s.item(ctx, input.Id)
	if err != nil {
		return nil, err
	}
	output = new(v1.ProductDetailRes)
	output.ProductItem = item
	return output, nil
}

// FindBySku 按 SKU 查询物资。
func (s *sProduct) FindBySku(ctx context.Context, input *v1.ProductFindBySkuReq) (output *v1.ProductFindBySkuRes, err error) {
	if strings.TrimSpace(input.Sku) == "" {
		return nil, merror.NewCode(mcode.CodeValidationFailed, "SKU不能为空")
	}
	product, err := dao.NewProductDao(m.DB()).FindOne(ctx, map[string]any{"sku": input.Sku})
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "查询物资失败")
	}
	if product == nil {
		return nil, merror.NewCode(mcode.CodeNotFound, "商品不存在")
	}
	item, err := s.buildItems(ctx, []*entity.Product{product})
	if err != nil {
		return nil, err
	}
	output = new(v1.ProductFindBySkuRes)
	output.ProductItem = item[0]
	return output, nil
}

// FindByBarcode 按条码查询物资。
func (s *sProduct) FindByBarcode(ctx context.Context, input *v1.ProductFindByBarcodeReq) (output *v1.ProductFindByBarcodeRes, err error) {
	if strings.TrimSpace(input.Barcode) == "" {
		return nil, merror.NewCode(mcode.CodeValidationFailed, "条码不能为空")
	}
	product, err := dao.NewProductDao(m.DB()).FindOne(ctx, map[string]any{"barcode": input.Barcode})
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "查询物资失败")
	}
	if product == nil {
		return nil, merror.NewCode(mcode.CodeNotFound, "商品不存在")
	}
	item, err := s.buildItems(ctx, []*entity.Product{product})
	if err != nil {
		return nil, err
	}
	output = new(v1.ProductFindByBarcodeRes)
	output.ProductItem = item[0]
	return output, nil
}

// Statistics 查询物资统计信息。
func (s *sProduct) Statistics(ctx context.Context, _ *v1.ProductStatisticsReq) (output *v1.ProductStatisticsRes, err error) {
	productDao := dao.NewProductDao(m.DB())

	total, err := dao.CountBy(ctx, m.DB(), &entity.Product{}, map[string]any{})
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "统计物资失败")
	}
	active, err := dao.CountBy(ctx, m.DB(), &entity.Product{}, map[string]any{"status": productStatusActive})
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "统计物资失败")
	}
	lowStock, err := productDao.CountLowStock(ctx)
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "统计低库存物资失败")
	}
	categories, err := productDao.CountDistinctCategory(ctx)
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "统计分类数失败")
	}

	output = new(v1.ProductStatisticsRes)
	output.Total = total
	output.Active = active
	output.Inactive = total - active
	output.LowStock = lowStock
	output.Categories = categories
	return output, nil
}

// Options 查询物资下拉选项。
func (s *sProduct) Options(ctx context.Context, input *v1.ProductOptionsReq) (output *v1.ProductOptionsRes, err error) {
	cond := map[string]any{"status": productStatusActive}
	list, err := dao.NewProductDao(m.DB()).FindList(ctx, cond, "sku ASC")
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "查询物资选项失败")
	}

	options := make(v1.ProductOptionsRes, 0, len(list))
	keyword := strings.ToLower(strings.TrimSpace(input.Name))
	for _, product := range list {
		if keyword != "" && !strings.Contains(strings.ToLower(product.Name), keyword) &&
			!strings.Contains(strings.ToLower(product.Sku), keyword) {
			continue
		}
		options = append(options, buildOption(product.Id, product.Sku, product.Name))
	}
	return &options, nil
}

// Create 创建物资，写权限由 permission 统一判定。
func (s *sProduct) Create(ctx context.Context, input *v1.ProductCreateReq) (output *v1.ProductCreateRes, err error) {
	if err := requireWrite(ctx, "product:write"); err != nil {
		return nil, err
	}

	status, err := normalizeStatus(input.Status, productStatusActive, productStatuses)
	if err != nil {
		return nil, err
	}
	measureType := input.MeasureType
	if measureType == "" {
		measureType = measureCount
	}
	if !validMeasureType(measureType) {
		return nil, merror.NewCode(mcode.CodeValidationFailed, "计量方式取值非法")
	}

	productDao := dao.NewProductDao(m.DB())
	if err := s.assertSkuAvailable(ctx, productDao, input.Sku, 0); err != nil {
		return nil, err
	}
	if strings.TrimSpace(input.Barcode) != "" {
		if err := s.assertBarcodeAvailable(ctx, productDao, input.Barcode, 0); err != nil {
			return nil, err
		}
	}
	if err := s.assertCategoryExists(ctx, input.CategoryId); err != nil {
		return nil, err
	}
	if input.MinStock > 0 && input.MaxStock > 0 && input.MinStock > input.MaxStock {
		return nil, merror.NewCode(mcode.CodeBusinessValidationFailed, "最小库存不能大于最大库存")
	}

	product, err := s.toEntity(input)
	if err != nil {
		return nil, err
	}
	product.Status = status
	product.MeasureType = measureType
	product.RequiresSerial = deriveRequiresSerial(measureType)

	now := time.Now()
	product.CreatedAt = now
	product.UpdatedAt = now
	if err := productDao.Create(ctx, product); err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "创建物资失败")
	}

	oplog.Write(ctx, oplog.Entry{Action: "create", TargetType: "product", TargetID: product.Id, After: product})

	output = new(v1.ProductCreateRes)
	output.ProductBrief = v1.ProductBrief{
		Id:         product.Id,
		Sku:        product.Sku,
		Name:       product.Name,
		CategoryId: product.CategoryId,
		Status:     product.Status,
		StatusText: productStatusText(product.Status),
	}
	return output, nil
}

// Update 更新物资，未提供（零值）的字段保持不变。
func (s *sProduct) Update(ctx context.Context, input *v1.ProductUpdateReq) (output *v1.ProductUpdateRes, err error) {
	if err := requireWrite(ctx, "product:write"); err != nil {
		return nil, err
	}

	productDao := dao.NewProductDao(m.DB())
	product, err := productDao.GetByID(ctx, input.Id)
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "查询物资失败")
	}
	if product == nil {
		return nil, merror.NewCode(mcode.CodeNotFound, "商品不存在")
	}
	before := *product

	if input.Sku != "" {
		if err := s.assertSkuAvailable(ctx, productDao, input.Sku, product.Id); err != nil {
			return nil, err
		}
		product.Sku = input.Sku
	}
	if input.Barcode != "" && input.Barcode != product.Barcode {
		if err := s.assertBarcodeAvailable(ctx, productDao, input.Barcode, product.Id); err != nil {
			return nil, err
		}
		product.Barcode = input.Barcode
	}
	if input.Name != "" {
		product.Name = input.Name
	}
	if input.Description != "" {
		product.Description = input.Description
	}
	if input.CategoryId > 0 {
		if err := s.assertCategoryExists(ctx, input.CategoryId); err != nil {
			return nil, err
		}
		product.CategoryId = input.CategoryId
	}
	if input.Status != "" {
		status, err := normalizeStatus(input.Status, product.Status, productStatuses)
		if err != nil {
			return nil, err
		}
		product.Status = status
	}
	if input.MeasureType != "" {
		if !validMeasureType(input.MeasureType) {
			return nil, merror.NewCode(mcode.CodeValidationFailed, "计量方式取值非法")
		}
		product.MeasureType = input.MeasureType
		product.RequiresSerial = deriveRequiresSerial(input.MeasureType)
	}

	minStock := product.MinStock
	if input.MinStock > 0 {
		minStock = input.MinStock
	}
	maxStock := product.MaxStock
	if input.MaxStock > 0 {
		maxStock = input.MaxStock
	}
	if minStock > 0 && maxStock > 0 && minStock > maxStock {
		return nil, merror.NewCode(mcode.CodeBusinessValidationFailed, "最小库存不能大于最大库存")
	}

	if err := s.fillEntity(product, input); err != nil {
		return nil, err
	}

	product.MinStock = minStock
	product.MaxStock = maxStock

	product.UpdatedAt = time.Now()
	if err := productDao.Update(ctx, product); err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "更新物资失败")
	}

	oplog.Write(ctx, oplog.Entry{
		Action: "update", TargetType: "product", TargetID: product.Id, Before: before, After: *product,
	})

	output = new(v1.ProductUpdateRes)
	output.ProductBrief = v1.ProductBrief{
		Id:         product.Id,
		Sku:        product.Sku,
		Name:       product.Name,
		CategoryId: product.CategoryId,
		Status:     product.Status,
		StatusText: productStatusText(product.Status),
	}
	return output, nil
}

// Delete 删除物资：存在库存或关联单据时禁止删除。
func (s *sProduct) Delete(ctx context.Context, input *v1.ProductDeleteReq) (output *v1.ProductDeleteRes, err error) {
	if err := requireWrite(ctx, "product:write"); err != nil {
		return nil, err
	}

	productDao := dao.NewProductDao(m.DB())
	product, err := productDao.GetByID(ctx, input.Id)
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "查询物资失败")
	}
	if product == nil {
		return nil, merror.NewCode(mcode.CodeNotFound, "商品不存在")
	}

	stock, err := productDao.SumStock(ctx, product.Id)
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "校验库存失败")
	}
	if stock > 0 {
		return nil, merror.NewCode(mcode.CodeBusinessValidationFailed, "商品存在库存，无法删除")
	}
	orders, err := productDao.CountRelatedOrders(ctx, product.Id)
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "校验关联单据失败")
	}
	if orders > 0 {
		return nil, merror.NewCode(mcode.CodeBusinessValidationFailed, "商品存在相关订单，无法删除")
	}

	if err := productDao.Delete(ctx, product.Id); err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "删除物资失败")
	}

	oplog.Write(ctx, oplog.Entry{Action: "delete", TargetType: "product", TargetID: product.Id, Before: product})
	return new(v1.ProductDeleteRes), nil
}

// buildItems 批量转换为响应结构：补齐分类名、库存总量与库存状态。
func (s *sProduct) buildItems(ctx context.Context, list []*entity.Product) ([]v1.ProductItem, error) {
	if len(list) == 0 {
		return []v1.ProductItem{}, nil
	}

	categoryIDs := make([]int, 0, len(list))
	productIDs := make([]int, 0, len(list))
	for _, product := range list {
		categoryIDs = append(categoryIDs, product.CategoryId)
		productIDs = append(productIDs, product.Id)
	}

	categoryNames, err := s.categoryNames(ctx, categoryIDs)
	if err != nil {
		return nil, err
	}
	stocks, err := dao.NewProductDao(m.DB()).SumStockByProducts(ctx, productIDs)
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "统计库存失败")
	}

	items := make([]v1.ProductItem, 0, len(list))
	for _, product := range list {
		totalStock := stocks[product.Id]
		items = append(items, toProductItem(product, categoryNames[product.CategoryId], totalStock))
	}
	return items, nil
}

// item 查询单条物资并转换为响应结构。
func (s *sProduct) item(ctx context.Context, id int) (v1.ProductItem, error) {
	product, err := dao.NewProductDao(m.DB()).GetByID(ctx, id)
	if err != nil {
		return v1.ProductItem{}, merror.WrapCode(err, mcode.CodeDbOperationError, "查询物资失败")
	}
	if product == nil {
		return v1.ProductItem{}, merror.NewCode(mcode.CodeNotFound, "商品不存在")
	}
	stock, err := dao.NewProductDao(m.DB()).SumStock(ctx, product.Id)
	if err != nil {
		return v1.ProductItem{}, merror.WrapCode(err, mcode.CodeDbOperationError, "统计库存失败")
	}
	return toProductItem(product, "", stock), nil
}

// categoryNames 批量取分类名称。
func (s *sProduct) categoryNames(ctx context.Context, ids []int) (map[int]string, error) {
	names := make(map[int]string, len(ids))
	if len(ids) == 0 {
		return names, nil
	}
	categories, err := dao.NewCategoryDao(m.DB()).FindList(ctx, map[string]any{"id": ids})
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "查询分类失败")
	}
	for _, category := range categories {
		names[category.Id] = category.Name
	}
	return names, nil
}

// assertCategoryExists 校验分类存在。
func (s *sProduct) assertCategoryExists(ctx context.Context, categoryID int) error {
	category, err := dao.NewCategoryDao(m.DB()).GetByID(ctx, categoryID)
	if err != nil {
		return merror.WrapCode(err, mcode.CodeDbOperationError, "查询分类失败")
	}
	if category == nil {
		return merror.NewCode(mcode.CodeValidationFailed, "指定的分类不存在")
	}
	return nil
}

// assertSkuAvailable 校验 SKU 未被占用（excludeID 为当前记录 ID）。
func (s *sProduct) assertSkuAvailable(ctx context.Context, productDao *dao.ProductDao, sku string, excludeID int) error {
	exist, err := productDao.FindOne(ctx, map[string]any{"sku": sku})
	if err != nil {
		return merror.WrapCode(err, mcode.CodeDbOperationError, "校验SKU失败")
	}
	if exist != nil && exist.Id != excludeID {
		return merror.NewCode(mcode.CodeBusinessValidationFailed, "SKU已存在")
	}
	return nil
}

// assertBarcodeAvailable 校验条码未被占用（excludeID 为当前记录 ID）。
func (s *sProduct) assertBarcodeAvailable(ctx context.Context, productDao *dao.ProductDao, barcode string, excludeID int) error {
	exist, err := productDao.FindOne(ctx, map[string]any{"barcode": barcode})
	if err != nil {
		return merror.WrapCode(err, mcode.CodeDbOperationError, "校验条码失败")
	}
	if exist != nil && exist.Id != excludeID {
		return merror.NewCode(mcode.CodeBusinessValidationFailed, "条码已存在")
	}
	return nil
}

// toEntity 把创建请求转换为实体。
func (s *sProduct) toEntity(input *v1.ProductCreateReq) (*entity.Product, error) {
	target := &entity.Product{
		Sku:               input.Sku,
		Name:              input.Name,
		Description:       input.Description,
		DeviceType:        input.DeviceType,
		ModelNumber:       input.ModelNumber,
		Brand:             input.Brand,
		WarrantyMonths:    input.WarrantyMonths,
		FrequencyProtocol: input.FrequencyProtocol,
		FirmwareVersion:   input.FirmwareVersion,
		CategoryId:        input.CategoryId,
		Barcode:           input.Barcode,
		BarcodeImage:      input.BarcodeImage,
		Unit:              input.Unit,
		MinStock:          input.MinStock,
		MaxStock:          input.MaxStock,
		MinStockLevel:     input.MinStockLevel,
		ProjectId:         input.ProjectId,
	}

	if input.Unit == "" {
		target.Unit = "件"
	}

	var err error
	if target.ProductionDate, err = parseDate(input.ProductionDate); err != nil {
		return nil, merror.NewCode(mcode.CodeValidationFailed, "生产日期格式应为 YYYY-MM-DD")
	}
	if target.Price, err = parseDecimal(input.Price); err != nil {
		return nil, err
	}
	if target.CostPrice, err = parseDecimal(input.CostPrice); err != nil {
		return nil, err
	}
	if target.Weight, err = parseDecimal(input.Weight); err != nil {
		return nil, err
	}
	if target.Length, err = parseDecimal(input.Length); err != nil {
		return nil, err
	}
	if target.Width, err = parseDecimal(input.Width); err != nil {
		return nil, err
	}
	if target.Height, err = parseDecimal(input.Height); err != nil {
		return nil, err
	}
	return target, nil
}

// fillEntity 把更新请求中非零值的字段写入实体。
func (s *sProduct) fillEntity(product *entity.Product, input *v1.ProductUpdateReq) error {
	if input.DeviceType != "" {
		product.DeviceType = input.DeviceType
	}
	if input.ModelNumber != "" {
		product.ModelNumber = input.ModelNumber
	}
	if input.Brand != "" {
		product.Brand = input.Brand
	}
	if input.WarrantyMonths > 0 {
		product.WarrantyMonths = input.WarrantyMonths
	}
	if input.FrequencyProtocol != "" {
		product.FrequencyProtocol = input.FrequencyProtocol
	}
	if input.FirmwareVersion != "" {
		product.FirmwareVersion = input.FirmwareVersion
	}
	if input.BarcodeImage != "" {
		product.BarcodeImage = input.BarcodeImage
	}
	if input.Unit != "" {
		product.Unit = input.Unit
	}
	if input.MinStockLevel > 0 {
		product.MinStockLevel = input.MinStockLevel
	}
	if input.ProjectId > 0 {
		product.ProjectId = input.ProjectId
	}
	if input.Description != "" {
		product.Description = input.Description
	}

	var err error
	if input.ProductionDate != "" {
		if product.ProductionDate, err = parseDate(input.ProductionDate); err != nil {
			return merror.NewCode(mcode.CodeValidationFailed, "生产日期格式应为 YYYY-MM-DD")
		}
	}
	if input.Price != "" {
		if product.Price, err = parseDecimal(input.Price); err != nil {
			return err
		}
	}
	if input.CostPrice != "" {
		if product.CostPrice, err = parseDecimal(input.CostPrice); err != nil {
			return err
		}
	}
	if input.Weight != "" {
		if product.Weight, err = parseDecimal(input.Weight); err != nil {
			return err
		}
	}
	if input.Length != "" {
		if product.Length, err = parseDecimal(input.Length); err != nil {
			return err
		}
	}
	if input.Width != "" {
		if product.Width, err = parseDecimal(input.Width); err != nil {
			return err
		}
	}
	if input.Height != "" {
		if product.Height, err = parseDecimal(input.Height); err != nil {
			return err
		}
	}
	return nil
}

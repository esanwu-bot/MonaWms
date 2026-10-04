package master

import (
	"context"
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

// warehouseStatuses 是仓库允许的状态取值。
var warehouseStatuses = []string{statusActive, statusInactive}

func init() {
	service.RegisterWarehouse(NewWarehouse())
}

type sWarehouse struct{}

// NewWarehouse 创建仓库的 service 实现。
func NewWarehouse() service.IWarehouse {
	return &sWarehouse{}
}

// List 分页查询仓库列表，统计信息批量计算以避免 N+1 查询。
func (s *sWarehouse) List(ctx context.Context, input *v1.WarehouseListReq) (output *v1.WarehouseListRes, err error) {
	output = new(v1.WarehouseListRes)

	params := page.Normalize(input.Page, input.Limit)
	cond := dao.WarehouseSearch{
		Code:      input.Code,
		Name:      input.Name,
		Status:    input.Status,
		ManagerId: input.ManagerId,
	}

	list, total, err := dao.NewWarehouseDao(m.DB()).SearchPage(ctx, cond, params.Offset(), params.Limit)
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "查询仓库列表失败")
	}

	warehouseIDs := make([]int, 0, len(list))
	for _, warehouse := range list {
		warehouseIDs = append(warehouseIDs, warehouse.Id)
	}
	counters, err := dao.NewWarehouseDao(m.DB()).StatsBatch(ctx, warehouseIDs)
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "统计仓库信息失败")
	}
	managerNames, err := s.managerNames(ctx, list)
	if err != nil {
		return nil, err
	}

	items := make([]v1.WarehouseItem, 0, len(list))
	for _, warehouse := range list {
		counter := counters[warehouse.Id]
		items = append(items, toWarehouseItem(warehouse, managerNames[warehouse.ManagerId], v1.WarehouseStatistics{
			ZonesCount:     counter.Zones,
			LocationsCount: counter.Locs,
			InventoryCount: counter.Stock,
		}))
	}

	output.List = items
	output.Pagination = buildPagination(total, params.Page, params.Limit, page.Pages(total, params.Limit))
	return output, nil
}

// Detail 查询仓库详情，统计信息为完整口径。
func (s *sWarehouse) Detail(ctx context.Context, input *v1.WarehouseDetailReq) (output *v1.WarehouseDetailRes, err error) {
	item, err := s.item(ctx, input.Id)
	if err != nil {
		return nil, err
	}
	output = new(v1.WarehouseDetailRes)
	output.WarehouseItem = item
	return output, nil
}

// ByCode 按编码查询仓库。
func (s *sWarehouse) ByCode(ctx context.Context, input *v1.WarehouseByCodeReq) (output *v1.WarehouseByCodeRes, err error) {
	warehouse, err := dao.NewWarehouseDao(m.DB()).FindOne(ctx, map[string]any{"code": input.Code})
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "查询仓库失败")
	}
	if warehouse == nil {
		return nil, merror.NewCode(mcode.CodeNotFound, "仓库不存在")
	}
	item, err := s.item(ctx, warehouse.Id)
	if err != nil {
		return nil, err
	}
	output = new(v1.WarehouseByCodeRes)
	output.WarehouseItem = item
	return output, nil
}

// Statistics 查询全部仓库的汇总统计。
func (s *sWarehouse) Statistics(ctx context.Context, _ *v1.WarehouseStatisticsReq) (output *v1.WarehouseStatisticsRes, err error) {
	total, err := dao.CountBy(ctx, m.DB(), &entity.Warehouse{}, map[string]any{})
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "统计仓库失败")
	}
	active, err := dao.CountBy(ctx, m.DB(), &entity.Warehouse{}, map[string]any{"status": statusActive})
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "统计仓库失败")
	}
	zones, err := dao.CountBy(ctx, m.DB(), &entity.Zone{}, map[string]any{})
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "统计库区失败")
	}
	locations, err := dao.CountBy(ctx, m.DB(), &entity.Location{}, map[string]any{})
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "统计库位失败")
	}
	stock, err := dao.NewWarehouseDao(m.DB()).TotalStockQuantity(ctx)
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "统计库存失败")
	}

	output = new(v1.WarehouseStatisticsRes)
	output.Total = total
	output.Active = active
	output.Inactive = total - active
	output.ZonesCount = zones
	output.LocationsCount = locations
	output.InventoryCount = stock
	return output, nil
}

// Options 查询仓库下拉选项（仅启用仓库）。
func (s *sWarehouse) Options(ctx context.Context, _ *v1.WarehouseOptionsReq) (output *v1.WarehouseOptionsRes, err error) {
	list, err := dao.NewWarehouseDao(m.DB()).FindList(ctx, map[string]any{"status": statusActive}, "code ASC")
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "查询仓库选项失败")
	}
	options := make(v1.WarehouseOptionsRes, 0, len(list))
	for _, warehouse := range list {
		options = append(options, buildOption(warehouse.Id, warehouse.Code, warehouse.Name))
	}
	return &options, nil
}

// Create 创建仓库。
func (s *sWarehouse) Create(ctx context.Context, input *v1.WarehouseCreateReq) (output *v1.WarehouseCreateRes, err error) {
	if err := requireWrite(ctx, "warehouse:write"); err != nil {
		return nil, err
	}

	status, err := normalizeStatus(input.Status, statusActive, warehouseStatuses)
	if err != nil {
		return nil, err
	}
	if err := s.assertCodeAvailable(ctx, input.Code, 0); err != nil {
		return nil, err
	}
	if input.ManagerId > 0 {
		if err := s.assertManagerExists(ctx, input.ManagerId); err != nil {
			return nil, err
		}
	}

	now := time.Now()
	warehouse := &entity.Warehouse{
		Code:          input.Code,
		Name:          input.Name,
		Address:       input.Address,
		ManagerId:     input.ManagerId,
		TotalCapacity: input.TotalCapacity,
		Status:        status,
		CreatedAt:     now,
	}
	if err := dao.NewWarehouseDao(m.DB()).Create(ctx, warehouse); err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "创建仓库失败")
	}

	oplog.Write(ctx, oplog.Entry{Action: "create", TargetType: "warehouse", TargetID: warehouse.Id, After: warehouse})

	item, err := s.item(ctx, warehouse.Id)
	if err != nil {
		return nil, err
	}
	output = new(v1.WarehouseCreateRes)
	output.WarehouseItem = item
	return output, nil
}

// Update 更新仓库，未提供（零值）的字段保持不变。
func (s *sWarehouse) Update(ctx context.Context, input *v1.WarehouseUpdateReq) (output *v1.WarehouseUpdateRes, err error) {
	if err := requireWrite(ctx, "warehouse:write"); err != nil {
		return nil, err
	}

	warehouseDao := dao.NewWarehouseDao(m.DB())
	warehouse, err := warehouseDao.GetByID(ctx, input.Id)
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "查询仓库失败")
	}
	if warehouse == nil {
		return nil, merror.NewCode(mcode.CodeNotFound, "仓库不存在")
	}
	before := *warehouse

	if input.Code != "" && input.Code != warehouse.Code {
		if err := s.assertCodeAvailable(ctx, input.Code, warehouse.Id); err != nil {
			return nil, err
		}
		warehouse.Code = input.Code
	}
	if input.Name != "" {
		warehouse.Name = input.Name
	}
	if input.Address != "" {
		warehouse.Address = input.Address
	}
	if input.ManagerId > 0 {
		if err := s.assertManagerExists(ctx, input.ManagerId); err != nil {
			return nil, err
		}
		warehouse.ManagerId = input.ManagerId
	}
	if input.TotalCapacity > 0 {
		warehouse.TotalCapacity = input.TotalCapacity
	}
	if input.Status != "" {
		status, err := normalizeStatus(input.Status, warehouse.Status, warehouseStatuses)
		if err != nil {
			return nil, err
		}
		warehouse.Status = status
	}

	if err := warehouseDao.Update(ctx, warehouse); err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "更新仓库失败")
	}

	oplog.Write(ctx, oplog.Entry{
		Action: "update", TargetType: "warehouse", TargetID: warehouse.Id, Before: before, After: *warehouse,
	})

	item, err := s.item(ctx, warehouse.Id)
	if err != nil {
		return nil, err
	}
	output = new(v1.WarehouseUpdateRes)
	output.WarehouseItem = item
	return output, nil
}

// Delete 删除仓库（软删除）：仍存在库存时禁止删除。
func (s *sWarehouse) Delete(ctx context.Context, input *v1.WarehouseDeleteReq) (output *v1.WarehouseDeleteRes, err error) {
	if err := requireWrite(ctx, "warehouse:write"); err != nil {
		return nil, err
	}

	warehouseDao := dao.NewWarehouseDao(m.DB())
	warehouse, err := warehouseDao.GetByID(ctx, input.Id)
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "查询仓库失败")
	}
	if warehouse == nil {
		return nil, merror.NewCode(mcode.CodeNotFound, "仓库不存在")
	}

	_, stock, err := warehouseDao.CountStock(ctx, warehouse.Id)
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "校验库存失败")
	}
	if stock > 0 {
		return nil, merror.NewCode(mcode.CodeBusinessValidationFailed, "仓库仍存在库存，无法删除")
	}

	// 实体带 DeletedAt，此处为软删除，历史单据仍可追溯。
	if err := warehouseDao.Delete(ctx, warehouse.Id); err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "删除仓库失败")
	}

	oplog.Write(ctx, oplog.Entry{Action: "delete", TargetType: "warehouse", TargetID: warehouse.Id, Before: warehouse})
	return new(v1.WarehouseDeleteRes), nil
}

// item 查询单条仓库并补齐负责人与完整统计。
func (s *sWarehouse) item(ctx context.Context, id int) (v1.WarehouseItem, error) {
	warehouseDao := dao.NewWarehouseDao(m.DB())
	warehouse, err := warehouseDao.GetByID(ctx, id)
	if err != nil {
		return v1.WarehouseItem{}, merror.WrapCode(err, mcode.CodeDbOperationError, "查询仓库失败")
	}
	if warehouse == nil {
		return v1.WarehouseItem{}, merror.NewCode(mcode.CodeNotFound, "仓库不存在")
	}

	counters, err := warehouseDao.CountStructure(ctx, warehouse.Id)
	if err != nil {
		return v1.WarehouseItem{}, merror.WrapCode(err, mcode.CodeDbOperationError, "统计仓库结构失败")
	}
	products, stock, err := warehouseDao.CountStock(ctx, warehouse.Id)
	if err != nil {
		return v1.WarehouseItem{}, merror.WrapCode(err, mcode.CodeDbOperationError, "统计仓库库存失败")
	}
	inbound, err := dao.CountBy(ctx, m.DB(), &entity.InboundOrder{}, map[string]any{"warehouse_id": warehouse.Id})
	if err != nil {
		return v1.WarehouseItem{}, merror.WrapCode(err, mcode.CodeDbOperationError, "统计入库单失败")
	}
	outbound, err := dao.CountBy(ctx, m.DB(), &entity.OutboundOrder{}, map[string]any{"warehouse_id": warehouse.Id})
	if err != nil {
		return v1.WarehouseItem{}, merror.WrapCode(err, mcode.CodeDbOperationError, "统计出库单失败")
	}

	managerName := ""
	if warehouse.ManagerId > 0 {
		manager, err := dao.NewUserDao(m.DB()).GetByID(ctx, warehouse.ManagerId)
		if err != nil {
			return v1.WarehouseItem{}, merror.WrapCode(err, mcode.CodeDbOperationError, "查询负责人失败")
		}
		if manager != nil {
			managerName = manager.Username
		}
	}

	return toWarehouseItem(warehouse, managerName, v1.WarehouseStatistics{
		ZonesCount:          counters.Zones,
		ShelvesCount:        counters.Shelves,
		LocationsCount:      counters.Locs,
		ProductsCount:       products,
		InventoryCount:      stock,
		InboundOrdersCount:  inbound,
		OutboundOrdersCount: outbound,
	}), nil
}

// managerNames 批量取负责人名称。
func (s *sWarehouse) managerNames(ctx context.Context, list []*entity.Warehouse) (map[int]string, error) {
	names := make(map[int]string)
	if len(list) == 0 {
		return names, nil
	}

	managerIDs := make([]int, 0, len(list))
	for _, warehouse := range list {
		if warehouse.ManagerId > 0 {
			managerIDs = append(managerIDs, warehouse.ManagerId)
		}
	}
	if len(managerIDs) == 0 {
		return names, nil
	}

	users, err := dao.NewUserDao(m.DB()).FindList(ctx, map[string]any{"id": managerIDs})
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "查询负责人失败")
	}
	for _, user := range users {
		names[user.Id] = user.Username
	}
	return names, nil
}

// assertCodeAvailable 校验仓库编码未被占用（excludeID 为当前记录 ID）。
func (s *sWarehouse) assertCodeAvailable(ctx context.Context, code string, excludeID int) error {
	exist, err := dao.NewWarehouseDao(m.DB()).FindOne(ctx, map[string]any{"code": code})
	if err != nil {
		return merror.WrapCode(err, mcode.CodeDbOperationError, "校验仓库编码失败")
	}
	if exist != nil && exist.Id != excludeID {
		return merror.NewCode(mcode.CodeBusinessValidationFailed, "仓库编码已存在")
	}
	return nil
}

// assertManagerExists 校验负责人账号存在。
func (s *sWarehouse) assertManagerExists(ctx context.Context, managerID int) error {
	manager, err := dao.NewUserDao(m.DB()).GetByID(ctx, managerID)
	if err != nil {
		return merror.WrapCode(err, mcode.CodeDbOperationError, "查询负责人失败")
	}
	if manager == nil {
		return merror.NewCode(mcode.CodeValidationFailed, "指定的管理员不存在")
	}
	return nil
}

// toWarehouseItem 把仓库实体转换为响应结构。
func toWarehouseItem(warehouse *entity.Warehouse, managerName string, statistics v1.WarehouseStatistics) v1.WarehouseItem {
	return v1.WarehouseItem{
		Id:            warehouse.Id,
		Code:          warehouse.Code,
		Name:          warehouse.Name,
		Address:       warehouse.Address,
		ManagerId:     warehouse.ManagerId,
		ManagerName:   managerName,
		TotalCapacity: warehouse.TotalCapacity,
		Status:        warehouse.Status,
		StatusText:    activeStatusText(warehouse.Status),
		Statistics:    statistics,
		CreatedAt:     formatTime(warehouse.CreatedAt),
	}
}

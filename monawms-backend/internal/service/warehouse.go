package service

import (
	"context"

	"github.com/esanwu-bot/monawms-backend/api/master/v1"
)

// IWarehouse 是仓库的服务接口。
type IWarehouse interface {
	// List 分页查询仓库列表。
	List(ctx context.Context, req *v1.WarehouseListReq) (res *v1.WarehouseListRes, err error)
	// Detail 查询仓库详情。
	Detail(ctx context.Context, req *v1.WarehouseDetailReq) (res *v1.WarehouseDetailRes, err error)
	// ByCode 按编码查询仓库。
	ByCode(ctx context.Context, req *v1.WarehouseByCodeReq) (res *v1.WarehouseByCodeRes, err error)
	// Statistics 查询全部仓库的汇总统计。
	Statistics(ctx context.Context, req *v1.WarehouseStatisticsReq) (res *v1.WarehouseStatisticsRes, err error)
	// Options 查询仓库下拉选项。
	Options(ctx context.Context, req *v1.WarehouseOptionsReq) (res *v1.WarehouseOptionsRes, err error)
	// Create 创建仓库。
	Create(ctx context.Context, req *v1.WarehouseCreateReq) (res *v1.WarehouseCreateRes, err error)
	// Update 更新仓库。
	Update(ctx context.Context, req *v1.WarehouseUpdateReq) (res *v1.WarehouseUpdateRes, err error)
	// Delete 删除仓库，存在库存或单据统计时仅做软删除。
	Delete(ctx context.Context, req *v1.WarehouseDeleteReq) (res *v1.WarehouseDeleteRes, err error)
}

var localWarehouse IWarehouse

// Warehouse 返回 IWarehouse 已注册的实现。
// 若未注册任何实现则会 panic。
func Warehouse() IWarehouse {
	if localWarehouse == nil {
		panic("implement not found for interface IWarehouse, forgot register?")
	}
	return localWarehouse
}

// RegisterWarehouse 为 IWarehouse 接口注册实现。
func RegisterWarehouse(i IWarehouse) {
	localWarehouse = i
}

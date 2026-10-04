// =================================================================================
// 代码由 Maltose 工具生成并维护，可按需自行修改。
// =================================================================================
package warehouse

import (
	"context"

	"github.com/esanwu-bot/monawms-backend/api/master/v1"
	"github.com/esanwu-bot/monawms-backend/internal/service"
)

// List 是 List API 的处理函数。
func (c *WarehouseV1) List(ctx context.Context, req *v1.WarehouseListReq) (res *v1.WarehouseListRes, err error) {
	return service.Warehouse().List(ctx, req)
}

// Detail 是 Detail API 的处理函数。
func (c *WarehouseV1) Detail(ctx context.Context, req *v1.WarehouseDetailReq) (res *v1.WarehouseDetailRes, err error) {
	return service.Warehouse().Detail(ctx, req)
}

// ByCode 是 ByCode API 的处理函数。
func (c *WarehouseV1) ByCode(ctx context.Context, req *v1.WarehouseByCodeReq) (res *v1.WarehouseByCodeRes, err error) {
	return service.Warehouse().ByCode(ctx, req)
}

// Statistics 是 Statistics API 的处理函数。
func (c *WarehouseV1) Statistics(ctx context.Context, req *v1.WarehouseStatisticsReq) (res *v1.WarehouseStatisticsRes, err error) {
	return service.Warehouse().Statistics(ctx, req)
}

// Options 是 Options API 的处理函数。
func (c *WarehouseV1) Options(ctx context.Context, req *v1.WarehouseOptionsReq) (res *v1.WarehouseOptionsRes, err error) {
	return service.Warehouse().Options(ctx, req)
}

// Create 是 Create API 的处理函数。
func (c *WarehouseV1) Create(ctx context.Context, req *v1.WarehouseCreateReq) (res *v1.WarehouseCreateRes, err error) {
	return service.Warehouse().Create(ctx, req)
}

// Update 是 Update API 的处理函数。
func (c *WarehouseV1) Update(ctx context.Context, req *v1.WarehouseUpdateReq) (res *v1.WarehouseUpdateRes, err error) {
	return service.Warehouse().Update(ctx, req)
}

// Delete 是 Delete API 的处理函数。
func (c *WarehouseV1) Delete(ctx context.Context, req *v1.WarehouseDeleteReq) (res *v1.WarehouseDeleteRes, err error) {
	return service.Warehouse().Delete(ctx, req)
}

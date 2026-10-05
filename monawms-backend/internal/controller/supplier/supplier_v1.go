// =================================================================================
// 代码由 Maltose 工具生成并维护，可按需自行修改。
// =================================================================================
package supplier

import (
	"context"

	"github.com/esanwu-bot/monawms-backend/api/master/v1"
	"github.com/esanwu-bot/monawms-backend/internal/service"
)

// List 是 List API 的处理函数。
func (c *SupplierV1) List(ctx context.Context, req *v1.SupplierListReq) (res *v1.SupplierListRes, err error) {
	return service.Supplier().List(ctx, req)
}

// Detail 是 Detail API 的处理函数。
func (c *SupplierV1) Detail(ctx context.Context, req *v1.SupplierDetailReq) (res *v1.SupplierDetailRes, err error) {
	return service.Supplier().Detail(ctx, req)
}

// Options 是 Options API 的处理函数。
func (c *SupplierV1) Options(ctx context.Context, req *v1.SupplierOptionsReq) (res *v1.SupplierOptionsRes, err error) {
	return service.Supplier().Options(ctx, req)
}

// Create 是 Create API 的处理函数。
func (c *SupplierV1) Create(ctx context.Context, req *v1.SupplierCreateReq) (res *v1.SupplierCreateRes, err error) {
	return service.Supplier().Create(ctx, req)
}

// Update 是 Update API 的处理函数。
func (c *SupplierV1) Update(ctx context.Context, req *v1.SupplierUpdateReq) (res *v1.SupplierUpdateRes, err error) {
	return service.Supplier().Update(ctx, req)
}

// Delete 是 Delete API 的处理函数。
func (c *SupplierV1) Delete(ctx context.Context, req *v1.SupplierDeleteReq) (res *v1.SupplierDeleteRes, err error) {
	return service.Supplier().Delete(ctx, req)
}

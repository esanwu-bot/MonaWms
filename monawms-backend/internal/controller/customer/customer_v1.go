// =================================================================================
// 代码由 Maltose 工具生成并维护，可按需自行修改。
// =================================================================================
package customer

import (
	"context"

	"github.com/esanwu-bot/monawms-backend/api/master/v1"
	"github.com/esanwu-bot/monawms-backend/internal/service"
)

// List 是 List API 的处理函数。
func (c *CustomerV1) List(ctx context.Context, req *v1.CustomerListReq) (res *v1.CustomerListRes, err error) {
	return service.Customer().List(ctx, req)
}

// Detail 是 Detail API 的处理函数。
func (c *CustomerV1) Detail(ctx context.Context, req *v1.CustomerDetailReq) (res *v1.CustomerDetailRes, err error) {
	return service.Customer().Detail(ctx, req)
}

// Options 是 Options API 的处理函数。
func (c *CustomerV1) Options(ctx context.Context, req *v1.CustomerOptionsReq) (res *v1.CustomerOptionsRes, err error) {
	return service.Customer().Options(ctx, req)
}

// Create 是 Create API 的处理函数。
func (c *CustomerV1) Create(ctx context.Context, req *v1.CustomerCreateReq) (res *v1.CustomerCreateRes, err error) {
	return service.Customer().Create(ctx, req)
}

// Update 是 Update API 的处理函数。
func (c *CustomerV1) Update(ctx context.Context, req *v1.CustomerUpdateReq) (res *v1.CustomerUpdateRes, err error) {
	return service.Customer().Update(ctx, req)
}

// Delete 是 Delete API 的处理函数。
func (c *CustomerV1) Delete(ctx context.Context, req *v1.CustomerDeleteReq) (res *v1.CustomerDeleteRes, err error) {
	return service.Customer().Delete(ctx, req)
}

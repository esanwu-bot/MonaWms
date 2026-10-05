// =================================================================================
// 代码由 Maltose 工具生成并维护，可按需自行修改。
// =================================================================================
package category

import (
	"context"

	"github.com/esanwu-bot/monawms-backend/api/master/v1"
	"github.com/esanwu-bot/monawms-backend/internal/service"
)

// List 是 List API 的处理函数。
func (c *CategoryV1) List(ctx context.Context, req *v1.CategoryListReq) (res *v1.CategoryListRes, err error) {
	return service.Category().List(ctx, req)
}

// Tree 是 Tree API 的处理函数。
func (c *CategoryV1) Tree(ctx context.Context, req *v1.CategoryTreeReq) (res *v1.CategoryTreeRes, err error) {
	return service.Category().Tree(ctx, req)
}

// Detail 是 Detail API 的处理函数。
func (c *CategoryV1) Detail(ctx context.Context, req *v1.CategoryDetailReq) (res *v1.CategoryDetailRes, err error) {
	return service.Category().Detail(ctx, req)
}

// Statistics 是 Statistics API 的处理函数。
func (c *CategoryV1) Statistics(ctx context.Context, req *v1.CategoryStatisticsReq) (res *v1.CategoryStatisticsRes, err error) {
	return service.Category().Statistics(ctx, req)
}

// Options 是 Options API 的处理函数。
func (c *CategoryV1) Options(ctx context.Context, req *v1.CategoryOptionsReq) (res *v1.CategoryOptionsRes, err error) {
	return service.Category().Options(ctx, req)
}

// Create 是 Create API 的处理函数。
func (c *CategoryV1) Create(ctx context.Context, req *v1.CategoryCreateReq) (res *v1.CategoryCreateRes, err error) {
	return service.Category().Create(ctx, req)
}

// Update 是 Update API 的处理函数。
func (c *CategoryV1) Update(ctx context.Context, req *v1.CategoryUpdateReq) (res *v1.CategoryUpdateRes, err error) {
	return service.Category().Update(ctx, req)
}

// Delete 是 Delete API 的处理函数。
func (c *CategoryV1) Delete(ctx context.Context, req *v1.CategoryDeleteReq) (res *v1.CategoryDeleteRes, err error) {
	return service.Category().Delete(ctx, req)
}

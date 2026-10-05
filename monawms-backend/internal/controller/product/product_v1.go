// =================================================================================
// 代码由 Maltose 工具生成并维护，可按需自行修改。
// =================================================================================
package product

import (
	"context"

	"github.com/esanwu-bot/monawms-backend/api/master/v1"
	"github.com/esanwu-bot/monawms-backend/internal/service"
)

// List 是 List API 的处理函数。
func (c *ProductV1) List(ctx context.Context, req *v1.ProductListReq) (res *v1.ProductListRes, err error) {
	return service.Product().List(ctx, req)
}

// Detail 是 Detail API 的处理函数。
func (c *ProductV1) Detail(ctx context.Context, req *v1.ProductDetailReq) (res *v1.ProductDetailRes, err error) {
	return service.Product().Detail(ctx, req)
}

// FindBySku 是 FindBySku API 的处理函数。
func (c *ProductV1) FindBySku(ctx context.Context, req *v1.ProductFindBySkuReq) (res *v1.ProductFindBySkuRes, err error) {
	return service.Product().FindBySku(ctx, req)
}

// FindByBarcode 是 FindByBarcode API 的处理函数。
func (c *ProductV1) FindByBarcode(ctx context.Context, req *v1.ProductFindByBarcodeReq) (res *v1.ProductFindByBarcodeRes, err error) {
	return service.Product().FindByBarcode(ctx, req)
}

// Statistics 是 Statistics API 的处理函数。
func (c *ProductV1) Statistics(ctx context.Context, req *v1.ProductStatisticsReq) (res *v1.ProductStatisticsRes, err error) {
	return service.Product().Statistics(ctx, req)
}

// Options 是 Options API 的处理函数。
func (c *ProductV1) Options(ctx context.Context, req *v1.ProductOptionsReq) (res *v1.ProductOptionsRes, err error) {
	return service.Product().Options(ctx, req)
}

// Create 是 Create API 的处理函数。
func (c *ProductV1) Create(ctx context.Context, req *v1.ProductCreateReq) (res *v1.ProductCreateRes, err error) {
	return service.Product().Create(ctx, req)
}

// Update 是 Update API 的处理函数。
func (c *ProductV1) Update(ctx context.Context, req *v1.ProductUpdateReq) (res *v1.ProductUpdateRes, err error) {
	return service.Product().Update(ctx, req)
}

// Delete 是 Delete API 的处理函数。
func (c *ProductV1) Delete(ctx context.Context, req *v1.ProductDeleteReq) (res *v1.ProductDeleteRes, err error) {
	return service.Product().Delete(ctx, req)
}

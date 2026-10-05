package service

import (
	"context"

	"github.com/esanwu-bot/monawms-backend/api/master/v1"
)

// IProduct 是物资主数据的服务接口。
type IProduct interface {
	// List 分页查询物资列表。
	List(ctx context.Context, req *v1.ProductListReq) (res *v1.ProductListRes, err error)
	// Detail 查询物资详情。
	Detail(ctx context.Context, req *v1.ProductDetailReq) (res *v1.ProductDetailRes, err error)
	// FindBySku 按 SKU 查询物资。
	FindBySku(ctx context.Context, req *v1.ProductFindBySkuReq) (res *v1.ProductFindBySkuRes, err error)
	// FindByBarcode 按条码查询物资。
	FindByBarcode(ctx context.Context, req *v1.ProductFindByBarcodeReq) (res *v1.ProductFindByBarcodeRes, err error)
	// Statistics 查询物资统计信息。
	Statistics(ctx context.Context, req *v1.ProductStatisticsReq) (res *v1.ProductStatisticsRes, err error)
	// Options 查询物资下拉选项。
	Options(ctx context.Context, req *v1.ProductOptionsReq) (res *v1.ProductOptionsRes, err error)
	// Create 创建物资。
	Create(ctx context.Context, req *v1.ProductCreateReq) (res *v1.ProductCreateRes, err error)
	// Update 更新物资。
	Update(ctx context.Context, req *v1.ProductUpdateReq) (res *v1.ProductUpdateRes, err error)
	// Delete 删除物资，存在库存或单据时禁止删除。
	Delete(ctx context.Context, req *v1.ProductDeleteReq) (res *v1.ProductDeleteRes, err error)
}

var localProduct IProduct

// Product 返回 IProduct 已注册的实现。
// 若未注册任何实现则会 panic。
func Product() IProduct {
	if localProduct == nil {
		panic("implement not found for interface IProduct, forgot register?")
	}
	return localProduct
}

// RegisterProduct 为 IProduct 接口注册实现。
func RegisterProduct(i IProduct) {
	localProduct = i
}

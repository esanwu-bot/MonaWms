package service

import (
	"context"

	"github.com/esanwu-bot/monawms-backend/api/master/v1"
)

// ICategory 是物资分类的服务接口。
type ICategory interface {
	// List 分页查询分类列表。
	List(ctx context.Context, req *v1.CategoryListReq) (res *v1.CategoryListRes, err error)
	// Tree 查询分类树。
	Tree(ctx context.Context, req *v1.CategoryTreeReq) (res *v1.CategoryTreeRes, err error)
	// Detail 查询分类详情。
	Detail(ctx context.Context, req *v1.CategoryDetailReq) (res *v1.CategoryDetailRes, err error)
	// Statistics 查询分类统计信息。
	Statistics(ctx context.Context, req *v1.CategoryStatisticsReq) (res *v1.CategoryStatisticsRes, err error)
	// Options 查询分类下拉选项。
	Options(ctx context.Context, req *v1.CategoryOptionsReq) (res *v1.CategoryOptionsRes, err error)
	// Create 创建分类。
	Create(ctx context.Context, req *v1.CategoryCreateReq) (res *v1.CategoryCreateRes, err error)
	// Update 更新分类。
	Update(ctx context.Context, req *v1.CategoryUpdateReq) (res *v1.CategoryUpdateRes, err error)
	// Delete 删除分类，存在子分类或已挂物资时禁止删除。
	Delete(ctx context.Context, req *v1.CategoryDeleteReq) (res *v1.CategoryDeleteRes, err error)
}

var localCategory ICategory

// Category 返回 ICategory 已注册的实现。
// 若未注册任何实现则会 panic。
func Category() ICategory {
	if localCategory == nil {
		panic("implement not found for interface ICategory, forgot register?")
	}
	return localCategory
}

// RegisterCategory 为 ICategory 接口注册实现。
func RegisterCategory(i ICategory) {
	localCategory = i
}

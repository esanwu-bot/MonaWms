// =================================================================================
// 代码由 Maltose 工具生成并维护，可按需自行修改。
// =================================================================================
package dictionary

import (
	"context"

	"github.com/esanwu-bot/monawms-backend/api/master/v1"
	"github.com/esanwu-bot/monawms-backend/internal/service"
)

// Types 是 Types API 的处理函数。
func (c *DictionaryV1) Types(ctx context.Context, req *v1.DictionaryTypeListReq) (res *v1.DictionaryTypeListRes, err error) {
	return service.Dictionary().Types(ctx, req)
}

// CreateType 是 CreateType API 的处理函数。
func (c *DictionaryV1) CreateType(ctx context.Context, req *v1.DictionaryTypeCreateReq) (res *v1.DictionaryTypeCreateRes, err error) {
	return service.Dictionary().CreateType(ctx, req)
}

// UpdateType 是 UpdateType API 的处理函数。
func (c *DictionaryV1) UpdateType(ctx context.Context, req *v1.DictionaryTypeUpdateReq) (res *v1.DictionaryTypeUpdateRes, err error) {
	return service.Dictionary().UpdateType(ctx, req)
}

// DeleteType 是 DeleteType API 的处理函数。
func (c *DictionaryV1) DeleteType(ctx context.Context, req *v1.DictionaryTypeDeleteReq) (res *v1.DictionaryTypeDeleteRes, err error) {
	return service.Dictionary().DeleteType(ctx, req)
}

// ItemsByType 是 ItemsByType API 的处理函数。
func (c *DictionaryV1) ItemsByType(ctx context.Context, req *v1.DictionaryItemByTypeReq) (res *v1.DictionaryItemListRes, err error) {
	return service.Dictionary().ItemsByType(ctx, req)
}

// ItemsByTypeCode 是 ItemsByTypeCode API 的处理函数。
func (c *DictionaryV1) ItemsByTypeCode(ctx context.Context, req *v1.DictionaryItemByCodeReq) (res *v1.DictionaryItemListRes, err error) {
	return service.Dictionary().ItemsByTypeCode(ctx, req)
}

// ItemDetail 是 ItemDetail API 的处理函数。
func (c *DictionaryV1) ItemDetail(ctx context.Context, req *v1.DictionaryItemDetailReq) (res *v1.DictionaryItemDetailRes, err error) {
	return service.Dictionary().ItemDetail(ctx, req)
}

// CreateItem 是 CreateItem API 的处理函数。
func (c *DictionaryV1) CreateItem(ctx context.Context, req *v1.DictionaryItemCreateReq) (res *v1.DictionaryItemCreateRes, err error) {
	return service.Dictionary().CreateItem(ctx, req)
}

// UpdateItem 是 UpdateItem API 的处理函数。
func (c *DictionaryV1) UpdateItem(ctx context.Context, req *v1.DictionaryItemUpdateReq) (res *v1.DictionaryItemUpdateRes, err error) {
	return service.Dictionary().UpdateItem(ctx, req)
}

// DeleteItem 是 DeleteItem API 的处理函数。
func (c *DictionaryV1) DeleteItem(ctx context.Context, req *v1.DictionaryItemDeleteReq) (res *v1.DictionaryItemDeleteRes, err error) {
	return service.Dictionary().DeleteItem(ctx, req)
}

package service

import (
	"context"

	"github.com/esanwu-bot/monawms-backend/api/master/v1"
)

// IDictionary 是数据字典的服务接口。
type IDictionary interface {
	// Types 查询字典类型列表。
	Types(ctx context.Context, req *v1.DictionaryTypeListReq) (res *v1.DictionaryTypeListRes, err error)
	// CreateType 创建字典类型。
	CreateType(ctx context.Context, req *v1.DictionaryTypeCreateReq) (res *v1.DictionaryTypeCreateRes, err error)
	// UpdateType 更新字典类型。
	UpdateType(ctx context.Context, req *v1.DictionaryTypeUpdateReq) (res *v1.DictionaryTypeUpdateRes, err error)
	// DeleteType 删除字典类型，存在字典项时禁止删除。
	DeleteType(ctx context.Context, req *v1.DictionaryTypeDeleteReq) (res *v1.DictionaryTypeDeleteRes, err error)
	// ItemsByType 按类型 ID 查询字典项。
	ItemsByType(ctx context.Context, req *v1.DictionaryItemByTypeReq) (res *v1.DictionaryItemListRes, err error)
	// ItemsByTypeCode 按类型编码查询字典项。
	ItemsByTypeCode(ctx context.Context, req *v1.DictionaryItemByCodeReq) (res *v1.DictionaryItemListRes, err error)
	// ItemDetail 查询字典项详情。
	ItemDetail(ctx context.Context, req *v1.DictionaryItemDetailReq) (res *v1.DictionaryItemDetailRes, err error)
	// CreateItem 创建字典项。
	CreateItem(ctx context.Context, req *v1.DictionaryItemCreateReq) (res *v1.DictionaryItemCreateRes, err error)
	// UpdateItem 更新字典项。
	UpdateItem(ctx context.Context, req *v1.DictionaryItemUpdateReq) (res *v1.DictionaryItemUpdateRes, err error)
	// DeleteItem 删除字典项。
	DeleteItem(ctx context.Context, req *v1.DictionaryItemDeleteReq) (res *v1.DictionaryItemDeleteRes, err error)
}

var localDictionary IDictionary

// Dictionary 返回 IDictionary 已注册的实现。
// 若未注册任何实现则会 panic。
func Dictionary() IDictionary {
	if localDictionary == nil {
		panic("implement not found for interface IDictionary, forgot register?")
	}
	return localDictionary
}

// RegisterDictionary 为 IDictionary 接口注册实现。
func RegisterDictionary(i IDictionary) {
	localDictionary = i
}

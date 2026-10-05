package service

import (
	"context"

	"github.com/esanwu-bot/monawms-backend/api/master/v1"
)

// ISupplier 是供应商的服务接口。
type ISupplier interface {
	// List 分页查询供应商列表。
	List(ctx context.Context, req *v1.SupplierListReq) (res *v1.SupplierListRes, err error)
	// Detail 查询供应商详情。
	Detail(ctx context.Context, req *v1.SupplierDetailReq) (res *v1.SupplierDetailRes, err error)
	// Options 查询供应商下拉选项。
	Options(ctx context.Context, req *v1.SupplierOptionsReq) (res *v1.SupplierOptionsRes, err error)
	// Create 创建供应商。
	Create(ctx context.Context, req *v1.SupplierCreateReq) (res *v1.SupplierCreateRes, err error)
	// Update 更新供应商。
	Update(ctx context.Context, req *v1.SupplierUpdateReq) (res *v1.SupplierUpdateRes, err error)
	// Delete 删除供应商。
	Delete(ctx context.Context, req *v1.SupplierDeleteReq) (res *v1.SupplierDeleteRes, err error)
}

var localSupplier ISupplier

// Supplier 返回 ISupplier 已注册的实现。
// 若未注册任何实现则会 panic。
func Supplier() ISupplier {
	if localSupplier == nil {
		panic("implement not found for interface ISupplier, forgot register?")
	}
	return localSupplier
}

// RegisterSupplier 为 ISupplier 接口注册实现。
func RegisterSupplier(i ISupplier) {
	localSupplier = i
}

// ICustomer 是客户的服务接口。
type ICustomer interface {
	// List 分页查询客户列表。
	List(ctx context.Context, req *v1.CustomerListReq) (res *v1.CustomerListRes, err error)
	// Detail 查询客户详情。
	Detail(ctx context.Context, req *v1.CustomerDetailReq) (res *v1.CustomerDetailRes, err error)
	// Options 查询客户下拉选项。
	Options(ctx context.Context, req *v1.CustomerOptionsReq) (res *v1.CustomerOptionsRes, err error)
	// Create 创建客户。
	Create(ctx context.Context, req *v1.CustomerCreateReq) (res *v1.CustomerCreateRes, err error)
	// Update 更新客户。
	Update(ctx context.Context, req *v1.CustomerUpdateReq) (res *v1.CustomerUpdateRes, err error)
	// Delete 删除客户。
	Delete(ctx context.Context, req *v1.CustomerDeleteReq) (res *v1.CustomerDeleteRes, err error)
}

var localCustomer ICustomer

// Customer 返回 ICustomer 已注册的实现。
// 若未注册任何实现则会 panic。
func Customer() ICustomer {
	if localCustomer == nil {
		panic("implement not found for interface ICustomer, forgot register?")
	}
	return localCustomer
}

// RegisterCustomer 为 ICustomer 接口注册实现。
func RegisterCustomer(i ICustomer) {
	localCustomer = i
}

package master

import (
	"context"
	"time"

	"github.com/esanwu-bot/monawms-backend/api/master/v1"
	"github.com/esanwu-bot/monawms-backend/internal/dao"
	"github.com/esanwu-bot/monawms-backend/internal/model/entity"
	"github.com/esanwu-bot/monawms-backend/internal/pkg/oplog"
	"github.com/esanwu-bot/monawms-backend/internal/pkg/page"
	"github.com/esanwu-bot/monawms-backend/internal/service"
	"github.com/graingo/maltose/errors/mcode"
	"github.com/graingo/maltose/errors/merror"
	"github.com/graingo/maltose/frame/m"
)

// partnerStatuses 是供应商/客户允许的状态取值。
var partnerStatuses = []string{statusActive, statusInactive}

func init() {
	service.RegisterSupplier(NewSupplier())
	service.RegisterCustomer(NewCustomer())
}

type sSupplier struct{}

// NewSupplier 创建供应商的 service 实现。
func NewSupplier() service.ISupplier {
	return &sSupplier{}
}

// List 分页查询供应商列表。
func (s *sSupplier) List(ctx context.Context, input *v1.SupplierListReq) (output *v1.SupplierListRes, err error) {
	output = new(v1.SupplierListRes)

	params := page.Normalize(input.Page, input.Limit)
	cond := dao.PartnerSearch{
		Name:          input.Name,
		Code:          input.Code,
		ContactPerson: input.ContactPerson,
		Status:        input.Status,
	}
	list, total, err := dao.NewSupplierDao(m.DB()).SearchPage(ctx, cond, params.Offset(), params.Limit)
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "查询供应商列表失败")
	}

	items := make([]v1.SupplierItem, 0, len(list))
	for _, supplier := range list {
		items = append(items, toSupplierItem(supplier))
	}

	output.List = items
	output.Pagination = buildPagination(total, params.Page, params.Limit, page.Pages(total, params.Limit))
	return output, nil
}

// Detail 查询供应商详情。
func (s *sSupplier) Detail(ctx context.Context, input *v1.SupplierDetailReq) (output *v1.SupplierDetailRes, err error) {
	supplier, err := dao.NewSupplierDao(m.DB()).GetByID(ctx, input.Id)
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "查询供应商失败")
	}
	if supplier == nil {
		return nil, merror.NewCode(mcode.CodeNotFound, "供应商不存在")
	}
	output = new(v1.SupplierDetailRes)
	output.SupplierItem = toSupplierItem(supplier)
	return output, nil
}

// Options 查询供应商下拉选项。
func (s *sSupplier) Options(ctx context.Context, _ *v1.SupplierOptionsReq) (output *v1.SupplierOptionsRes, err error) {
	list, err := dao.NewSupplierDao(m.DB()).FindList(ctx, map[string]any{"status": statusActive}, "name ASC")
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "查询供应商选项失败")
	}
	options := make(v1.SupplierOptionsRes, 0, len(list))
	for _, supplier := range list {
		options = append(options, buildOption(supplier.Id, supplier.Code, supplier.Name))
	}
	return &options, nil
}

// Create 创建供应商。
func (s *sSupplier) Create(ctx context.Context, input *v1.SupplierCreateReq) (output *v1.SupplierCreateRes, err error) {
	if err := requireWrite(ctx, "supplier:write"); err != nil {
		return nil, err
	}

	status, err := normalizeStatus(input.Status, statusActive, partnerStatuses)
	if err != nil {
		return nil, err
	}
	supplierDao := dao.NewSupplierDao(m.DB())
	if err := s.assertSupplierCodeAvailable(ctx, supplierDao, input.Code, 0); err != nil {
		return nil, err
	}

	now := time.Now()
	supplier := &entity.Supplier{
		Code:          input.Code,
		Name:          input.Name,
		ContactPerson: input.ContactPerson,
		Phone:         input.Phone,
		Email:         input.Email,
		Address:       input.Address,
		Status:        status,
		CreatedAt:     now,
		UpdatedAt:     now,
	}
	if err := supplierDao.Create(ctx, supplier); err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "创建供应商失败")
	}

	oplog.Write(ctx, oplog.Entry{Action: "create", TargetType: "supplier", TargetID: supplier.Id, After: supplier})

	output = new(v1.SupplierCreateRes)
	output.SupplierItem = toSupplierItem(supplier)
	return output, nil
}

// Update 更新供应商。
func (s *sSupplier) Update(ctx context.Context, input *v1.SupplierUpdateReq) (output *v1.SupplierUpdateRes, err error) {
	if err := requireWrite(ctx, "supplier:write"); err != nil {
		return nil, err
	}

	supplierDao := dao.NewSupplierDao(m.DB())
	supplier, err := supplierDao.GetByID(ctx, input.Id)
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "查询供应商失败")
	}
	if supplier == nil {
		return nil, merror.NewCode(mcode.CodeNotFound, "供应商不存在")
	}
	before := *supplier

	if input.Code != "" && input.Code != supplier.Code {
		if err := s.assertSupplierCodeAvailable(ctx, supplierDao, input.Code, supplier.Id); err != nil {
			return nil, err
		}
		supplier.Code = input.Code
	}
	if input.Name != "" {
		supplier.Name = input.Name
	}
	if input.ContactPerson != "" {
		supplier.ContactPerson = input.ContactPerson
	}
	if input.Phone != "" {
		supplier.Phone = input.Phone
	}
	if input.Email != "" {
		supplier.Email = input.Email
	}
	if input.Address != "" {
		supplier.Address = input.Address
	}
	if input.Status != "" {
		status, err := normalizeStatus(input.Status, supplier.Status, partnerStatuses)
		if err != nil {
			return nil, err
		}
		supplier.Status = status
	}

	supplier.UpdatedAt = time.Now()
	if err := supplierDao.Update(ctx, supplier); err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "更新供应商失败")
	}

	oplog.Write(ctx, oplog.Entry{
		Action: "update", TargetType: "supplier", TargetID: supplier.Id, Before: before, After: *supplier,
	})

	output = new(v1.SupplierUpdateRes)
	output.SupplierItem = toSupplierItem(supplier)
	return output, nil
}

// Delete 删除供应商。
func (s *sSupplier) Delete(ctx context.Context, input *v1.SupplierDeleteReq) (output *v1.SupplierDeleteRes, err error) {
	if err := requireWrite(ctx, "supplier:write"); err != nil {
		return nil, err
	}

	supplierDao := dao.NewSupplierDao(m.DB())
	supplier, err := supplierDao.GetByID(ctx, input.Id)
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "查询供应商失败")
	}
	if supplier == nil {
		return nil, merror.NewCode(mcode.CodeNotFound, "供应商不存在")
	}

	if err := supplierDao.Delete(ctx, supplier.Id); err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "删除供应商失败")
	}

	oplog.Write(ctx, oplog.Entry{Action: "delete", TargetType: "supplier", TargetID: supplier.Id, Before: supplier})
	return new(v1.SupplierDeleteRes), nil
}

// assertSupplierCodeAvailable 校验供应商编码未被占用。
func (s *sSupplier) assertSupplierCodeAvailable(ctx context.Context, supplierDao *dao.SupplierDao, code string, excludeID int) error {
	exist, err := supplierDao.FindOne(ctx, map[string]any{"code": code})
	if err != nil {
		return merror.WrapCode(err, mcode.CodeDbOperationError, "校验供应商编码失败")
	}
	if exist != nil && exist.Id != excludeID {
		return merror.NewCode(mcode.CodeBusinessValidationFailed, "供应商编码已存在")
	}
	return nil
}

// toSupplierItem 转换供应商实体。
func toSupplierItem(supplier *entity.Supplier) v1.SupplierItem {
	return v1.SupplierItem{
		Id:            supplier.Id,
		Code:          supplier.Code,
		Name:          supplier.Name,
		ContactPerson: supplier.ContactPerson,
		Phone:         supplier.Phone,
		Email:         supplier.Email,
		Address:       supplier.Address,
		Status:        supplier.Status,
		StatusText:    activeStatusText(supplier.Status),
		CreatedAt:     formatTime(supplier.CreatedAt),
		UpdatedAt:     formatTime(supplier.UpdatedAt),
	}
}

type sCustomer struct{}

// NewCustomer 创建客户的 service 实现。
func NewCustomer() service.ICustomer {
	return &sCustomer{}
}

// List 分页查询客户列表。
func (s *sCustomer) List(ctx context.Context, input *v1.CustomerListReq) (output *v1.CustomerListRes, err error) {
	output = new(v1.CustomerListRes)

	params := page.Normalize(input.Page, input.Limit)
	cond := dao.PartnerSearch{
		Name:          input.Name,
		Code:          input.Code,
		ContactPerson: input.ContactPerson,
		Status:        input.Status,
	}
	list, total, err := dao.NewCustomerDao(m.DB()).SearchPage(ctx, cond, params.Offset(), params.Limit)
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "查询客户列表失败")
	}

	items := make([]v1.CustomerItem, 0, len(list))
	for _, customer := range list {
		items = append(items, toCustomerItem(customer))
	}

	output.List = items
	output.Pagination = buildPagination(total, params.Page, params.Limit, page.Pages(total, params.Limit))
	return output, nil
}

// Detail 查询客户详情。
func (s *sCustomer) Detail(ctx context.Context, input *v1.CustomerDetailReq) (output *v1.CustomerDetailRes, err error) {
	customer, err := dao.NewCustomerDao(m.DB()).GetByID(ctx, input.Id)
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "查询客户失败")
	}
	if customer == nil {
		return nil, merror.NewCode(mcode.CodeNotFound, "客户不存在")
	}
	output = new(v1.CustomerDetailRes)
	output.CustomerItem = toCustomerItem(customer)
	return output, nil
}

// Options 查询客户下拉选项。
func (s *sCustomer) Options(ctx context.Context, _ *v1.CustomerOptionsReq) (output *v1.CustomerOptionsRes, err error) {
	list, err := dao.NewCustomerDao(m.DB()).FindList(ctx, map[string]any{"status": statusActive}, "name ASC")
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "查询客户选项失败")
	}
	options := make(v1.CustomerOptionsRes, 0, len(list))
	for _, customer := range list {
		options = append(options, buildOption(customer.Id, customer.Code, customer.Name))
	}
	return &options, nil
}

// Create 创建客户。
func (s *sCustomer) Create(ctx context.Context, input *v1.CustomerCreateReq) (output *v1.CustomerCreateRes, err error) {
	if err := requireWrite(ctx, "customer:write"); err != nil {
		return nil, err
	}

	status, err := normalizeStatus(input.Status, statusActive, partnerStatuses)
	if err != nil {
		return nil, err
	}
	customerDao := dao.NewCustomerDao(m.DB())
	if err := s.assertCustomerCodeAvailable(ctx, customerDao, input.Code, 0); err != nil {
		return nil, err
	}

	now := time.Now()
	customer := &entity.Customer{
		Code:          input.Code,
		Name:          input.Name,
		ContactPerson: input.ContactPerson,
		Phone:         input.Phone,
		Email:         input.Email,
		Address:       input.Address,
		Status:        status,
		CreatedAt:     now,
		UpdatedAt:     now,
	}
	if err := customerDao.Create(ctx, customer); err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "创建客户失败")
	}

	oplog.Write(ctx, oplog.Entry{Action: "create", TargetType: "customer", TargetID: customer.Id, After: customer})

	output = new(v1.CustomerCreateRes)
	output.CustomerItem = toCustomerItem(customer)
	return output, nil
}

// Update 更新客户。
func (s *sCustomer) Update(ctx context.Context, input *v1.CustomerUpdateReq) (output *v1.CustomerUpdateRes, err error) {
	if err := requireWrite(ctx, "customer:write"); err != nil {
		return nil, err
	}

	customerDao := dao.NewCustomerDao(m.DB())
	customer, err := customerDao.GetByID(ctx, input.Id)
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "查询客户失败")
	}
	if customer == nil {
		return nil, merror.NewCode(mcode.CodeNotFound, "客户不存在")
	}
	before := *customer

	if input.Code != "" && input.Code != customer.Code {
		if err := s.assertCustomerCodeAvailable(ctx, customerDao, input.Code, customer.Id); err != nil {
			return nil, err
		}
		customer.Code = input.Code
	}
	if input.Name != "" {
		customer.Name = input.Name
	}
	if input.ContactPerson != "" {
		customer.ContactPerson = input.ContactPerson
	}
	if input.Phone != "" {
		customer.Phone = input.Phone
	}
	if input.Email != "" {
		customer.Email = input.Email
	}
	if input.Address != "" {
		customer.Address = input.Address
	}
	if input.Status != "" {
		status, err := normalizeStatus(input.Status, customer.Status, partnerStatuses)
		if err != nil {
			return nil, err
		}
		customer.Status = status
	}

	customer.UpdatedAt = time.Now()
	if err := customerDao.Update(ctx, customer); err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "更新客户失败")
	}

	oplog.Write(ctx, oplog.Entry{
		Action: "update", TargetType: "customer", TargetID: customer.Id, Before: before, After: *customer,
	})

	output = new(v1.CustomerUpdateRes)
	output.CustomerItem = toCustomerItem(customer)
	return output, nil
}

// Delete 删除客户。
func (s *sCustomer) Delete(ctx context.Context, input *v1.CustomerDeleteReq) (output *v1.CustomerDeleteRes, err error) {
	if err := requireWrite(ctx, "customer:write"); err != nil {
		return nil, err
	}

	customerDao := dao.NewCustomerDao(m.DB())
	customer, err := customerDao.GetByID(ctx, input.Id)
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "查询客户失败")
	}
	if customer == nil {
		return nil, merror.NewCode(mcode.CodeNotFound, "客户不存在")
	}

	if err := customerDao.Delete(ctx, customer.Id); err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "删除客户失败")
	}

	oplog.Write(ctx, oplog.Entry{Action: "delete", TargetType: "customer", TargetID: customer.Id, Before: customer})
	return new(v1.CustomerDeleteRes), nil
}

// assertCustomerCodeAvailable 校验客户编码未被占用。
func (s *sCustomer) assertCustomerCodeAvailable(ctx context.Context, customerDao *dao.CustomerDao, code string, excludeID int) error {
	exist, err := customerDao.FindOne(ctx, map[string]any{"code": code})
	if err != nil {
		return merror.WrapCode(err, mcode.CodeDbOperationError, "校验客户编码失败")
	}
	if exist != nil && exist.Id != excludeID {
		return merror.NewCode(mcode.CodeBusinessValidationFailed, "客户编码已存在")
	}
	return nil
}

// toCustomerItem 转换客户实体。
func toCustomerItem(customer *entity.Customer) v1.CustomerItem {
	return v1.CustomerItem{
		Id:            customer.Id,
		Code:          customer.Code,
		Name:          customer.Name,
		ContactPerson: customer.ContactPerson,
		Phone:         customer.Phone,
		Email:         customer.Email,
		Address:       customer.Address,
		Status:        customer.Status,
		StatusText:    activeStatusText(customer.Status),
		CreatedAt:     formatTime(customer.CreatedAt),
		UpdatedAt:     formatTime(customer.UpdatedAt),
	}
}

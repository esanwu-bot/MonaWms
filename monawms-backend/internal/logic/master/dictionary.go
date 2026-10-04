package master

import (
	"context"
	"strings"
	"time"

	"github.com/esanwu-bot/monawms-backend/api/master/v1"
	"github.com/esanwu-bot/monawms-backend/internal/dao"
	"github.com/esanwu-bot/monawms-backend/internal/model/entity"
	"github.com/esanwu-bot/monawms-backend/internal/pkg/oplog"
	"github.com/esanwu-bot/monawms-backend/internal/service"
	"github.com/graingo/maltose/errors/mcode"
	"github.com/graingo/maltose/errors/merror"
	"github.com/graingo/maltose/frame/m"
)

// dictionaryStatuses 是字典允许的状态取值。
var dictionaryStatuses = []string{statusActive, statusInactive}

func init() {
	service.RegisterDictionary(NewDictionary())
}

type sDictionary struct{}

// NewDictionary 创建数据字典的 service 实现。
func NewDictionary() service.IDictionary {
	return &sDictionary{}
}

// Types 查询字典类型列表。
func (s *sDictionary) Types(ctx context.Context, input *v1.DictionaryTypeListReq) (output *v1.DictionaryTypeListRes, err error) {
	cond := map[string]any{}
	if input.Status != "" {
		cond["status"] = input.Status
	}
	list, err := dao.NewDictionaryTypeDao(m.DB()).FindList(ctx, cond, "id ASC")
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "查询字典类型失败")
	}

	items := make(v1.DictionaryTypeListRes, 0, len(list))
	for _, item := range list {
		items = append(items, toDictionaryTypeItem(item))
	}
	return &items, nil
}

// CreateType 创建字典类型。
func (s *sDictionary) CreateType(ctx context.Context, input *v1.DictionaryTypeCreateReq) (output *v1.DictionaryTypeCreateRes, err error) {
	if err := requireWrite(ctx, "product:write"); err != nil {
		return nil, err
	}

	status, err := normalizeStatus(input.Status, statusActive, dictionaryStatuses)
	if err != nil {
		return nil, err
	}
	typeDao := dao.NewDictionaryTypeDao(m.DB())
	if exist, err := typeDao.FindOne(ctx, map[string]any{"code": input.Code}); err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "校验字典类型编码失败")
	} else if exist != nil {
		return nil, merror.NewCode(mcode.CodeBusinessValidationFailed, "字典类型编码已存在")
	}

	now := time.Now()
	dictType := &entity.DictionaryType{
		Code:        input.Code,
		Name:        input.Name,
		Description: input.Description,
		Status:      status,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	if err := typeDao.Create(ctx, dictType); err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "创建字典类型失败")
	}

	oplog.Write(ctx, oplog.Entry{Action: "create", TargetType: "dictionary_type", TargetID: dictType.Id, After: dictType})

	output = new(v1.DictionaryTypeCreateRes)
	output.DictionaryTypeItem = toDictionaryTypeItem(dictType)
	return output, nil
}

// UpdateType 更新字典类型。
func (s *sDictionary) UpdateType(ctx context.Context, input *v1.DictionaryTypeUpdateReq) (output *v1.DictionaryTypeUpdateRes, err error) {
	if err := requireWrite(ctx, "product:write"); err != nil {
		return nil, err
	}

	typeDao := dao.NewDictionaryTypeDao(m.DB())
	dictType, err := typeDao.GetByID(ctx, input.Id)
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "查询字典类型失败")
	}
	if dictType == nil {
		return nil, merror.NewCode(mcode.CodeNotFound, "字典类型不存在")
	}
	before := *dictType

	if input.Name != "" {
		dictType.Name = input.Name
	}
	if input.Description != "" {
		dictType.Description = input.Description
	}
	if input.Status != "" {
		status, err := normalizeStatus(input.Status, dictType.Status, dictionaryStatuses)
		if err != nil {
			return nil, err
		}
		dictType.Status = status
	}
	if input.Code != "" && input.Code != dictType.Code {
		if exist, err := typeDao.FindOne(ctx, map[string]any{"code": input.Code}); err != nil {
			return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "校验字典类型编码失败")
		} else if exist != nil {
			return nil, merror.NewCode(mcode.CodeBusinessValidationFailed, "字典类型编码已存在")
		}
		dictType.Code = input.Code
	}

	dictType.UpdatedAt = time.Now()
	if err := typeDao.Update(ctx, dictType); err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "更新字典类型失败")
	}

	oplog.Write(ctx, oplog.Entry{
		Action: "update", TargetType: "dictionary_type", TargetID: dictType.Id, Before: before, After: *dictType,
	})

	output = new(v1.DictionaryTypeUpdateRes)
	output.DictionaryTypeItem = toDictionaryTypeItem(dictType)
	return output, nil
}

// DeleteType 删除字典类型：仍挂载字典项时禁止删除。
func (s *sDictionary) DeleteType(ctx context.Context, input *v1.DictionaryTypeDeleteReq) (output *v1.DictionaryTypeDeleteRes, err error) {
	if err := requireWrite(ctx, "product:write"); err != nil {
		return nil, err
	}

	typeDao := dao.NewDictionaryTypeDao(m.DB())
	dictType, err := typeDao.GetByID(ctx, input.Id)
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "查询字典类型失败")
	}
	if dictType == nil {
		return nil, merror.NewCode(mcode.CodeNotFound, "字典类型不存在")
	}

	children, err := dao.CountBy(ctx, m.DB(), &entity.DictionaryItem{}, map[string]any{"type_id": dictType.Id})
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "校验字典项失败")
	}
	if children > 0 {
		return nil, merror.NewCode(mcode.CodeBusinessValidationFailed, "字典类型下仍存在字典项，无法删除")
	}

	if err := typeDao.Delete(ctx, dictType.Id); err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "删除字典类型失败")
	}

	oplog.Write(ctx, oplog.Entry{Action: "delete", TargetType: "dictionary_type", TargetID: dictType.Id, Before: dictType})
	return new(v1.DictionaryTypeDeleteRes), nil
}

// ItemsByType 按类型 ID 查询字典项。
func (s *sDictionary) ItemsByType(ctx context.Context, input *v1.DictionaryItemByTypeReq) (output *v1.DictionaryItemListRes, err error) {
	if input.TypeId <= 0 {
		return nil, merror.NewCode(mcode.CodeValidationFailed, "字典类型ID不能为空")
	}
	return s.items(ctx, dao.DictionaryItemSearch{TypeId: input.TypeId, Status: input.Status})
}

// ItemsByTypeCode 按类型编码查询字典项。
func (s *sDictionary) ItemsByTypeCode(ctx context.Context, input *v1.DictionaryItemByCodeReq) (output *v1.DictionaryItemListRes, err error) {
	if strings.TrimSpace(input.TypeCode) == "" {
		return nil, merror.NewCode(mcode.CodeValidationFailed, "字典类型编码不能为空")
	}
	dictType, err := dao.NewDictionaryTypeDao(m.DB()).FindOne(ctx, map[string]any{"code": input.TypeCode})
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "查询字典类型失败")
	}
	if dictType == nil {
		return nil, merror.NewCode(mcode.CodeNotFound, "字典类型不存在")
	}
	return s.items(ctx, dao.DictionaryItemSearch{TypeId: dictType.Id, TypeCode: input.TypeCode, Status: input.Status})
}

// ItemDetail 查询字典项详情。
func (s *sDictionary) ItemDetail(ctx context.Context, input *v1.DictionaryItemDetailReq) (output *v1.DictionaryItemDetailRes, err error) {
	itemDao := dao.NewDictionaryItemDao(m.DB())
	item, err := itemDao.GetByID(ctx, input.Id)
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "查询字典项失败")
	}
	if item == nil {
		return nil, merror.NewCode(mcode.CodeNotFound, "字典项不存在")
	}

	converted, err := s.toItem(ctx, item)
	if err != nil {
		return nil, err
	}
	output = new(v1.DictionaryItemDetailRes)
	output.DictionaryItemItem = converted
	return output, nil
}

// CreateItem 创建字典项，同一类型下编码不允许重复。
func (s *sDictionary) CreateItem(ctx context.Context, input *v1.DictionaryItemCreateReq) (output *v1.DictionaryItemCreateRes, err error) {
	if err := requireWrite(ctx, "product:write"); err != nil {
		return nil, err
	}

	status, err := normalizeStatus(input.Status, statusActive, dictionaryStatuses)
	if err != nil {
		return nil, err
	}
	if err := s.assertTypeExists(ctx, input.TypeId); err != nil {
		return nil, err
	}
	if err := s.assertItemCodeAvailable(ctx, input.TypeId, input.Code, 0); err != nil {
		return nil, err
	}

	now := time.Now()
	item := &entity.DictionaryItem{
		TypeId:    input.TypeId,
		Code:      input.Code,
		Name:      input.Name,
		Value:     input.Value,
		SortOrder: input.SortOrder,
		Status:    status,
		CreatedAt: now,
		UpdatedAt: now,
	}
	if err := dao.NewDictionaryItemDao(m.DB()).Create(ctx, item); err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "创建字典项失败")
	}

	oplog.Write(ctx, oplog.Entry{Action: "create", TargetType: "dictionary_item", TargetID: item.Id, After: item})

	converted, err := s.toItem(ctx, item)
	if err != nil {
		return nil, err
	}
	output = new(v1.DictionaryItemCreateRes)
	output.DictionaryItemItem = converted
	return output, nil
}

// UpdateItem 更新字典项，变更编码或类型时需重新校验唯一性。
func (s *sDictionary) UpdateItem(ctx context.Context, input *v1.DictionaryItemUpdateReq) (output *v1.DictionaryItemUpdateRes, err error) {
	if err := requireWrite(ctx, "product:write"); err != nil {
		return nil, err
	}

	itemDao := dao.NewDictionaryItemDao(m.DB())
	item, err := itemDao.GetByID(ctx, input.Id)
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "查询字典项失败")
	}
	if item == nil {
		return nil, merror.NewCode(mcode.CodeNotFound, "字典项不存在")
	}
	before := *item

	if input.TypeId > 0 {
		if err := s.assertTypeExists(ctx, input.TypeId); err != nil {
			return nil, err
		}
		item.TypeId = input.TypeId
	}
	if input.Code != "" && input.Code != before.Code {
		if err := s.assertItemCodeAvailable(ctx, item.TypeId, input.Code, item.Id); err != nil {
			return nil, err
		}
		item.Code = input.Code
	}
	if input.Name != "" {
		item.Name = input.Name
	}
	if input.Value != "" {
		item.Value = input.Value
	}
	if input.SortOrder > 0 {
		item.SortOrder = input.SortOrder
	}
	if input.Status != "" {
		status, err := normalizeStatus(input.Status, item.Status, dictionaryStatuses)
		if err != nil {
			return nil, err
		}
		item.Status = status
	}

	item.UpdatedAt = time.Now()
	if err := itemDao.Update(ctx, item); err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "更新字典项失败")
	}

	oplog.Write(ctx, oplog.Entry{
		Action: "update", TargetType: "dictionary_item", TargetID: item.Id, Before: before, After: *item,
	})

	converted, err := s.toItem(ctx, item)
	if err != nil {
		return nil, err
	}
	output = new(v1.DictionaryItemUpdateRes)
	output.DictionaryItemItem = converted
	return output, nil
}

// DeleteItem 删除字典项。
func (s *sDictionary) DeleteItem(ctx context.Context, input *v1.DictionaryItemDeleteReq) (output *v1.DictionaryItemDeleteRes, err error) {
	if err := requireWrite(ctx, "product:write"); err != nil {
		return nil, err
	}

	itemDao := dao.NewDictionaryItemDao(m.DB())
	item, err := itemDao.GetByID(ctx, input.Id)
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "查询字典项失败")
	}
	if item == nil {
		return nil, merror.NewCode(mcode.CodeNotFound, "字典项不存在")
	}

	if err := itemDao.Delete(ctx, item.Id); err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "删除字典项失败")
	}

	oplog.Write(ctx, oplog.Entry{Action: "delete", TargetType: "dictionary_item", TargetID: item.Id, Before: item})
	return new(v1.DictionaryItemDeleteRes), nil
}

// items 查询字典项并转换为响应结构。
func (s *sDictionary) items(ctx context.Context, cond dao.DictionaryItemSearch) (*v1.DictionaryItemListRes, error) {
	list, err := dao.NewDictionaryItemDao(m.DB()).SearchItems(ctx, cond)
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "查询字典项失败")
	}

	typeNames, err := s.typeNames(ctx)
	if err != nil {
		return nil, err
	}

	items := make(v1.DictionaryItemListRes, 0, len(list))
	for _, item := range list {
		converted := toDictionaryItemItem(item)
		converted.TypeName = typeNames[item.TypeId]
		items = append(items, converted)
	}
	return &items, nil
}

// toItem 转换单个字典项，并补齐类型编码与名称。
func (s *sDictionary) toItem(ctx context.Context, item *entity.DictionaryItem) (v1.DictionaryItemItem, error) {
	converted := toDictionaryItemItem(item)
	dictType, err := dao.NewDictionaryTypeDao(m.DB()).GetByID(ctx, item.TypeId)
	if err != nil {
		return converted, merror.WrapCode(err, mcode.CodeDbOperationError, "查询字典类型失败")
	}
	if dictType != nil {
		converted.TypeCode = dictType.Code
		converted.TypeName = dictType.Name
	}
	return converted, nil
}

// typeNames 取全部字典类型的名称映射。
func (s *sDictionary) typeNames(ctx context.Context) (map[int]string, error) {
	types, err := dao.NewDictionaryTypeDao(m.DB()).FindList(ctx, map[string]any{}, "id ASC")
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "查询字典类型失败")
	}
	names := make(map[int]string, len(types))
	for _, dictType := range types {
		names[dictType.Id] = dictType.Name
	}
	return names, nil
}

// assertTypeExists 校验字典类型存在。
func (s *sDictionary) assertTypeExists(ctx context.Context, typeID int) error {
	dictType, err := dao.NewDictionaryTypeDao(m.DB()).GetByID(ctx, typeID)
	if err != nil {
		return merror.WrapCode(err, mcode.CodeDbOperationError, "查询字典类型失败")
	}
	if dictType == nil {
		return merror.NewCode(mcode.CodeValidationFailed, "字典类型不存在")
	}
	return nil
}

// assertItemCodeAvailable 校验同一类型下字典项编码唯一（excludeID 为当前记录 ID）。
func (s *sDictionary) assertItemCodeAvailable(ctx context.Context, typeID int, code string, excludeID int) error {
	exist, err := dao.NewDictionaryItemDao(m.DB()).FindOne(ctx, map[string]any{"type_id": typeID, "code": code})
	if err != nil {
		return merror.WrapCode(err, mcode.CodeDbOperationError, "校验字典项编码失败")
	}
	if exist != nil && exist.Id != excludeID {
		return merror.NewCode(mcode.CodeBusinessValidationFailed, "同一字典类型下编码不能重复")
	}
	return nil
}

// toDictionaryTypeItem 转换字典类型实体。
func toDictionaryTypeItem(dictType *entity.DictionaryType) v1.DictionaryTypeItem {
	return v1.DictionaryTypeItem{
		Id:          dictType.Id,
		Code:        dictType.Code,
		Name:        dictType.Name,
		Description: dictType.Description,
		Status:      dictType.Status,
		CreatedAt:   formatTime(dictType.CreatedAt),
		UpdatedAt:   formatTime(dictType.UpdatedAt),
	}
}

// toDictionaryItemItem 转换字典项实体。
func toDictionaryItemItem(item *entity.DictionaryItem) v1.DictionaryItemItem {
	return v1.DictionaryItemItem{
		Id:        item.Id,
		TypeId:    item.TypeId,
		Code:      item.Code,
		Name:      item.Name,
		Value:     item.Value,
		SortOrder: item.SortOrder,
		Status:    item.Status,
		CreatedAt: formatTime(item.CreatedAt),
		UpdatedAt: formatTime(item.UpdatedAt),
	}
}

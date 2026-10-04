package master

import (
	"context"
	"strconv"
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

// categoryStatuses 是分类允许的状态取值。
var categoryStatuses = []string{statusActive, statusInactive}

func init() {
	service.RegisterCategory(NewCategory())
}

type sCategory struct{}

// NewCategory 创建物资分类的 service 实现。
func NewCategory() service.ICategory {
	return &sCategory{}
}

// List 分页查询分类列表，并补齐层级、路径与直接挂载的物资数。
func (s *sCategory) List(ctx context.Context, input *v1.CategoryListReq) (output *v1.CategoryListRes, err error) {
	output = new(v1.CategoryListRes)

	params := page.Normalize(input.Page, input.Limit)
	cond := dao.CategorySearch{
		Name:     input.Name,
		Code:     input.Code,
		Status:   input.Status,
		ParentId: input.ParentId,
	}

	list, total, err := dao.NewCategoryDao(m.DB()).SearchPage(ctx, cond, params.Offset(), params.Limit)
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "查询分类列表失败")
	}

	all, err := dao.NewCategoryDao(m.DB()).FindOrdered(ctx, "")
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "查询分类失败")
	}
	levels, paths := categoryTreeMeta(all)

	items := make([]v1.CategoryItem, 0, len(list))
	for _, category := range list {
		count, err := dao.NewProductDao(m.DB()).CountInCategory(ctx, category.Id)
		if err != nil {
			return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "统计分类物资失败")
		}
		items = append(items, toCategoryItem(category, levels[category.Id], paths[category.Id], count))
	}

	output.List = items
	output.Pagination = buildPagination(total, params.Page, params.Limit, page.Pages(total, params.Limit))
	return output, nil
}

// Tree 查询分类树（扁平数组按层级递归出 children）。
func (s *sCategory) Tree(ctx context.Context, input *v1.CategoryTreeReq) (output *v1.CategoryTreeRes, err error) {
	all, err := dao.NewCategoryDao(m.DB()).FindOrdered(ctx, input.Status)
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "查询分类失败")
	}
	levels, paths := categoryTreeMeta(all)

	nodes := make(map[int]*v1.CategoryNode, len(all))
	childrenOf := make(map[int][]int, len(all))
	for _, category := range all {
		nodes[category.Id] = &v1.CategoryNode{}
		childrenOf[category.ParentId] = append(childrenOf[category.ParentId], category.Id)
	}

	var build func(parentID int) []v1.CategoryNode
	build = func(parentID int) []v1.CategoryNode {
		list := make([]v1.CategoryNode, 0, len(childrenOf[parentID]))
		for _, id := range childrenOf[parentID] {
			node := nodes[id]
			entityOfNode := categoryByID(all, id)
			node.Id = entityOfNode.Id
			node.Code = entityOfNode.Code
			node.Name = entityOfNode.Name
			node.Description = entityOfNode.Description
			node.ParentId = entityOfNode.ParentId
			node.SortOrder = entityOfNode.SortOrder
			node.Status = entityOfNode.Status
			node.StatusText = activeStatusText(entityOfNode.Status)
			node.Level = levels[id]
			node.Path = paths[id]
			node.Children = build(id)
			list = append(list, *node)
		}
		return list
	}

	result := v1.CategoryTreeRes(build(0))
	return &result, nil
}

// Detail 查询分类详情。
func (s *sCategory) Detail(ctx context.Context, input *v1.CategoryDetailReq) (output *v1.CategoryDetailRes, err error) {
	item, err := s.item(ctx, input.Id)
	if err != nil {
		return nil, err
	}
	output = new(v1.CategoryDetailRes)
	output.CategoryItem = item
	return output, nil
}

// Statistics 查询分类统计信息。
func (s *sCategory) Statistics(ctx context.Context, _ *v1.CategoryStatisticsReq) (output *v1.CategoryStatisticsRes, err error) {
	all, err := dao.NewCategoryDao(m.DB()).FindOrdered(ctx, "")
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "查询分类失败")
	}
	levels, _ := categoryTreeMeta(all)

	output = new(v1.CategoryStatisticsRes)
	output.Total = int64(len(all))
	output.MaxLevel = 0
	for _, category := range all {
		if category.ParentId <= 0 {
			output.Root++
		}
		if level := levels[category.Id]; level > output.MaxLevel {
			output.MaxLevel = level
		}
		switch category.Status {
		case statusActive:
			output.ActiveCount++
		case statusInactive:
			output.InactiveCount++
		}
	}
	return output, nil
}

// Options 查询分类下拉选项。
func (s *sCategory) Options(ctx context.Context, input *v1.CategoryOptionsReq) (output *v1.CategoryOptionsRes, err error) {
	all, err := dao.NewCategoryDao(m.DB()).FindOrdered(ctx, input.Status)
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "查询分类失败")
	}
	levels, _ := categoryTreeMeta(all)

	options := make(v1.CategoryOptionsRes, 0, len(all))
	for _, category := range all {
		option := buildOption(category.Id, category.Code, category.Name)
		// 用层级缩进表达父子关系，便于前端下拉直观识别。
		if levels[category.Id] > 1 {
			option.Label = repeatSpace(levels[category.Id]-1) + option.Label
		}
		options = append(options, option)
	}
	return &options, nil
}

// Create 创建分类。
func (s *sCategory) Create(ctx context.Context, input *v1.CategoryCreateReq) (output *v1.CategoryCreateRes, err error) {
	if err := requireWrite(ctx, "category:write"); err != nil {
		return nil, err
	}

	status, err := normalizeStatus(input.Status, statusActive, categoryStatuses)
	if err != nil {
		return nil, err
	}
	if input.ParentId > 0 {
		if _, err := s.item(ctx, input.ParentId); err != nil {
			return nil, err
		}
	}
	if input.Code != "" {
		exist, err := dao.NewCategoryDao(m.DB()).FindOne(ctx, map[string]any{"code": input.Code})
		if err != nil {
			return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "校验分类编码失败")
		}
		if exist != nil {
			return nil, merror.NewCode(mcode.CodeBusinessValidationFailed, "分类编码已存在")
		}
	}

	now := time.Now()
	category := &entity.Category{
		Code:        input.Code,
		Name:        input.Name,
		Description: input.Description,
		ParentId:    input.ParentId,
		SortOrder:   input.SortOrder,
		Status:      status,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	if err := dao.NewCategoryDao(m.DB()).Create(ctx, category); err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "创建分类失败")
	}

	oplog.Write(ctx, oplog.Entry{Action: "create", TargetType: "category", TargetID: category.Id, After: category})

	item, err := s.item(ctx, category.Id)
	if err != nil {
		return nil, err
	}
	output = new(v1.CategoryCreateRes)
	output.CategoryItem = item
	return output, nil
}

// Update 更新分类，禁止把父级指向自身或自己的子孙（防成环）。
func (s *sCategory) Update(ctx context.Context, input *v1.CategoryUpdateReq) (output *v1.CategoryUpdateRes, err error) {
	if err := requireWrite(ctx, "category:write"); err != nil {
		return nil, err
	}

	categoryDao := dao.NewCategoryDao(m.DB())
	category, err := categoryDao.GetByID(ctx, input.Id)
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "查询分类失败")
	}
	if category == nil {
		return nil, merror.NewCode(mcode.CodeNotFound, "分类不存在")
	}
	before := *category

	if input.ParentId > 0 {
		if input.ParentId == input.Id {
			return nil, merror.NewCode(mcode.CodeBusinessValidationFailed, "父级分类不能是自身")
		}
		if _, err := s.item(ctx, input.ParentId); err != nil {
			return nil, err
		}
		if err := s.assertNotDescendant(ctx, input.ParentId, input.Id); err != nil {
			return nil, err
		}
		category.ParentId = input.ParentId
	}
	if input.Name != "" {
		category.Name = input.Name
	}
	if input.Description != "" {
		category.Description = input.Description
	}
	if input.SortOrder > 0 {
		category.SortOrder = input.SortOrder
	}
	if input.Status != "" {
		status, err := normalizeStatus(input.Status, category.Status, categoryStatuses)
		if err != nil {
			return nil, err
		}
		category.Status = status
	}
	if input.Code != "" && input.Code != category.Code {
		exist, err := categoryDao.FindOne(ctx, map[string]any{"code": input.Code})
		if err != nil {
			return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "校验分类编码失败")
		}
		if exist != nil {
			return nil, merror.NewCode(mcode.CodeBusinessValidationFailed, "分类编码已存在")
		}
		category.Code = input.Code
	}

	category.UpdatedAt = time.Now()
	if err := categoryDao.Update(ctx, category); err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "更新分类失败")
	}

	oplog.Write(ctx, oplog.Entry{
		Action: "update", TargetType: "category", TargetID: category.Id, Before: before, After: *category,
	})

	item, err := s.item(ctx, category.Id)
	if err != nil {
		return nil, err
	}
	output = new(v1.CategoryUpdateRes)
	output.CategoryItem = item
	return output, nil
}

// Delete 删除分类：存在子分类或已挂物资时禁止删除。
func (s *sCategory) Delete(ctx context.Context, input *v1.CategoryDeleteReq) (output *v1.CategoryDeleteRes, err error) {
	if err := requireWrite(ctx, "category:write"); err != nil {
		return nil, err
	}

	categoryDao := dao.NewCategoryDao(m.DB())
	category, err := categoryDao.GetByID(ctx, input.Id)
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "查询分类失败")
	}
	if category == nil {
		return nil, merror.NewCode(mcode.CodeNotFound, "分类不存在")
	}

	children, err := categoryDao.CountChildren(ctx, category.Id)
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "校验子分类失败")
	}
	if children > 0 {
		return nil, merror.NewCode(mcode.CodeBusinessValidationFailed, "存在子分类，无法删除")
	}
	bindings, err := dao.NewProductDao(m.DB()).CountInCategory(ctx, category.Id)
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "校验分类物资失败")
	}
	if bindings > 0 {
		return nil, merror.NewCode(mcode.CodeBusinessValidationFailed, "分类下存在物资，无法删除")
	}

	if err := categoryDao.Delete(ctx, category.Id); err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "删除分类失败")
	}

	oplog.Write(ctx, oplog.Entry{Action: "delete", TargetType: "category", TargetID: category.Id, Before: category})
	return new(v1.CategoryDeleteRes), nil
}

// item 查询单条分类并转换为响应结构。
func (s *sCategory) item(ctx context.Context, id int) (v1.CategoryItem, error) {
	categoryDao := dao.NewCategoryDao(m.DB())
	category, err := categoryDao.GetByID(ctx, id)
	if err != nil {
		return v1.CategoryItem{}, merror.WrapCode(err, mcode.CodeDbOperationError, "查询分类失败")
	}
	if category == nil {
		return v1.CategoryItem{}, merror.NewCode(mcode.CodeNotFound, "分类不存在")
	}

	all, err := categoryDao.FindOrdered(ctx, "")
	if err != nil {
		return v1.CategoryItem{}, merror.WrapCode(err, mcode.CodeDbOperationError, "查询分类失败")
	}
	levels, paths := categoryTreeMeta(all)

	count, err := dao.NewProductDao(m.DB()).CountInCategory(ctx, category.Id)
	if err != nil {
		return v1.CategoryItem{}, merror.WrapCode(err, mcode.CodeDbOperationError, "统计分类物资失败")
	}
	return toCategoryItem(category, levels[category.Id], paths[category.Id], count), nil
}

// assertNotDescendant 校验 candidate 不是 rootID 的子孙，防止分类树成环。
func (s *sCategory) assertNotDescendant(ctx context.Context, candidate, rootID int) error {
	all, err := dao.NewCategoryDao(m.DB()).FindOrdered(ctx, "")
	if err != nil {
		return merror.WrapCode(err, mcode.CodeDbOperationError, "查询分类失败")
	}
	parentOf := make(map[int]int, len(all))
	for _, category := range all {
		parentOf[category.Id] = category.ParentId
	}

	for cursor := candidate; cursor > 0; {
		if cursor == rootID {
			return merror.NewCode(mcode.CodeBusinessValidationFailed, "父级分类不能是自己的子分类")
		}
		parent, ok := parentOf[cursor]
		if !ok || parent == cursor {
			break
		}
		cursor = parent
	}
	return nil
}

// categoryTreeMeta 基于全量分类计算每个分类的层级与路径。
func categoryTreeMeta(categories []*entity.Category) (levels map[int]int, paths map[int]string) {
	parentOf := make(map[int]int, len(categories))
	for _, category := range categories {
		parentOf[category.Id] = category.ParentId
	}

	levels = make(map[int]int, len(categories))
	paths = make(map[int]string, len(categories))
	resolving := make(map[int]bool)

	var resolve func(id int)
	resolve = func(id int) {
		if _, done := levels[id]; done {
			return
		}
		parent := parentOf[id]
		// 顶级、自引用或父级已在解析栈中（成环保护）都视为第 1 层。
		if parent <= 0 || parent == id || resolving[parent] {
			levels[id] = 1
			paths[id] = "/" + strconv.Itoa(id) + "/"
			return
		}
		resolving[id] = true
		resolve(parent)
		delete(resolving, id)

		levels[id] = levels[parent] + 1
		paths[id] = paths[parent] + strconv.Itoa(id) + "/"
	}

	for id := range parentOf {
		resolve(id)
	}
	return levels, paths
}

// categoryByID 从全量分类中取指定分类（树构建时避免多次查询）。
func categoryByID(categories []*entity.Category, id int) *entity.Category {
	for _, category := range categories {
		if category.Id == id {
			return category
		}
	}
	return nil
}

// toCategoryItem 把分类实体转换为响应结构。
func toCategoryItem(category *entity.Category, level int, path string, productCount int64) v1.CategoryItem {
	return v1.CategoryItem{
		Id:           category.Id,
		Code:         category.Code,
		Name:         category.Name,
		Description:  category.Description,
		ParentId:     category.ParentId,
		Level:        level,
		Path:         path,
		SortOrder:    category.SortOrder,
		ProductCount: productCount,
		Status:       category.Status,
		StatusText:   activeStatusText(category.Status),
		CreatedAt:    formatTime(category.CreatedAt),
		UpdatedAt:    formatTime(category.UpdatedAt),
	}
}

// repeatSpace 生成 n 段缩进，用于下拉选项展示层级。
func repeatSpace(count int) string {
	result := ""
	for i := 0; i < count; i++ {
		result += "　"
	}
	return result
}

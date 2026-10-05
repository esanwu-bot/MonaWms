// =================================================================================
// 代码由 Maltose 工具生成并维护，请勿修改。
// =================================================================================
package internal

import (
	"context"
	"errors"

	"github.com/esanwu-bot/monawms-backend/internal/model/entity"
	"github.com/graingo/maltose/database/mdb"
	"gorm.io/gorm"
)

type InventoryBatchDao struct {
	DB *mdb.DB
}

func NewInventoryBatchDao(db *mdb.DB) *InventoryBatchDao {
	return &InventoryBatchDao{DB: db}
}

func (d *InventoryBatchDao) Create(ctx context.Context, data *entity.InventoryBatch) error {
	return d.DB.WithContext(ctx).Create(data).Error
}

// FirstOrCreate 查找符合给定条件的第一条记录，未找到时创建新记录。
// 返回查到或新建的记录。
func (d *InventoryBatchDao) FirstOrCreate(ctx context.Context, condition map[string]any) (*entity.InventoryBatch, error) {
	var result entity.InventoryBatch
	err := d.DB.WithContext(ctx).Where(condition).FirstOrCreate(&result).Error
	if err != nil {
		return nil, err
	}
	return &result, nil
}

// Update 按主键更新整条记录。
// 会更新全部字段，包括零值字段。
func (d *InventoryBatchDao) Update(ctx context.Context, data *entity.InventoryBatch) error {
	return d.DB.WithContext(ctx).Save(data).Error
}

// UpdateColumns 按主键更新记录的指定列。
func (d *InventoryBatchDao) UpdateColumns(ctx context.Context, id any, updates map[string]any) error {
	return d.DB.WithContext(ctx).Model(&entity.InventoryBatch{}).Where("id = ?", id).Updates(updates).Error
}

func (d *InventoryBatchDao) Delete(ctx context.Context, id any) error {
	return d.DB.WithContext(ctx).Delete(&entity.InventoryBatch{}, id).Error
}

func (d *InventoryBatchDao) GetByID(ctx context.Context, id any) (*entity.InventoryBatch, error) {
	var result entity.InventoryBatch
	err := d.DB.WithContext(ctx).First(&result, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil // 记录不存在不算系统错误
		}
		return nil, err
	}
	return &result, nil
}

// FindOne 查询符合给定条件的单条记录。
func (d *InventoryBatchDao) FindOne(ctx context.Context, condition map[string]any) (*entity.InventoryBatch, error) {
	var result entity.InventoryBatch
	err := d.DB.WithContext(ctx).Where(condition).First(&result).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil // 记录不存在不算系统错误
		}
		return nil, err
	}
	return &result, nil
}

// FindList 按条件查询记录列表，支持排序。
func (d *InventoryBatchDao) FindList(ctx context.Context, condition map[string]any, orderBy ...string) ([]*entity.InventoryBatch, error) {
	var list []*entity.InventoryBatch

	db := d.DB.WithContext(ctx).Model(&entity.InventoryBatch{}).Where(condition)

	// 应用排序与分页
	if len(orderBy) > 0 {
		db = db.Order(orderBy[0])
	}

	// 执行查询
	err := db.Find(&list).Error
	if err != nil {
		return nil, err
	}

	return list, nil
}

// FindPageList 按条件分页查询记录列表，支持排序。
func (d *InventoryBatchDao) FindPageList(ctx context.Context, condition map[string]any, page, pageSize int, orderBy ...string) ([]*entity.InventoryBatch, int64, error) {
	var (
		list  []*entity.InventoryBatch
		total int64
	)

	db := d.DB.WithContext(ctx).Model(&entity.InventoryBatch{}).Where(condition)

	// 获取分页用的总记录数
	err := db.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	// 应用排序与分页
	if len(orderBy) > 0 {
		db = db.Order(orderBy[0])
	}
	if page > 0 && pageSize > 0 {
		db = db.Offset((page - 1) * pageSize).Limit(pageSize)
	}

	// 执行查询
	err = db.Find(&list).Error
	if err != nil {
		return nil, 0, err
	}

	return list, total, nil
}

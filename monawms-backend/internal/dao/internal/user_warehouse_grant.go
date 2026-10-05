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

type UserWarehouseGrantDao struct {
	DB *mdb.DB
}

func NewUserWarehouseGrantDao(db *mdb.DB) *UserWarehouseGrantDao {
	return &UserWarehouseGrantDao{DB: db}
}

func (d *UserWarehouseGrantDao) Create(ctx context.Context, data *entity.UserWarehouseGrant) error {
	return d.DB.WithContext(ctx).Create(data).Error
}

// FirstOrCreate 查找符合给定条件的第一条记录，未找到时创建新记录。
// 返回查到或新建的记录。
func (d *UserWarehouseGrantDao) FirstOrCreate(ctx context.Context, condition map[string]any) (*entity.UserWarehouseGrant, error) {
	var result entity.UserWarehouseGrant
	err := d.DB.WithContext(ctx).Where(condition).FirstOrCreate(&result).Error
	if err != nil {
		return nil, err
	}
	return &result, nil
}

// Update 按主键更新整条记录。
// 会更新全部字段，包括零值字段。
func (d *UserWarehouseGrantDao) Update(ctx context.Context, data *entity.UserWarehouseGrant) error {
	return d.DB.WithContext(ctx).Save(data).Error
}

// UpdateColumns 按主键更新记录的指定列。
func (d *UserWarehouseGrantDao) UpdateColumns(ctx context.Context, id any, updates map[string]any) error {
	return d.DB.WithContext(ctx).Model(&entity.UserWarehouseGrant{}).Where("id = ?", id).Updates(updates).Error
}

func (d *UserWarehouseGrantDao) Delete(ctx context.Context, id any) error {
	return d.DB.WithContext(ctx).Delete(&entity.UserWarehouseGrant{}, id).Error
}

func (d *UserWarehouseGrantDao) GetByID(ctx context.Context, id any) (*entity.UserWarehouseGrant, error) {
	var result entity.UserWarehouseGrant
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
func (d *UserWarehouseGrantDao) FindOne(ctx context.Context, condition map[string]any) (*entity.UserWarehouseGrant, error) {
	var result entity.UserWarehouseGrant
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
func (d *UserWarehouseGrantDao) FindList(ctx context.Context, condition map[string]any, orderBy ...string) ([]*entity.UserWarehouseGrant, error) {
	var list []*entity.UserWarehouseGrant

	db := d.DB.WithContext(ctx).Model(&entity.UserWarehouseGrant{}).Where(condition)

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
func (d *UserWarehouseGrantDao) FindPageList(ctx context.Context, condition map[string]any, page, pageSize int, orderBy ...string) ([]*entity.UserWarehouseGrant, int64, error) {
	var (
		list  []*entity.UserWarehouseGrant
		total int64
	)

	db := d.DB.WithContext(ctx).Model(&entity.UserWarehouseGrant{}).Where(condition)

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

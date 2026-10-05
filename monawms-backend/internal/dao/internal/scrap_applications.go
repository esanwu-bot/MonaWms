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

type ScrapApplicationDao struct {
	DB *mdb.DB
}

func NewScrapApplicationDao(db *mdb.DB) *ScrapApplicationDao {
	return &ScrapApplicationDao{DB: db}
}

func (d *ScrapApplicationDao) Create(ctx context.Context, data *entity.ScrapApplication) error {
	return d.DB.WithContext(ctx).Create(data).Error
}

// FirstOrCreate 查找符合给定条件的第一条记录，未找到时创建新记录。
// 返回查到或新建的记录。
func (d *ScrapApplicationDao) FirstOrCreate(ctx context.Context, condition map[string]any) (*entity.ScrapApplication, error) {
	var result entity.ScrapApplication
	err := d.DB.WithContext(ctx).Where(condition).FirstOrCreate(&result).Error
	if err != nil {
		return nil, err
	}
	return &result, nil
}

// Update 按主键更新整条记录。
// 会更新全部字段，包括零值字段。
func (d *ScrapApplicationDao) Update(ctx context.Context, data *entity.ScrapApplication) error {
	return d.DB.WithContext(ctx).Save(data).Error
}

// UpdateColumns 按主键更新记录的指定列。
func (d *ScrapApplicationDao) UpdateColumns(ctx context.Context, id any, updates map[string]any) error {
	return d.DB.WithContext(ctx).Model(&entity.ScrapApplication{}).Where("id = ?", id).Updates(updates).Error
}

func (d *ScrapApplicationDao) Delete(ctx context.Context, id any) error {
	return d.DB.WithContext(ctx).Delete(&entity.ScrapApplication{}, id).Error
}

func (d *ScrapApplicationDao) GetByID(ctx context.Context, id any) (*entity.ScrapApplication, error) {
	var result entity.ScrapApplication
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
func (d *ScrapApplicationDao) FindOne(ctx context.Context, condition map[string]any) (*entity.ScrapApplication, error) {
	var result entity.ScrapApplication
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
func (d *ScrapApplicationDao) FindList(ctx context.Context, condition map[string]any, orderBy ...string) ([]*entity.ScrapApplication, error) {
	var list []*entity.ScrapApplication

	db := d.DB.WithContext(ctx).Model(&entity.ScrapApplication{}).Where(condition)

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
func (d *ScrapApplicationDao) FindPageList(ctx context.Context, condition map[string]any, page, pageSize int, orderBy ...string) ([]*entity.ScrapApplication, int64, error) {
	var (
		list  []*entity.ScrapApplication
		total int64
	)

	db := d.DB.WithContext(ctx).Model(&entity.ScrapApplication{}).Where(condition)

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

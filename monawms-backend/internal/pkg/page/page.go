// Package page 提供分页参数归一化，保持与原 PHP Response::paginate 一致的参数语义。
package page

const (
	// DefaultPage 默认页码。
	DefaultPage = 1
	// DefaultLimit 默认每页条数，等价于原后端 $limit 默认值。
	DefaultLimit = 15
	// MaxLimit 单次查询最大条数，防止 list_rows 被放大成全表扫描。
	MaxLimit = 500
)

// Params 是归一化后的分页参数。
type Params struct {
	Page  int
	Limit int
}

// Offset 返回 SQL 偏移量。
func (p Params) Offset() int {
	if p.Page <= 1 {
		return 0
	}
	return (p.Page - 1) * p.Limit
}

// Normalize 把外部传入的 page/limit 修正到合法区间。
func Normalize(page, limit int) Params {
	if page <= 0 {
		page = DefaultPage
	}
	if limit <= 0 {
		limit = DefaultLimit
	}
	if limit > MaxLimit {
		limit = MaxLimit
	}
	return Params{Page: page, Limit: limit}
}

// Pages 计算总页数。
func Pages(total int64, limit int) int64 {
	if limit <= 0 {
		limit = DefaultLimit
	}
	pages := total / int64(limit)
	if total%int64(limit) != 0 {
		pages++
	}
	return pages
}

package mcache

import (
	"context"
	"time"

	"github.com/graingo/maltose/container/mvar"
)

// Func 是用于计算并返回缓存值的函数类型。
type Func func(ctx context.Context) (value interface{}, err error)

// Adapter 是缓存功能的适配器接口。
type Adapter interface {
	// Set 写入 `key`-`value` 缓存，`duration` 之后过期。
	// `duration` 为 0 时不过期。
	// `duration` < 0 或 `value` 为 nil 时删除该键。
	Set(ctx context.Context, key string, value interface{}, duration time.Duration) error

	// SetMap 按 `data` 批量写入键值缓存，`duration` 之后过期。
	SetMap(ctx context.Context, data map[string]interface{}, duration time.Duration) error

	// SetIfNotExist 在 `key` 不存在时写入 `key`-`value` 缓存，`duration` 之后过期。
	// 若 `key` 不存在且成功写入 `value`，返回 true，否则返回 false。
	SetIfNotExist(ctx context.Context, key string, value interface{}, duration time.Duration) (ok bool, err error)

	// SetIfNotExistFunc 在 `key` 不存在时用函数 `f` 的结果写入并返回 true；
	// 若 `key` 已存在则不执行任何操作并返回 false。
	SetIfNotExistFunc(ctx context.Context, key string, f Func, duration time.Duration) (ok bool, err error)

	// SetIfNotExistFuncLock 在 `key` 不存在时用函数 `f` 的结果写入并返回 true；
	// 若 `key` 已存在则不执行任何操作并返回 false。
	// 函数 `f` 在写锁保护下执行，以保证并发安全。
	SetIfNotExistFuncLock(ctx context.Context, key string, f Func, duration time.Duration) (ok bool, err error)

	// Get 获取并返回给定 `key` 对应的值。
	// 若键不存在、值为 nil 或已过期，则返回 nil。
	Get(ctx context.Context, key string) (*mvar.Var, error)

	// GetOrSet 获取并返回 `key` 的值，若 `key` 不存在则写入 `key`-`value`
	// 并返回 `value`。该键值对在 `duration` 之后过期。
	GetOrSet(ctx context.Context, key string, value interface{}, duration time.Duration) (result *mvar.Var, err error)

	// GetOrSetFunc 获取并返回 `key` 的值，若 `key` 不存在则用函数 `f`
	// 的结果写入并返回该结果。
	GetOrSetFunc(ctx context.Context, key string, f Func, duration time.Duration) (result *mvar.Var, err error)

	// GetOrSetFuncLock 获取并返回 `key` 的值，若 `key` 不存在则用函数 `f`
	// 的结果写入并返回该结果。
	// 函数 `f` 在写锁保护下执行，以保证并发安全。
	GetOrSetFuncLock(ctx context.Context, key string, f Func, duration time.Duration) (result *mvar.Var, err error)

	// Contains 检查 `key` 是否存在于缓存中，存在返回 true，否则返回 false。
	Contains(ctx context.Context, key string) (bool, error)

	// Size 返回缓存中的条目数量。
	Size(ctx context.Context) (size int, err error)

	// Data 以 map 形式返回缓存中全部键值对的副本。
	Data(ctx context.Context) (data map[string]any, err error)

	// Keys 以切片形式返回缓存中的所有键。
	Keys(ctx context.Context) (keys []string, err error)

	// Values 以切片形式返回缓存中的所有值。
	Values(ctx context.Context) (values []interface{}, err error)

	// Update 更新 `key` 的值但不改变其过期时间，并返回旧值。
	Update(ctx context.Context, key string, value interface{}) (oldValue *mvar.Var, exist bool, err error)

	// UpdateExpire 更新 `key` 的过期时间，并返回旧的过期时长。
	// 时长为 0 表示移除过期时间，为负数表示删除该键。
	UpdateExpire(ctx context.Context, key string, duration time.Duration) (oldDuration time.Duration, err error)

	// GetExpire 获取并返回缓存中 `key` 的过期时间。
	GetExpire(ctx context.Context, key string) (time.Duration, error)

	// Remove 从缓存中删除一个或多个键。
	Remove(ctx context.Context, keys ...string) (lastValue *mvar.Var, err error)

	// Clear 清空缓存中的全部数据。
	Clear(ctx context.Context) error

	// Close 在需要时关闭缓存。
	Close(ctx context.Context) error
}

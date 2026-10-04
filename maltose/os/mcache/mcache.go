package mcache

import (
	"context"
	"time"

	"github.com/graingo/maltose/container/mvar"
)

var (
	// defaultCache 是包级方法使用的默认缓存。
	defaultCache = New()
)

// Set 写入 `key`-`value` 缓存，`duration` 之后过期。
// `duration` 为 0 时不过期。
func Set(ctx context.Context, key string, value interface{}, duration time.Duration) error {
	return defaultCache.adapter.Set(ctx, key, value, duration)
}

// SetMap 按 `data` 批量写入键值缓存，`duration` 之后过期。
// `duration` 为 0 时不过期。
func SetMap(ctx context.Context, data map[string]interface{}, duration time.Duration) error {
	return defaultCache.adapter.SetMap(ctx, data, duration)
}

// SetIfNotExist 在 `key` 不存在时写入 `key`-`value` 缓存。
// 写入成功返回 true，`key` 已存在则返回 false。
func SetIfNotExist(ctx context.Context, key string, value interface{}, duration time.Duration) (bool, error) {
	return defaultCache.adapter.SetIfNotExist(ctx, key, value, duration)
}

// SetIfNotExistFunc 在 `key` 不存在时，用函数 `f` 的结果写入缓存。
// 写入成功返回 true，`key` 已存在则返回 false。
// 仅当 `key` 不存在时才会执行函数 `f`。
func SetIfNotExistFunc(ctx context.Context, key string, f Func, duration time.Duration) (bool, error) {
	return defaultCache.adapter.SetIfNotExistFunc(ctx, key, f, duration)
}

// SetIfNotExistFuncLock 在 `key` 不存在时，用函数 `f` 的结果写入缓存。
// 写入成功返回 true，`key` 已存在则返回 false。
// 仅当 `key` 不存在时才会执行函数 `f`。
// 若可能存在对同一 `key` 的并发写入，建议使用本方法而不是 `SetIfNotExistFunc`。
func SetIfNotExistFuncLock(ctx context.Context, key string, f Func, duration time.Duration) (bool, error) {
	return defaultCache.adapter.SetIfNotExistFuncLock(ctx, key, f, duration)
}

// Get 获取并返回给定 `key` 对应的值。
// 若键不存在或其值为 nil，则返回 nil。
func Get(ctx context.Context, key string) (*mvar.Var, error) {
	return defaultCache.adapter.Get(ctx, key)
}

// GetOrSet 获取并返回 `key` 的值，若 `key` 不存在则写入 `key`-`value`
// 并返回 `value`。
// 该键值对在 `duration` 之后过期。
// `duration` 为 0 时不过期。
func GetOrSet(ctx context.Context, key string, value interface{}, duration time.Duration) (*mvar.Var, error) {
	return defaultCache.adapter.GetOrSet(ctx, key, value, duration)
}

// GetOrSetFunc 获取并返回 `key` 的值，若 `key` 不存在则用函数 `f`
// 的结果写入并返回该结果。
// 该键值对在 `duration` 之后过期。
// `duration` 为 0 时不过期。
func GetOrSetFunc(ctx context.Context, key string, f Func, duration time.Duration) (*mvar.Var, error) {
	return defaultCache.adapter.GetOrSetFunc(ctx, key, f, duration)
}

// GetOrSetFuncLock 获取并返回 `key` 的值，若 `key` 不存在则用函数 `f`
// 的结果写入并返回该结果。
// 该键值对在 `duration` 之后过期。
// `duration` 为 0 时不过期。
// 若可能存在对同一 `key` 的并发写入，建议使用本方法而不是 `GetOrSetFunc`。
func GetOrSetFuncLock(ctx context.Context, key string, f Func, duration time.Duration) (*mvar.Var, error) {
	return defaultCache.adapter.GetOrSetFuncLock(ctx, key, f, duration)
}

// Contains 检查 `key` 是否存在于缓存中，存在返回 true，否则返回 false。
func Contains(ctx context.Context, key string) (bool, error) {
	return defaultCache.adapter.Contains(ctx, key)
}

// Size 返回缓存中的条目数量。
func Size(ctx context.Context) (int, error) {
	return defaultCache.adapter.Size(ctx)
}

// Data 以 map 形式返回缓存中全部键值对的副本。
func Data(ctx context.Context) (map[string]interface{}, error) {
	return defaultCache.adapter.Data(ctx)
}

// Keys 以切片形式返回缓存中的所有键。
func Keys(ctx context.Context) ([]string, error) {
	return defaultCache.adapter.Keys(ctx)
}

// Values 以切片形式返回缓存中的所有值。
func Values(ctx context.Context) ([]interface{}, error) {
	return defaultCache.adapter.Values(ctx)
}

// Update 更新 `key` 的值但不改变其过期时间，并返回旧值。
func Update(ctx context.Context, key string, value interface{}) (oldValue *mvar.Var, exist bool, err error) {
	return defaultCache.adapter.Update(ctx, key, value)
}

// UpdateExpire 更新 `key` 的过期时间，并返回旧的过期时长。
func UpdateExpire(ctx context.Context, key string, duration time.Duration) (oldDuration time.Duration, err error) {
	return defaultCache.adapter.UpdateExpire(ctx, key, duration)
}

// GetExpire 获取并返回缓存中 `key` 的过期时间。
func GetExpire(ctx context.Context, key string) (time.Duration, error) {
	return defaultCache.adapter.GetExpire(ctx, key)
}

// Remove 从缓存中删除一个或多个键。
func Remove(ctx context.Context, keys ...string) (lastValue *mvar.Var, err error) {
	return defaultCache.adapter.Remove(ctx, keys...)
}

// Clear 清空缓存中的全部数据。
// 注意：该方法较为敏感，请谨慎使用。
func Clear(ctx context.Context) error {
	return defaultCache.adapter.Clear(ctx)
}

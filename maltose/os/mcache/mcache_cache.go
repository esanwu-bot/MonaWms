package mcache

import (
	"context"
)

// Cache 缓存结构体。
type Cache struct {
	adapter
}

// adapter 是 Adapter 的别名，仅用于嵌入字段。
type adapter = Adapter

// New 使用默认内存适配器创建并返回缓存对象。
// 注意：LRU 特性仅在使用内存适配器时可用。
func New(lruCap ...int) *Cache {
	var capacity int
	if len(lruCap) > 0 {
		capacity = lruCap[0]
	}
	c := &Cache{
		adapter: NewAdapterMemory(capacity),
	}
	return c
}

// NewWithAdapter 使用给定的 Adapter 实现创建并返回 Cache 对象。
func NewWithAdapter(adapter Adapter) *Cache {
	return &Cache{
		adapter: adapter,
	}
}

// SetAdapter 更换当前缓存使用的适配器。
func (c *Cache) SetAdapter(adapter Adapter) {
	c.adapter = adapter
}

// GetAdapter 返回当前 Cache 使用的适配器。
func (c *Cache) GetAdapter() Adapter {
	return c.adapter
}

// Removes 批量删除缓存中的 `keys`。
// 它是 Remove 方法的封装。
func (c *Cache) Removes(ctx context.Context, keys []string) error {
	_, err := c.Remove(ctx, keys...)
	return err
}

// KeyStrings 以字符串切片形式返回缓存中的所有键。
func (c *Cache) KeyStrings(ctx context.Context) ([]string, error) {
	return c.Keys(ctx)
}

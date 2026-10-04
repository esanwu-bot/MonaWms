package mcache

import (
	"context"
	"sync"
	"time"

	"github.com/graingo/maltose/container/mvar"
)

const (
	// 过期条目的默认清理间隔。
	cleanupInterval = time.Minute
)

// AdapterMemory 是基于内存的缓存适配器。
// 它线程安全，并支持 LRU 淘汰。
type AdapterMemory struct {
	mu     sync.RWMutex
	data   *memoryData
	lru    *memoryLru
	closed chan struct{}
}

// NewAdapterMemory 创建并返回一个新的内存适配器。
func NewAdapterMemory(capacity ...int) Adapter {
	lru := 0
	if len(capacity) > 0 {
		lru = capacity[0]
	}
	c := &AdapterMemory{
		data:   newMemoryData(),
		lru:    newMemoryLru(lru),
		closed: make(chan struct{}),
	}
	// 启动后台 goroutine 执行清理
	go c.cleanupLoop()
	return c
}

// cleanupLoop 周期性删除缓存中的过期条目。
func (c *AdapterMemory) cleanupLoop() {
	ticker := time.NewTicker(cleanupInterval)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			c.clearExpired()
		case <-c.closed:
			return
		}
	}
}

// clearExpired 移除缓存中的过期条目。
func (c *AdapterMemory) clearExpired() {
	c.mu.Lock()
	defer c.mu.Unlock()
	now := time.Now()
	for key, item := range c.data.Data() {
		if !item.e.IsZero() && now.After(item.e) {
			c.remove(key, item)
		}
	}
}

// remove 是从缓存中移除条目的内部方法。
// 该方法非线程安全，必须在加锁状态下调用。
func (c *AdapterMemory) remove(key string, item *memoryDataItem) {
	c.data.Remove(key)
	if item.elem != nil {
		c.lru.Remove(item.elem)
	}
}

// evict 在缓存已满时移除最久未使用的条目。
// 该方法非线程安全，必须在加锁状态下调用。
func (c *AdapterMemory) evict() {
	if c.lru.IsFull() {
		if key, ok := c.lru.Pop(); ok {
			c.data.Remove(key)
		}
	}
}

// Close 关闭缓存并停止清理 goroutine。
func (c *AdapterMemory) Close(_ context.Context) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	select {
	case <-c.closed:
	// 已关闭
	default:
		close(c.closed)
	}
	return nil
}

// Set 写入 `key`-`value` 缓存。
func (c *AdapterMemory) Set(_ context.Context, key string, value interface{}, duration time.Duration) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.set(key, value, duration)
	return nil
}

// set 是 Set 的内部实现。
// 该方法非线程安全，必须在加锁状态下调用。
func (c *AdapterMemory) set(key string, value interface{}, duration time.Duration) {
	var expire time.Time
	if duration > 0 {
		expire = time.Now().Add(duration)
	}
	if item := c.data.Get(key); item != nil {
		item.v = value
		item.e = expire
		if item.elem != nil {
			c.lru.Push(item.elem)
		}
	} else {
		c.evict()
		elem := c.lru.NewElement(key)
		c.data.Set(key, &memoryDataItem{v: value, e: expire, elem: elem})
	}
}

// SetMap 按 `data` 批量写入键值缓存。
func (c *AdapterMemory) SetMap(_ context.Context, data map[string]interface{}, duration time.Duration) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	for key, value := range data {
		c.set(key, value, duration)
	}
	return nil
}

// SetIfNotExist 在 `key` 不存在时写入 `key`-`value` 缓存。
func (c *AdapterMemory) SetIfNotExist(_ context.Context, key string, value interface{}, duration time.Duration) (bool, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if item := c.data.Get(key); item != nil {
		if item.e.IsZero() || time.Now().Before(item.e) {
			return false, nil
		}
	}
	c.set(key, value, duration)
	return true, nil
}

// SetIfNotExistFunc 用函数 `f` 的结果写入 `key`。
func (c *AdapterMemory) SetIfNotExistFunc(ctx context.Context, key string, f Func, duration time.Duration) (bool, error) {
	c.mu.Lock()
	if item := c.data.Get(key); item != nil {
		if item.e.IsZero() || time.Now().Before(item.e) {
			c.mu.Unlock()
			return false, nil
		}
		c.remove(key, item)
	}
	c.mu.Unlock()

	value, err := f(ctx)
	if err != nil {
		return false, err
	}

	c.mu.Lock()
	defer c.mu.Unlock()
	// 双重检查
	if item := c.data.Get(key); item != nil {
		if item.e.IsZero() || time.Now().Before(item.e) {
			return false, nil
		}
		c.remove(key, item)
	}

	var expire time.Time
	if duration > 0 {
		expire = time.Now().Add(duration)
	}
	c.evict()
	elem := c.lru.NewElement(key)
	c.data.Set(key, &memoryDataItem{v: value, e: expire, elem: elem})
	return true, nil
}

// SetIfNotExistFuncLock 在加锁状态下用函数 `f` 的结果写入 `key`。
func (c *AdapterMemory) SetIfNotExistFuncLock(ctx context.Context, key string, f Func, duration time.Duration) (bool, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if item := c.data.Get(key); item != nil {
		if item.e.IsZero() || time.Now().Before(item.e) {
			return false, nil
		}
		c.remove(key, item)
	}

	value, err := f(ctx)
	if err != nil {
		return false, err
	}

	var expire time.Time
	if duration > 0 {
		expire = time.Now().Add(duration)
	}
	c.evict()
	elem := c.lru.NewElement(key)
	c.data.Set(key, &memoryDataItem{v: value, e: expire, elem: elem})
	return true, nil
}

// Get 获取并返回给定 `key` 对应的值。
func (c *AdapterMemory) Get(_ context.Context, key string) (*mvar.Var, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	item := c.data.Get(key)
	if item == nil {
		return nil, nil
	}
	if !item.e.IsZero() && time.Now().After(item.e) {
		c.remove(key, item)
		return nil, nil
	}
	c.lru.Push(item.elem)
	return mvar.New(item.v), nil
}

// GetOrSet 获取并返回 `key` 的值，若不存在则写入 `key`-`value` 并返回 `value`。
func (c *AdapterMemory) GetOrSet(_ context.Context, key string, value interface{}, duration time.Duration) (*mvar.Var, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	item := c.data.Get(key)
	if item != nil {
		if item.e.IsZero() || time.Now().Before(item.e) {
			c.lru.Push(item.elem)
			return mvar.New(item.v), nil
		}
		c.remove(key, item)
	}

	var expire time.Time
	if duration > 0 {
		expire = time.Now().Add(duration)
	}
	c.evict()
	elem := c.lru.NewElement(key)
	c.data.Set(key, &memoryDataItem{v: value, e: expire, elem: elem})
	return mvar.New(value), nil
}

// GetOrSetFunc 获取并返回 `key` 的值，若不存在则用函数 `f` 的结果写入。
func (c *AdapterMemory) GetOrSetFunc(ctx context.Context, key string, f Func, duration time.Duration) (*mvar.Var, error) {
	// 不加锁读取
	if v, _ := c.Get(ctx, key); v != nil {
		return v, nil
	}

	// 加锁并双重检查
	c.mu.Lock()
	if item := c.data.Get(key); item != nil {
		if item.e.IsZero() || time.Now().Before(item.e) {
			c.lru.Push(item.elem)
			c.mu.Unlock()
			return mvar.New(item.v), nil
		}
		c.remove(key, item)
	}
	c.mu.Unlock()

	value, err := f(ctx)
	if err != nil {
		return nil, err
	}

	c.mu.Lock()
	defer c.mu.Unlock()
	// 再次双重检查
	if item := c.data.Get(key); item != nil {
		if item.e.IsZero() || time.Now().Before(item.e) {
			c.lru.Push(item.elem)
			return mvar.New(item.v), nil
		}
		c.remove(key, item)
	}

	var expire time.Time
	if duration > 0 {
		expire = time.Now().Add(duration)
	}
	c.evict()
	elem := c.lru.NewElement(key)
	c.data.Set(key, &memoryDataItem{v: value, e: expire, elem: elem})
	return mvar.New(value), nil
}

// GetOrSetFuncLock 在加锁状态下获取 `key` 的值，若不存在则用函数 `f` 的结果写入。
func (c *AdapterMemory) GetOrSetFuncLock(ctx context.Context, key string, f Func, duration time.Duration) (*mvar.Var, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	item := c.data.Get(key)
	if item != nil {
		if item.e.IsZero() || time.Now().Before(item.e) {
			c.lru.Push(item.elem)
			return mvar.New(item.v), nil
		}
		c.remove(key, item)
	}

	value, err := f(ctx)
	if err != nil {
		return nil, err
	}

	var expire time.Time
	if duration > 0 {
		expire = time.Now().Add(duration)
	}
	c.evict()
	elem := c.lru.NewElement(key)
	c.data.Set(key, &memoryDataItem{v: value, e: expire, elem: elem})
	return mvar.New(value), nil
}

// Contains 检查 `key` 是否存在于缓存中，存在返回 true，否则返回 false。
func (c *AdapterMemory) Contains(ctx context.Context, key string) (bool, error) {
	v, err := c.Get(ctx, key)
	return v != nil, err
}

// Remove 从缓存中删除一个或多个键。
func (c *AdapterMemory) Remove(_ context.Context, keys ...string) (*mvar.Var, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	var lastValue *mvar.Var
	for _, key := range keys {
		if item := c.data.Get(key); item != nil {
			lastValue = mvar.New(item.v)
			c.remove(key, item)
		}
	}
	return lastValue, nil
}

// Data 以 map 形式返回缓存中全部键值对的副本。
func (c *AdapterMemory) Data(_ context.Context) (map[string]any, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	data := make(map[string]any)
	for k, v := range c.data.Data() {
		if v.e.IsZero() || time.Now().Before(v.e) {
			data[k] = v.v
		}
	}
	return data, nil
}

// Keys 以切片形式返回缓存中的所有键。
func (c *AdapterMemory) Keys(_ context.Context) ([]string, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	keys := make([]string, 0, c.lru.Len())
	for elem := c.lru.list.Front(); elem != nil; elem = elem.Next() {
		keys = append(keys, elem.Value.(string))
	}
	return keys, nil
}

// Values 以切片形式返回缓存中的所有值。
func (c *AdapterMemory) Values(_ context.Context) ([]any, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	values := make([]any, 0, c.lru.Len())
	for elem := c.lru.list.Front(); elem != nil; elem = elem.Next() {
		key := elem.Value.(string)
		if item := c.data.Get(key); item != nil {
			if item.e.IsZero() || time.Now().Before(item.e) {
				values = append(values, item.v)
			}
		}
	}
	return values, nil
}

// Size 返回缓存中的条目数量。
func (c *AdapterMemory) Size(_ context.Context) (int, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.lru.Len(), nil
}

// Update 更新 `key` 的值但不改变其过期时间，并返回旧值。
func (c *AdapterMemory) Update(_ context.Context, key string, value any) (oldValue *mvar.Var, exist bool, err error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if item := c.data.Get(key); item != nil {
		if !item.e.IsZero() && time.Now().After(item.e) {
			c.remove(key, item)
			return nil, false, nil
		}
		oldValue = mvar.New(item.v)
		item.v = value
		c.lru.Push(item.elem)
		return oldValue, true, nil
	}
	return nil, false, nil
}

// UpdateExpire 更新 `key` 的过期时间，并返回旧的过期时长。
func (c *AdapterMemory) UpdateExpire(_ context.Context, key string, duration time.Duration) (oldDuration time.Duration, err error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if item := c.data.Get(key); item != nil {
		if !item.e.IsZero() && time.Now().After(item.e) {
			c.remove(key, item)
			return -1, nil
		}
		if !item.e.IsZero() {
			oldDuration = time.Until(item.e)
		}
		if duration < 0 {
			c.remove(key, item)
			return oldDuration, nil
		}
		if duration == 0 {
			item.e = time.Time{}
		} else {
			item.e = time.Now().Add(duration)
		}
		c.lru.Push(item.elem)
		return oldDuration, nil
	}
	return -1, nil
}

// GetExpire 获取并返回缓存中 `key` 的过期时间。
func (c *AdapterMemory) GetExpire(_ context.Context, key string) (time.Duration, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	if item := c.data.Get(key); item != nil {
		if !item.e.IsZero() && time.Now().After(item.e) {
			return -1, nil
		}
		if item.e.IsZero() {
			// 永不过期。在 Go 中以 0 表示。
			return 0, nil
		}
		return time.Until(item.e), nil
	}
	return -1, nil
}

// Clear 清空缓存中的全部数据。
func (c *AdapterMemory) Clear(_ context.Context) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.lru.Clear()
	c.data.Clear()
	return nil
}

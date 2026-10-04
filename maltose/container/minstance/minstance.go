package minstance

import "sync"

// Container 是单例容器。
type Container struct {
	instances map[string]any
	mu        sync.RWMutex
}

func New() *Container {
	return &Container{
		instances: make(map[string]any),
	}
}

// Get 获取已存在的实例。
func (c *Container) Get(name string) any {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.instances[name]
}

// Set 设置实例。
func (c *Container) Set(name string, instance any) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.instances[name] = instance
}

// GetOrSetFunc 获取实例，若不存在则通过给定函数创建。
func (c *Container) GetOrSetFunc(name string, fn func() any) any {
	// 尝试获取实例
	c.mu.RLock()
	if instance, ok := c.instances[name]; ok {
		c.mu.RUnlock()
		return instance
	}
	c.mu.RUnlock()

	// 加写锁以创建实例
	c.mu.Lock()
	defer c.mu.Unlock()

	// 双重检查
	if instance, ok := c.instances[name]; ok {
		return instance
	}

	// 创建新实例
	instance := fn()
	if instance != nil {
		c.instances[name] = instance
	}
	return instance
}

// Remove 移除实例。
func (c *Container) Remove(name string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	delete(c.instances, name)
}

// Pop 原子性地移除并返回实例。
func (c *Container) Pop(name string) any {
	c.mu.Lock()
	defer c.mu.Unlock()
	instance := c.instances[name]
	delete(c.instances, name)
	return instance
}

// All 返回全部实例。
func (c *Container) All() []any {
	c.mu.RLock()
	defer c.mu.RUnlock()

	list := make([]any, 0, len(c.instances))
	for _, v := range c.instances {
		list = append(list, v)
	}
	return list
}

// Count 返回实例数量。
func (c *Container) Count() int {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return len(c.instances)
}

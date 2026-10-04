package mcache

import (
	"container/list"
)

// memoryLru 是内存缓存的 LRU 管理器。
// 注意：该结构不是线程安全的。
type memoryLru struct {
	list *list.List
	cap  int
}

// newMemoryLru 创建并返回一个新的 LRU 管理器。
func newMemoryLru(capacity int) *memoryLru {
	return &memoryLru{
		list: list.New(),
		cap:  capacity,
	}
}

// Push 将元素移到 LRU 链表头部。
// 若元素已存在，则将其移动到头部。
func (lru *memoryLru) Push(elem *list.Element) {
	lru.list.MoveToFront(elem)
}

// Pop 移除并返回 LRU 链表尾部（最久未使用）的键。
func (lru *memoryLru) Pop() (key string, ok bool) {
	if lru.cap <= 0 {
		return
	}
	if elem := lru.list.Back(); elem != nil {
		key, ok = lru.list.Remove(elem).(string)
	}
	return
}

// Remove 从 LRU 链表中移除指定元素。
func (lru *memoryLru) Remove(elem *list.Element) {
	lru.list.Remove(elem)
}

// Len 返回 LRU 链表中的元素数量。
func (lru *memoryLru) Len() int {
	return lru.list.Len()
}

// IsFull 检查 LRU 链表是否已满。
func (lru *memoryLru) IsFull() bool {
	if lru.cap <= 0 {
		return false
	}
	return lru.list.Len() >= lru.cap
}

// NewElement 为 LRU 链表创建一个新元素。
func (lru *memoryLru) NewElement(key string) *list.Element {
	return lru.list.PushFront(key)
}

// Clear 移除 LRU 链表中的全部元素。
func (lru *memoryLru) Clear() {
	lru.list.Init()
}

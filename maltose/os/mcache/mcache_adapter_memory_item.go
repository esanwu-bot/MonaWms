package mcache

import (
	"container/list"
	"time"
)

// memoryDataItem 是内存缓存的内部数据结构。
// 它保存值、过期时间，以及指向 LRU 链表中对应元素的指针。
type memoryDataItem struct {
	v    interface{}   // 值。
	e    time.Time     // 过期时间。
	elem *list.Element // 指向 LRU 链表中对应元素的指针。
}

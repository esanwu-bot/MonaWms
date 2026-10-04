package mcache

// memoryData 是内存缓存的底层数据结构。
// 注意：该结构不是线程安全的。
type memoryData struct {
	data map[string]*memoryDataItem
}

// newMemoryData 创建并返回一个新的 memoryData。
func newMemoryData() *memoryData {
	return &memoryData{
		data: make(map[string]*memoryDataItem),
	}
}

// Set 设置一组键值对。
func (md *memoryData) Set(key string, item *memoryDataItem) {
	md.data[key] = item
}

// Get 按键获取条目，键不存在时返回 nil。
func (md *memoryData) Get(key string) *memoryDataItem {
	return md.data[key]
}

// Remove 删除一组键值对。
func (md *memoryData) Remove(key string) (item *memoryDataItem) {
	if item, ok := md.data[key]; ok {
		delete(md.data, key)
		return item
	}
	return nil
}

// Data 返回全部键值对的副本。
func (md *memoryData) Data() map[string]*memoryDataItem {
	m := make(map[string]*memoryDataItem, len(md.data))
	for k, v := range md.data {
		m[k] = v
	}
	return m
}

// Clear 移除 map 中的全部条目。
func (md *memoryData) Clear() {
	md.data = make(map[string]*memoryDataItem)
}

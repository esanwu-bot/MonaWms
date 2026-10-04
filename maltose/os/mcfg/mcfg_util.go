package mcfg

import "github.com/graingo/maltose/os/mcfg/internal"

// Merge 将 `src` 合并到 `dest` 中。
// 采用深合并且忽略键的大小写。
// `dest` 会被就地修改。
func Merge(dest, src map[string]any) map[string]any {
	internal.DeepMergeMaps(dest, src)
	return dest
}

func deepCopyMap(source map[string]any) map[string]any {
	if source == nil {
		return nil
	}
	copyData := make(map[string]any, len(source))
	for key, value := range source {
		copyData[key] = deepCopyValue(value)
	}
	return copyData
}

func deepCopyValue(value any) any {
	switch typed := value.(type) {
	case map[string]any:
		return deepCopyMap(typed)
	case []any:
		copySlice := make([]any, len(typed))
		for i, item := range typed {
			copySlice[i] = deepCopyValue(item)
		}
		return copySlice
	default:
		return value
	}
}

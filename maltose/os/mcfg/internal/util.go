package internal

import (
	"os"
	"path/filepath"
	"strings"

	"github.com/spf13/cast"
)

// SearchMap 在 map 中按给定路径进行大小写不敏感的查找。
// 它沿字符串键逐级查找，根据路径切片定位值。
func SearchMap(source map[string]any, path []string) any {
	if len(path) == 0 {
		return source
	}

	// 以大小写不敏感的方式查找下一个键。
	key := path[0]
	var nextVal any
	var found bool

	for k, v := range source {
		if strings.EqualFold(k, key) {
			nextVal = v
			found = true
			break
		}
	}

	if !found {
		return nil
	}

	if len(path) == 1 {
		return nextVal
	}

	// 若需继续深入，下一级的值必须是 map。
	// 这里用 cast.ToStringMap 以便从 map[any]any 等类型稳健转换。
	nestedMap, err := cast.ToStringMapE(nextVal)
	if err != nil {
		// 不是 map，无法继续深入。
		return nil
	}

	return SearchMap(nestedMap, path[1:])
}

// DeepMergeMaps 将 `src` 深度合并到 `dest`，键名比较忽略大小写。
func DeepMergeMaps(dest, src map[string]any) {
	for srcK, srcV := range src {
		// 在 dest 中忽略大小写查找键。
		destK, found := FindCaseInsensitiveKey(dest, srcK)

		if !found {
			// 若 dest 中不存在该键，直接添加。
			dest[srcK] = srcV
			continue
		}

		// dest 中已存在该键。
		destV := dest[destK]

		// 尝试将两个值都转换为 map。
		srcMap, srcIsMap := srcV.(map[string]any)
		destMap, destIsMap := destV.(map[string]any)

		// 若两者都是 map，则递归合并。
		if srcIsMap && destIsMap {
			DeepMergeMaps(destMap, srcMap)
			dest[destK] = destMap
		} else {
			// 不全是 map，则 src 覆盖 dest。
			// 若键的大小写不同（例如 'Server' 与 'server'），
			// 优先保留 src 中的键。
			if destK != srcK {
				delete(dest, destK)
			}
			dest[srcK] = srcV
		}
	}
}

// FindCaseInsensitiveKey 在 map 中忽略大小写查找键，
// 返回实际的键名以及是否找到的布尔值。
func FindCaseInsensitiveKey(source map[string]any, key string) (string, bool) {
	for k := range source {
		if strings.EqualFold(k, key) {
			return k, true
		}
	}
	return "", false
}

var (
	supportedFileTypes = []string{"yaml", "yml", "json", "toml"}
	defaultConfigDir   = []string{".", "/", "config", "/config"}
)

// SearchConfigFile 在默认目录中搜索配置文件。
// 按给定 `name` 与支持的扩展名查找文件。
func SearchConfigFile(name string) (path string, found bool) {
	for _, dir := range defaultConfigDir {
		for _, ext := range supportedFileTypes {
			filePath := filepath.Join(dir, name+"."+ext)
			if _, err := os.Stat(filePath); err == nil {
				return filePath, true
			}
		}
	}
	// 同时直接按 name 检查，以防其已包含扩展名。
	if stat, err := os.Stat(name); err == nil && !stat.IsDir() {
		return name, true
	}
	return "", false
}

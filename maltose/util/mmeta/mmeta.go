package mmeta

import (
	"reflect"
	"strconv"

	"github.com/graingo/maltose/container/mvar"
	"github.com/graingo/maltose/errors/merror"
)

// Meta 作为嵌入属性使用，用于开启元数据特性
type Meta struct{}

const (
	metaAttributeName = "Meta" // 结构体中元数据的属性名
)

// metaType 保存 Meta 的反射类型，用于高效的类型比较。
var metaType = reflect.TypeOf(Meta{})

// Data 以 map 形式返回 `object` 的全部元数据。
// 参数 `object` 可以是结构体对象或结构体指针。
func Data(object any) map[string]string {
	if object == nil {
		return map[string]string{}
	}

	reflectType, err := StructType(object)
	if err != nil {
		return map[string]string{}
	}

	if field, ok := reflectType.FieldByName(metaAttributeName); ok {
		if field.Type == metaType {
			return ParseTag(string(field.Tag))
		}
	}
	return map[string]string{}
}

// Get 按键返回指定元数据的值。
// 参数 `object` 可以是结构体对象或结构体指针。
func Get(object any, key string) *mvar.Var {
	data := Data(object)
	if v, ok := data[key]; ok {
		return mvar.New(v)
	}
	return nil
}

// StructType 获取并返回结构体的反射类型
func StructType(object any) (reflect.Type, error) {
	if object == nil {
		return nil, merror.New("invalid object type: nil")
	}

	var reflectType reflect.Type
	if rt, ok := object.(reflect.Type); ok {
		reflectType = rt
	} else {
		v := reflect.ValueOf(object)
		if v.Kind() == reflect.Pointer && v.IsNil() {
			return nil, merror.New("invalid object: nil pointer")
		}
		reflectType = v.Type()
	}

	if reflectType.Kind() == reflect.Pointer {
		reflectType = reflectType.Elem()
	}
	if reflectType.Kind() != reflect.Struct {
		return nil, merror.Newf("invalid object kind: %v", reflectType.Kind())
	}
	return reflectType, nil
}

// ParseTag 将标签字符串解析为 map
func ParseTag(tag string) map[string]string {
	data := make(map[string]string)

	for tag != "" {
		// 跳过前导空格
		i := 0
		for i < len(tag) && tag[i] == ' ' {
			i++
		}
		tag = tag[i:]
		if tag == "" {
			break
		}

		// 扫描到冒号
		i = 0
		for i < len(tag) && tag[i] > ' ' && tag[i] != ':' && tag[i] != '"' && tag[i] != 0x7f {
			i++
		}
		if i == 0 || i+1 >= len(tag) || tag[i] != ':' || tag[i+1] != '"' {
			break
		}
		key := tag[:i]
		tag = tag[i+1:]

		// 扫描引号内的值
		i = 1
		for i < len(tag) && tag[i] != '"' {
			if tag[i] == '\\' {
				i++
			}
			i++
		}
		if i >= len(tag) {
			break
		}
		quotedValue := tag[:i+1]
		tag = tag[i+1:]

		value, err := strconv.Unquote(quotedValue)
		if err != nil {
			break
		}
		data[key] = value
	}
	return data
}

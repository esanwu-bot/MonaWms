package openapi

import (
	"go/ast"
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"reflect"
	"sort"
	"strings"

	"github.com/graingo/maltose/errors/merror"
)

// APIDefinition 保存单个 API 接口提取出的信息。
type APIDefinition struct {
	Method      string
	Path        string
	Group       string // 路径的分组前缀
	Summary     string
	Tag         string
	Description string
	Request     StructInfo
	Response    StructInfo
}

// StructInfo 保存请求或响应结构体的信息。
type StructInfo struct {
	Name   string
	Fields []FieldInfo
}

// FieldInfo 保存结构体单个字段的信息。
type FieldInfo struct {
	Name        string
	JSONName    string
	Type        string
	Tag         reflect.StructTag
	Description string
	Required    bool
}

// ParseDir 解析目录及其子目录中的所有 .go 文件，
// 并从包含 "m.Meta" 的文件中提取 API 定义。
func ParseDir(dir string) ([]APIDefinition, map[string]*ast.StructType, error) {
	fset := token.NewFileSet()
	var apiDefs []APIDefinition
	allStructs := make(map[string]*ast.StructType)
	structSources := make(map[string]string)
	fileToPkgPath := make(map[string]string) // 文件路径 -> 包路径

	// 第一遍：遍历文件，获取相对根目录 `dir` 的包路径
	err := filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() && strings.HasSuffix(info.Name(), ".go") {
			relPath, _ := filepath.Rel(dir, filepath.Dir(path))
			fileToPkgPath[path] = filepath.ToSlash(relPath)
		}
		return nil
	})
	if err != nil {
		return nil, nil, merror.Wrapf(err, "failed to walk directory %s", dir)
	}

	paths := make([]string, 0, len(fileToPkgPath))
	for path := range fileToPkgPath {
		paths = append(paths, path)
	}
	sort.Strings(paths)

	// 第二遍：解析文件，按确定顺序收集所有结构体。
	for _, path := range paths {
		file, err := parser.ParseFile(fset, path, nil, parser.ParseComments)
		if err != nil {
			return nil, nil, merror.Wrapf(err, "failed to parse Go file %s", path)
		}

		var parseErr error
		ast.Inspect(file, func(n ast.Node) bool {
			if genDecl, ok := n.(*ast.GenDecl); ok && genDecl.Tok == token.TYPE {
				for _, spec := range genDecl.Specs {
					if typeSpec, ok := spec.(*ast.TypeSpec); ok {
						if structType, ok := typeSpec.Type.(*ast.StructType); ok {
							if previous, exists := structSources[typeSpec.Name.Name]; exists {
								parseErr = merror.Newf(
									"duplicate struct name %q in %s and %s; OpenAPI types must be uniquely named",
									typeSpec.Name.Name, previous, path,
								)
								return false
							}
							// 保存结构体及其源文件路径，便于后续查找
							allStructs[typeSpec.Name.Name] = structType
							structSources[typeSpec.Name.Name] = path
							// 有点取巧的做法：把文件路径存放在字段的文档注释中
							if structType.Fields != nil && len(structType.Fields.List) > 0 {
								if structType.Fields.List[0].Doc == nil {
									structType.Fields.List[0].Doc = &ast.CommentGroup{}
								}
								structType.Fields.List[0].Doc.List = append(structType.Fields.List[0].Doc.List, &ast.Comment{Text: "// @source:" + path})
							}
						}
					}
				}
			}
			return true
		})
		if parseErr != nil {
			return nil, nil, parseErr
		}
	}

	// 第三遍：查找 "Req" 结构体，构建 API 定义并计算路径
	structNames := make([]string, 0, len(allStructs))
	for name := range allStructs {
		structNames = append(structNames, name)
	}
	sort.Strings(structNames)
	for _, name := range structNames {
		structType := allStructs[name]
		if !strings.HasSuffix(name, "Req") {
			continue
		}

		// 从上面的取巧做法中取回源文件路径
		var sourcePath string
		if structType.Fields != nil && len(structType.Fields.List) > 0 && structType.Fields.List[0].Doc != nil {
			for _, comment := range structType.Fields.List[0].Doc.List {
				if strings.HasPrefix(comment.Text, "// @source:") {
					sourcePath = strings.TrimPrefix(comment.Text, "// @source:")
					break
				}
			}
		}
		if sourcePath == "" {
			continue // 若上面的取巧做法生效，这里不应发生
		}
		pkgPath := fileToPkgPath[sourcePath]

		apiDef := APIDefinition{}
		isAPIEntry := false

		// 查找 m.Meta 并提取接口信息
		for _, field := range structType.Fields.List {
			// 检查是否嵌入了 m.Meta
			if field.Names == nil {
				if selExpr, ok := field.Type.(*ast.SelectorExpr); ok {
					if x, ok := selExpr.X.(*ast.Ident); ok && x.Name == "m" && selExpr.Sel.Name == "Meta" {
						if field.Tag != nil {
							isAPIEntry = true
							tag := reflect.StructTag(strings.Trim(field.Tag.Value, "`"))
							apiDef.Method = tag.Get("method")
							apiDef.Path = tag.Get("path")
							apiDef.Group = tag.Get("group")
							apiDef.Summary = tag.Get("summary")
							apiDef.Tag = tag.Get("tag")
							apiDef.Description = tag.Get("dc")
						}
						break
					}
				}
			}
		}

		if !isAPIEntry {
			continue
		}

		// 计算最终路径
		if apiDef.Group != "" {
			// 若显式设置了 group，则直接使用。
			if apiDef.Group == "/" {
				// 直接使用 path，但确保其以斜杠开头
				apiDef.Path = "/" + strings.TrimPrefix(apiDef.Path, "/")
			} else {
				apiDef.Path = "/" + strings.TrimPrefix(filepath.ToSlash(filepath.Join(apiDef.Group, apiDef.Path)), "/")
			}
		} else {
			// 否则，根据文件所在目录推导前缀。
					var prefix string // 默认为空
			if pkgPath != "" && pkgPath != "." {
				pathForPrefix := filepath.ToSlash(pkgPath)
				parts := strings.Split(pathForPrefix, "/")

				// 尝试查找形如 "v1"、"v2" 的版本字符串。
				for _, part := range parts {
					if len(part) > 1 && part[0] == 'v' && part[1] >= '0' && part[1] <= '9' {
						// 若找到，按需求将前缀构造为 "api/<version>"。
						prefix = "api/" + part
						break
					}
				}
				// 若未找到版本字符串，则按要求保持前缀为空。
			}

			// 将推导出的前缀与标签中的 path 拼接。
			if prefix != "" {
				apiDef.Path = filepath.Join(prefix, apiDef.Path)
			}
			// 确保最终路径以单个斜杠开头。
			apiDef.Path = "/" + strings.TrimPrefix(filepath.ToSlash(apiDef.Path), "/")
		}

		// 填充请求结构体信息
		apiDef.Request = parseStructInfo(name, structType, apiDef.Method)

		// 查找并填充响应结构体信息
		resName := strings.TrimSuffix(name, "Req") + "Res"
		if resStructType, ok := allStructs[resName]; ok {
			apiDef.Response = parseStructInfo(resName, resStructType, "POST") // 响应结构体的解析与请求方法无关
		}

		apiDefs = append(apiDefs, apiDef)
	}
	sort.Slice(apiDefs, func(i, j int) bool {
		if apiDefs[i].Path == apiDefs[j].Path {
			return apiDefs[i].Method < apiDefs[j].Method
		}
		return apiDefs[i].Path < apiDefs[j].Path
	})

	return apiDefs, allStructs, nil
}

func containsMeta(file *ast.File) bool {
	hasMeta := false
	ast.Inspect(file, func(n ast.Node) bool {
		if selExpr, ok := n.(*ast.SelectorExpr); ok {
			if x, ok := selExpr.X.(*ast.Ident); ok && x.Name == "m" && selExpr.Sel.Name == "Meta" {
				hasMeta = true
				return false // 停止遍历
			}
		}
		return !hasMeta // 未找到 meta 时继续遍历
	})
	return hasMeta
}

func parseStructInfo(name string, structType *ast.StructType, method string) StructInfo {
	info := StructInfo{Name: name}
	for _, field := range structType.Fields.List {
		if len(field.Names) == 0 { // 跳过嵌入字段
			continue
		}
		fieldName := field.Names[0].Name

		fieldTypeName := extractTypeName(field.Type)
		if fieldTypeName == "" {
			continue // 暂不处理无法识别的类型
		}

		var tag reflect.StructTag
		if field.Tag != nil {
			tag = reflect.StructTag(strings.Trim(field.Tag.Value, "`"))
		}

		jsonName := tag.Get("json")
		if method == "GET" {
			jsonName = tag.Get("form")
		}
		if parts := strings.Split(jsonName, ","); len(parts) > 0 {
			jsonName = parts[0]
		}

		if jsonName == "" {
			jsonName = fieldName
		}

		info.Fields = append(info.Fields, FieldInfo{
			Name:        fieldName,
			JSONName:    jsonName,
			Type:        fieldTypeName,
			Tag:         tag,
			Description: tag.Get("dc"),
			Required:    strings.Contains(tag.Get("binding"), "required"),
		})
	}
	return info
}

// extractTypeName 从 ast.Expr 中提取类型名，支持多种类型形式
func extractTypeName(expr ast.Expr) string {
	switch t := expr.(type) {
	case *ast.Ident:
		// 简单类型：string、int、User
		return t.Name
	case *ast.StarExpr:
		// 指针类型：*User
		if innerType := extractTypeName(t.X); innerType != "" {
			return "*" + innerType
		}
	case *ast.ArrayType:
		// 数组/切片类型：[]User、[5]int
		if innerType := extractTypeName(t.Elt); innerType != "" {
			return "[]" + innerType
		}
	case *ast.MapType:
		// map 类型：map[string]User
		keyType := extractTypeName(t.Key)
		valueType := extractTypeName(t.Value)
		if keyType != "" && valueType != "" {
			return "map[" + keyType + "]" + valueType
		}
	case *ast.SelectorExpr:
		// 带包名限定的类型：time.Time、pkg.User
		if x, ok := t.X.(*ast.Ident); ok {
			return x.Name + "." + t.Sel.Name
		}
	case *ast.InterfaceType:
		// 接口类型：interface{}
		return "interface{}"
	}
	return ""
}

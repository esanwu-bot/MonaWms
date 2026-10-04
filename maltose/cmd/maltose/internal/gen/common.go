// Package gen 包含代码生成的公共逻辑。
package gen

import (
	"bytes"
	"fmt"
	"go/format"
	"os"
	"path/filepath"
	"strings"
	"text/template"

	"github.com/graingo/maltose/errors/merror"
	"github.com/iancoleman/strcase"
	"github.com/jinzhu/inflection"
	"golang.org/x/text/cases"
	"golang.org/x/text/language"
	"gorm.io/gorm"
)

// generateFile 基于模板创建文件。
func generateFile(path, tplName, tplContent string, data interface{}) error {
	// 创建模板
	tpl, err := template.New(tplName).Funcs(funcMap).Parse(tplContent)
	if err != nil {
		return merror.Wrapf(err, "failed to parse template %s", tplName)
	}

	// 确保目录存在
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return merror.Wrapf(err, "failed to create directory %s", dir)
	}

	// 执行模板
	var buf bytes.Buffer
	if err := tpl.Execute(&buf, data); err != nil {
		return merror.Wrapf(err, "failed to execute template %s", tplName)
	}

	// 格式化生成的代码
	formatted, err := format.Source(buf.Bytes())
	if err != nil {
		return merror.Wrapf(err, "failed to format generated source for %s", path)
	}

	// 写入文件
	return os.WriteFile(path, formatted, 0644)
}

// funcMap 包含模板使用的辅助函数。
var funcMap = template.FuncMap{
	"toCamel":     strcase.ToCamel,
	"toSnake":     strcase.ToSnake, // 提供 ToSnake 用于生成文件名
	"toSingular":  inflection.Singular,
	"dbTypeToGo":  dbTypeToGo,
	"makeTags":    makeTags,
	"makeRemarks": makeRemarks,
	"firstLower":  strcase.ToLowerCamel,
	"toTitle":     cases.Title(language.English).String,
}

// dbTypeToGo 将数据库列类型转换为 Go 类型。
func dbTypeToGo(column gorm.ColumnType) string {
	t := strings.ToUpper(column.DatabaseTypeName())

	if strings.Contains(t, "UNSIGNED") {
		switch {
		case strings.HasPrefix(t, "TINYINT"):
			return "uint8"
		case strings.HasPrefix(t, "SMALLINT"):
			return "uint16"
		case strings.HasPrefix(t, "MEDIUMINT"):
			return "uint32"
		case strings.HasPrefix(t, "INT"):
			return "uint"
		case strings.HasPrefix(t, "BIGINT"):
			return "uint64"
		}
	}

	switch {
	case strings.HasPrefix(t, "INT"):
		return "int"
	case strings.HasPrefix(t, "TINYINT"):
		return "int8"
	case strings.HasPrefix(t, "SMALLINT"):
		return "int16"
	case strings.HasPrefix(t, "BIGINT"):
		return "int64"
	}

	switch t {
	case "VARCHAR", "TEXT", "CHAR", "LONGTEXT", "JSON":
		return "string"
	case "TIMESTAMP", "DATETIME", "DATE", "TIME":
		return "time.Time"
	case "FLOAT", "DOUBLE":
		return "float64"
	case "DECIMAL", "NUMERIC":
		return "decimal.Decimal"
	case "BOOL", "BOOLEAN":
		return "bool"
	case "BLOB", "LONGBLOB", "BINARY", "VARBINARY":
		return "[]byte"
	default:
		return "string"
	}
}

// makeTags 为字段生成 gorm 与 json 结构体标签。
func makeTags(column gorm.ColumnType) string {
	return fmt.Sprintf(`gorm:"column:%s" json:"%s"`, column.Name(), strcase.ToLowerCamel(column.Name()))
}

// makeRemarks 为字段生成备注说明。
func makeRemarks(column gorm.ColumnType) string {
	comment, ok := column.Comment()
	if !ok || comment == "" {
		return ""
	}
	return fmt.Sprintf("// %s", comment)
}

func sanitizeModuleName(name string) string {
	name = strings.ReplaceAll(name, "-", "")
	return strings.ReplaceAll(name, "_", "")
}

// Package gen 提供代码生成相关的公共逻辑。
package gen

const (
	// TplGenController 是生成 controller 文件的模板。
	// 适用于简单场景：api/<version>/<file>.go
	TplGenController = `// =================================================================================
	// 代码由 Maltose 工具生成并维护，可按需自行修改。
	// =================================================================================
	package v1

	import (
		"context"
		"{{.APIModule}}"
	)

	type c{{.Service}} struct{}

	// New{{.Service}} 创建一个新的 controller。
	func New{{.Service}}() *c{{.Service}} {
		return &c{{.Service}}{}
	}

	{{range .Functions}}
	// {{.Name}} 是 {{.Name}} API 的处理函数。
	func (c *c{{$.Service}}) {{.Name}}(ctx context.Context, req *{{$.APIPkg}}.{{.ReqName}}) (res *{{$.APIPkg}}.{{.ResName}}, err error) {
		// TODO：将零值响应替换为业务逻辑。
		return new({{$.APIPkg}}.{{.ResName}}), nil
	}
	{{end}}
`

	// TplGenControllerStruct 是生成 controller 结构体定义文件的模板。
	// 适用于场景：api/<module>/<version>/...
	TplGenControllerStruct = `// =================================================================================
	// 代码由 Maltose 工具生成并维护，可按需自行修改。
	// =================================================================================
	package {{.Module}}

	type {{.Controller}} struct{}

	func New{{.Version}}() *{{.Controller}} {
		return &{{.Controller}}{}
	}
`

	// TplGenControllerMethod 是生成 controller 方法实现文件的模板。
	// 适用于场景：api/<module>/<version>/...
	TplGenControllerMethod = `// =================================================================================
	// 代码由 Maltose 工具生成并维护，可按需自行修改。
	// =================================================================================
	package {{.Module}}

	import (
		"context"
		"{{.APIModule}}"
	)

	{{range .Functions}}
	// {{.Name}} 是 {{.Name}} API 的处理函数。
	func (c *{{$.Controller}}) {{.Name}}(ctx context.Context, req *{{$.APIPkg}}.{{.ReqName}}) (res *{{$.APIPkg}}.{{.ResName}}, err error) {
		// TODO：将零值响应替换为业务逻辑。
		return new({{$.APIPkg}}.{{.ResName}}), nil
	}
	{{end}}
`

	// TplGenControllerMethodOnly 是向已有 controller 文件追加方法的模板。
	TplGenControllerMethodOnly = `
{{range .Functions}}
// {{.Name}} 是 {{.Name}} API 的处理函数。
func (c *{{$.Controller}}) {{.Name}}(ctx context.Context, req *{{$.APIPkg}}.{{.ReqName}}) (res *{{$.APIPkg}}.{{.ResName}}, err error) {
	// TODO：将零值响应替换为业务逻辑。
	return new({{$.APIPkg}}.{{.ResName}}), nil
}
{{end}}
`

	// TplGenService 是生成 service 文件的模板。
	TplGenService = `// =================================================================================
	// 代码由 Maltose 工具生成并维护，可按需自行修改。
	// =================================================================================
	package service

	type s{{.Service}} struct{}

	var local{{.Service}} = New{{.Service}}()

	// New{{.Service}} 创建一个新的 service 实例。
	func New{{.Service}}() *s{{.Service}} {
		return &s{{.Service}}{}
	}

	// {{.Service}} 返回默认的 service 实例。
	func {{.Service}}() *s{{.Service}} {
		return local{{.Service}}
	}
`

	// TplGenServiceMethodOnly 是向已有 service 文件追加方法的模板。
	TplGenServiceMethodOnly = `
{{range .Functions}}
// {{.Name}} 是 {{.Name}} API 的处理函数。
func (s *s{{$.Service}}) {{.Name}}(ctx context.Context, req *{{$.APIPkg}}.{{.ReqName}}) (res *{{$.APIPkg}}.{{.ResName}}, err error) {
	// TODO：将零值响应替换为业务逻辑。
	return new({{$.APIPkg}}.{{.ResName}}), nil
}
{{end}}
`

	// TplGenServiceInterface 是生成 service 接口的模板。
	TplGenServiceInterface = `// =================================================================================
	// 代码由 Maltose 工具生成并维护，可按需自行修改。
	// =================================================================================
	package service

	type I{{.Service}} interface {
		// TODO：在此定义 service 接口方法。
	}

	var local{{.Service}} I{{.Service}}

	// {{.Service}} 返回 I{{.Service}} 已注册的实现。
	// 若未注册任何实现则会 panic。
	func {{.Service}}() I{{.Service}} {
		if local{{.Service}} == nil {
			panic("implement not found for interface I{{.Service}}, forgot register?")
		}
		return local{{.Service}}
	}

	// Register{{.Service}} 为 I{{.Service}} 接口注册实现。
	func Register{{.Service}}(i I{{.Service}}) {
		local{{.Service}} = i
	}
`

	// TplGenServiceInterfaceMethodOnly 是向已有 service 接口文件追加方法的模板。
	TplGenServiceInterfaceMethodOnly = `
{{range .Functions}}
	{{.Name}}(ctx context.Context, req *{{$.APIPkg}}.{{.ReqName}}) (res *{{$.APIPkg}}.{{.ResName}}, err error)
{{end}}
`

	// TplGenServiceLogic 是生成 service logic 实现的模板。
	TplGenServiceLogic = `// =================================================================================
	// 代码由 Maltose 工具生成并维护，可按需自行修改。
	// =================================================================================
	package {{.Module}}

	import (
		"context"

		"{{.APIModule}}"
		"{{.SvcPackage}}"
	)

	func init() {
		service.Register{{.Service}}(New())
	}

	type s{{.Service}} struct{}

	// New 创建一个新的 service logic 实现。
	func New() service.I{{.Service}} {
		return &s{{.Service}}{}
	}

	{{range .Functions}}
	func (s *s{{$.Service}}) {{.Name}}(ctx context.Context{{if .ReqName}}, input {{if .ReqIsPointer}}*{{end}}{{$.APIPkg}}.{{.ReqName}}{{end}}) ({{if .ResName}}output {{if .ResIsPointer}}*{{end}}{{$.APIPkg}}.{{.ResName}}, {{end}}err error) {
		// TODO：实现 {{.Name}} 的业务逻辑。
		{{if .ResName}}{{if .ResIsPointer}}output = new({{$.APIPkg}}.{{.ResName}}){{end}}{{end}}
		return
	}
	{{end}}
`

	// TplGenServiceLogicAppend 是向已有 service logic 文件追加方法的模板。
	TplGenServiceLogicAppend = `
{{range .Functions}}
func (s *s{{$.Service}}) {{.Name}}(ctx context.Context{{if .ReqName}}, input {{if .ReqIsPointer}}*{{end}}{{$.APIPkg}}.{{.ReqName}}{{end}}) ({{if .ResName}}output {{if .ResIsPointer}}*{{end}}{{$.APIPkg}}.{{.ResName}}, {{end}}err error) {
	// TODO：实现 {{.Name}} 的业务逻辑。
	{{if .ResName}}{{if .ResIsPointer}}output = new({{$.APIPkg}}.{{.ResName}}){{end}}{{end}}
	return
}
{{end}}
`

	// TplGenEntity 是生成模型 entity 文件的模板。
	TplGenEntity = `// =================================================================================
	// 代码由 Maltose 工具生成并维护，请勿修改。
	// =================================================================================
package entity
{{if .HasTime}}
import "time"
{{end}}
{{if .HasDecimal}}
import "github.com/shopspring/decimal"
{{end}}

// {{.StructName}} 是数据表 {{.TableName}} 对应的 Go 结构体。
type {{.StructName}} struct {
{{- range .Columns}}
    {{toCamel .Name}} {{dbTypeToGo .}} ` + "`{{makeTags .}}`" + ` {{makeRemarks .}}
{{- end}}
}

	// TableName 返回数据表名。
	func (*{{.StructName}}) TableName() string {
    return "{{.TableName}}"
}
`

	// TplGenDaoInternal 是生成 internal DAO 文件的模板。
	TplGenDaoInternal = `// =================================================================================
	// 代码由 Maltose 工具生成并维护，请勿修改。
	// =================================================================================
package internal

import (
	"context"
		"errors"

	"github.com/graingo/maltose/database/mdb"
	"gorm.io/gorm"
	"{{.PackageName}}/internal/model/entity"
	)

	type {{.DaoName}} struct {
		DB *mdb.DB
	}

	func New{{.DaoName}}(db *mdb.DB) *{{.DaoName}} {
		return &{{.DaoName}}{DB: db}
	}

	func (d *{{.DaoName}}) Create(ctx context.Context, data *entity.{{.StructName}}) error {
		return d.DB.WithContext(ctx).Create(data).Error
	}

	// FirstOrCreate 查找符合给定条件的第一条记录，未找到时创建新记录。
	// 返回查到或新建的记录。
	func (d *{{.DaoName}}) FirstOrCreate(ctx context.Context, condition map[string]any) (*entity.{{.StructName}}, error) {
		var result entity.{{.StructName}}
		err := d.DB.WithContext(ctx).Where(condition).FirstOrCreate(&result).Error
		if err != nil {
			return nil, err
		}
		return &result, nil
	}

	// Update 按主键更新整条记录。
	// 会更新全部字段，包括零值字段。
	func (d *{{.DaoName}}) Update(ctx context.Context, data *entity.{{.StructName}}) error {
		return d.DB.WithContext(ctx).Save(data).Error
	}

	// UpdateColumns 按主键更新记录的指定列。
	func (d *{{.DaoName}}) UpdateColumns(ctx context.Context, id any, updates map[string]any) error {
		return d.DB.WithContext(ctx).Model(&entity.{{.StructName}}{}).Where("id = ?", id).Updates(updates).Error
	}

	func (d *{{.DaoName}}) Delete(ctx context.Context, id any) error {
		return d.DB.WithContext(ctx).Delete(&entity.{{.StructName}}{}, id).Error
	}

	func (d *{{.DaoName}}) GetByID(ctx context.Context, id any) (*entity.{{.StructName}}, error) {
		var result entity.{{.StructName}}
		err := d.DB.WithContext(ctx).First(&result, id).Error
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, nil // 记录不存在不算系统错误
			}
			return nil, err
		}
		return &result, nil
}

// FindOne 查询符合给定条件的单条记录。
	func (d *{{.DaoName}}) FindOne(ctx context.Context, condition map[string]any) (*entity.{{.StructName}}, error) {
	var result entity.{{.StructName}}
		err := d.DB.WithContext(ctx).Where(condition).First(&result).Error
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, nil // 记录不存在不算系统错误
			}
			return nil, err
		}
		return &result, nil
	}

	// FindList 按条件查询记录列表，支持排序。
	func (d *{{.DaoName}}) FindList(ctx context.Context, condition map[string]any, orderBy ...string) ([]*entity.{{.StructName}}, error) {
		var list  []*entity.{{.StructName}}
		
		db := d.DB.WithContext(ctx).Model(&entity.{{.StructName}}{}).Where(condition)

		// 应用排序与分页
		if len(orderBy) > 0 {
			db = db.Order(orderBy[0])
		}

		// 执行查询
		err := db.Find(&list).Error
		if err != nil {
			return nil, err
		}

		return list, nil
	}

	// FindPageList 按条件分页查询记录列表，支持排序。
	func (d *{{.DaoName}}) FindPageList(ctx context.Context, condition map[string]any, page, pageSize int, orderBy ...string) ([]*entity.{{.StructName}}, int64, error) {
		var (
			list  []*entity.{{.StructName}}
			total int64
		)
		
		db := d.DB.WithContext(ctx).Model(&entity.{{.StructName}}{}).Where(condition)

		// 获取分页用的总记录数
		err := db.Count(&total).Error
		if err != nil {
			return nil, 0, err
		}

		// 应用排序与分页
		if len(orderBy) > 0 {
			db = db.Order(orderBy[0])
		}
		if page > 0 && pageSize > 0 {
			db = db.Offset((page - 1) * pageSize).Limit(pageSize)
		}

		// 执行查询
		err = db.Find(&list).Error
		if err != nil {
			return nil, 0, err
		}

		return list, total, nil
	}
	`

	// TplGenDao 是生成可扩展 DAO 文件的模板。
	TplGenDao = `// =================================================================================
	// 代码由 Maltose 工具生成并维护，可按需自行修改。
	// =================================================================================
package dao

import (
	"github.com/graingo/maltose/database/mdb"
	"{{.PackageName}}/internal/dao/internal"
)

type {{.DaoName}} struct {
		*internal.{{.DaoName}}
}

	func New{{.DaoName}}(db *mdb.DB) *{{.DaoName}} {
		return &{{.DaoName}}{
			internal.New{{.DaoName}}(db),
		}
	}
	`

	// TplGenLogicManifest 是导入全部 logic 包的主 logic 文件模板。
	TplGenLogicManifest = `// =================================================================================
// 代码由 Maltose 工具生成并维护，请勿修改。
// =================================================================================
package logic

import (
	{{- range .Packages }}
	_ "{{.}}"
	{{- end }}
)
`
)

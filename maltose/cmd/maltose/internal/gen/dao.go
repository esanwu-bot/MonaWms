package gen

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/graingo/maltose/cmd/maltose/utils"
	"github.com/graingo/maltose/errors/merror"
	"github.com/iancoleman/strcase"
	"github.com/jinzhu/inflection"
	"gorm.io/gorm"
)

// DaoGenerator 保存生成 DAO 文件所需的配置。
type DaoGenerator struct {
	Dst        string
	ModulePath string
	ModuleRoot string
}

// NewDaoGenerator 创建一个新的 DaoGenerator。
func NewDaoGenerator(dst string) (*DaoGenerator, error) {
	moduleName, moduleRoot, err := utils.GetModuleInfo(dst)
	if err != nil {
		return nil, merror.Wrap(err, "failed to get module info")
	}

	return &DaoGenerator{
		Dst:        dst,
		ModulePath: moduleName,
		ModuleRoot: moduleRoot,
	}, nil
}

// daoTplData 保存生成 DAO 与 entity 文件所需的全部模板变量。
type daoTplData struct {
	TableName   string
	StructName  string
	PackageName string
	DaoName     string
	Columns     []gorm.ColumnType
	HasTime     bool
	HasDecimal  bool
}

// Gen 仅生成 DAO 文件。
func (g *DaoGenerator) Gen() error {
	if err := initDB(); err != nil {
		return err
	}

	utils.PrintInfo("ℹ️  Generating dao files...", nil)

	for _, table := range tables {
		structName := strcase.ToCamel(inflection.Singular(table.Name))
		daoName := structName + "Dao"
		data := daoTplData{
			TableName:   table.Name,
			StructName:  structName,
			PackageName: g.ModulePath,
			DaoName:     daoName,
		}

		internalPath := filepath.Join(g.Dst, "internal", fmt.Sprintf("%s.go", table.Name))
		utils.PrintInfo("  -> 📄 Generating {{.Path}}", utils.TplData{"Path": internalPath})
		if err := generateFile(internalPath, "daoInternal", TplGenDaoInternal, data); err != nil {
			return err
		}

		daoPath := filepath.Join(g.Dst, fmt.Sprintf("%s.go", table.Name))

		if _, err := os.Stat(daoPath); os.IsNotExist(err) {
			utils.PrintInfo("  -> 📄 Generating {{.Path}}", utils.TplData{"Path": daoPath})
			if err := generateFile(daoPath, "dao", TplGenDao, data); err != nil {
				return err
			}
		} else {
			utils.PrintInfo("  -> ⏩ Skipping {{.Path}} (already exists)", utils.TplData{"Path": daoPath})
		}
	}
	return nil
}

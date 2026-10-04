package gen

import (
	"errors"
	"fmt"
	"os"

	"github.com/graingo/maltose/cmd/maltose/utils"
	"github.com/graingo/maltose/errors/merror"
	"github.com/joho/godotenv"
	"gorm.io/driver/mysql"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// ErrEnvFileNeedUpdate 表示缺少 .env 文件，需要由 .env.example 创建。
var ErrEnvFileNeedUpdate = errors.New("env file need update")

// 生成过程中共享的状态
var (
	db     *gorm.DB
	tables []TableInfo
)

// initDB 确保数据库连接已完成初始化。
func initDB() error {
	if db != nil {
		return nil // 已初始化
	}

	// 若 .env 文件存在则加载
	if _, err := os.Stat(".env"); os.IsNotExist(err) {
		if err := createEnvExample(); err != nil {
			return err
		}
		utils.PrintNotice("'.env' file not found. Creating a '.env.example' for you.\nPlease copy '.env.example' to '.env' and fill in your database credentials", nil)
		return ErrEnvFileNeedUpdate
	}

	utils.PrintInfo("🔎 Loading .env file...", nil)
	if err := godotenv.Load(); err != nil {
		return merror.Wrap(err, "error loading .env file")
	}

	dbInfo := DBInfo{
		DBType: os.Getenv("DB_TYPE"),
		Host:   os.Getenv("DB_HOST"),
		Port:   os.Getenv("DB_PORT"),
		User:   os.Getenv("DB_USER"),
		Pass:   os.Getenv("DB_PASS"),
		Name:   os.Getenv("DB_NAME"),
	}

	var err error
	utils.PrintInfo("⚡ Connecting to the database...", nil)
	db, err = GetDBConnection(dbInfo)
	if err != nil {
		return err
	}

	// 检查数据库表结构
	utils.PrintInfo("🔍 Inspecting database schema...", nil)
	tables, err = GetTables(db)
	if err != nil {
		return err
	}
	utils.PrintInfo("✔ Found {{.Count}} tables.", utils.TplData{"Count": len(tables)})
	return nil
}

func createEnvExample() error {
	content := `# General Database Settings (数据库通用设置)
DB_TYPE=mysql

# MySQL Settings (MySQL 配置)
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASS=
DB_NAME=your_database_name
`
	return os.WriteFile(".env.example", []byte(content), 0644)
}

// DBInfo 保存数据库连接所需的全部信息。
type DBInfo struct {
	DBType string
	Host   string
	Port   string
	User   string
	Pass   string
	Name   string
}

// TableInfo 保存数据表的信息。
type TableInfo struct {
	Name    string
	Columns []gorm.ColumnType
}

// GetDBConnection 创建并返回 GORM DB 实例。
func GetDBConnection(info DBInfo) (*gorm.DB, error) {
	var dialector gorm.Dialector

	switch info.DBType {
	case "mysql":
		dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
			info.User, info.Pass, info.Host, info.Port, info.Name)
		dialector = mysql.Open(dsn)
	case "pg", "postgres":
		dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=Asia/Shanghai",
			info.Host, info.User, info.Pass, info.Name, info.Port)
		dialector = postgres.Open(dsn)
	default:
		return nil, merror.Newf("unsupported database type: %s", info.DBType)
	}

	db, err := gorm.Open(dialector, &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		return nil, merror.Wrap(err, "failed to connect to database")
	}
	return db, nil
}

// GetTables 从数据库中获取所有数据表及其列信息。
func GetTables(db *gorm.DB) ([]TableInfo, error) {
	tableNames, err := db.Migrator().GetTables()
	if err != nil {
		return nil, merror.Wrap(err, "failed to get tables from database")
	}

	var tables []TableInfo
	for _, name := range tableNames {
		columns, err := db.Migrator().ColumnTypes(name)
		if err != nil {
			return nil, merror.Wrapf(err, "failed to get columns for table %s", name)
		}

		tables = append(tables, TableInfo{
			Name:    name,
			Columns: columns,
		})
	}

	return tables, nil
}

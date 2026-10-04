package mins

import (
	"context"
	"fmt"

	"github.com/graingo/maltose/database/mdb"
	"github.com/graingo/maltose/errors/mcode"
	"github.com/graingo/maltose/errors/merror"
	"github.com/graingo/maltose/os/mlog"
)

const (
	configNodeNameDB = "database" // database 的配置节点名
)

// DB 返回默认作用域中的数据库实例。
func DB(name ...string) *mdb.DB {
	return defaultScope.DB(name...)
}

// DB 返回作用域持有的数据库实例。
func (s *Scope) DB(name ...string) *mdb.DB {
	var (
		ctx          = context.Background()
		instanceName = mdb.DefaultName
	)
	if len(name) > 0 && name[0] != "" {
		instanceName = name[0]
	}
	instanceKey := fmt.Sprintf("%s.%s", frameCoreNameDB, instanceName)

	// 同一作用域内每个命名实例最多创建一次。
	instance := s.dbInstances.GetOrSetFunc(instanceKey, func() any {
		// 初始化数据库需要有可用的配置源。
		if !s.Config().Available(ctx) {
			panic(merror.NewCodef(mcode.CodeMissingConfiguration, `configuration not found for DB instance "%s"`, instanceName))
		}

		// 一次性读取完整的作用域配置，供组件回退使用。
		configMap, err := s.Config().Data(ctx)
		if err != nil {
			panic(merror.NewCodef(mcode.CodeMissingConfiguration, `retrieve config data map failed: %v`, err))
		}

		// 定位数据库配置节点。
		dbConfigNode, ok := configMap[configNodeNameDB]
		if !ok {
			panic(merror.NewCodef(mcode.CodeMissingConfiguration, `configuration node "%s" not found`, configNodeNameDB))
		}

		globalConfigMap := mustConfigMap(dbConfigNode, configNodeNameDB)

		var databaseConfigMap map[string]any
		// 尝试获取指定实例的配置
		if instanceConfig, ok := globalConfigMap[instanceName]; ok {
			databaseConfigMap = mustConfigMap(instanceConfig, fmt.Sprintf("%s.%s", configNodeNameDB, instanceName))
		} else if defaultConfig, ok := globalConfigMap["default"]; ok {
			// 尝试获取默认实例的配置
			databaseConfigMap = mustConfigMap(defaultConfig, configNodeNameDB+".default")
		} else if len(globalConfigMap) > 0 {
			// 使用扁平结构配置
			databaseConfigMap = globalConfigMap
		}

		if len(databaseConfigMap) == 0 {
			panic(merror.NewCodef(mcode.CodeMissingConfiguration, `no configuration found for creating database for instance "%s"`, instanceName))
		}

		dbConfig, err := mdb.ConfigFromMap(databaseConfigMap)
		if err != nil {
			panic(merror.NewCodef(mcode.CodeInvalidConfiguration, `create database config from map failed for instance "%s": %v`, instanceName, err))
		}

		// 优先使用实例自身的日志配置，其次使用作用域日志器。
		var loggerConfigMap map[string]any
		if loggerConfig, ok := databaseConfigMap[configNodeNameLogger]; ok {
			loggerConfigMap = mustConfigMap(loggerConfig, fmt.Sprintf("%s.%s.%s", configNodeNameDB, instanceName, configNodeNameLogger))
		} else if globalLoggerConfig, ok := configMap[configNodeNameLogger]; ok {
			loggerConfigMap = mustConfigMap(globalLoggerConfig, configNodeNameLogger)
		}

		// 配置了日志时使用专用日志器。
		if len(loggerConfigMap) > 0 {
			dbLogger := mlog.New()
			if err := dbLogger.SetConfigWithMap(loggerConfigMap); err != nil {
				panic(merror.NewCodef(mcode.CodeInvalidConfiguration, "set db logger config failed: %v", err))
			}
			dbConfig.SetLogger(dbLogger)
		} else {
			// 否则共用作用域的默认日志器。
			dbConfig.SetLogger(s.Log())
		}

		// 配置完成后才创建连接池。
		db, err := mdb.New(dbConfig)
		if err != nil {
			panic(err)
		}
		return db
	})

	return instance.(*mdb.DB)
}

// TryDB 返回数据库实例或初始化错误。
// 与 DB 不同，配置或连接创建失败时不会 panic。
func TryDB(name ...string) (database *mdb.DB, err error) {
	return defaultScope.TryDB(name...)
}

// TryDB 返回作用域内的数据库实例或初始化错误。
func (s *Scope) TryDB(name ...string) (database *mdb.DB, err error) {
	defer recoverAsError(&err)
	return s.DB(name...), nil
}

// TryDBContext 返回绑定 context 的数据库实例或初始化错误。
func TryDBContext(ctx context.Context, name ...string) (*mdb.DB, error) {
	return defaultScope.TryDBContext(ctx, name...)
}

// TryDBContext 返回作用域持有的、绑定 context 的数据库实例。
func (s *Scope) TryDBContext(ctx context.Context, name ...string) (*mdb.DB, error) {
	database, err := s.TryDB(name...)
	if err != nil {
		return nil, err
	}
	return database.WithContext(ctx), nil
}

package mins

import (
	"context"
	"fmt"

	"github.com/graingo/maltose/database/mredis"
	"github.com/graingo/maltose/errors/mcode"
	"github.com/graingo/maltose/errors/merror"
	"github.com/graingo/maltose/os/mlog"
)

const (
	configNodeNameRedis = "redis" // redis 的配置节点名
)

// Redis 返回默认作用域中的 Redis 实例。
func Redis(name ...string) *mredis.Redis {
	return defaultScope.Redis(name...)
}

// Redis 返回作用域持有的 Redis 实例。
func (s *Scope) Redis(name ...string) *mredis.Redis {
	var (
		ctx          = context.Background()
		instanceName = mredis.DefaultName
	)
	if len(name) > 0 && name[0] != "" {
		instanceName = name[0]
	}
	instanceKey := fmt.Sprintf("%s.%s", frameCoreNameRedis, instanceName)

	// 同一作用域内每个命名实例最多创建一次。
	instance := s.redisInstances.GetOrSetFunc(instanceKey, func() any {
		// 仅为默认作用域保留包级全局 Redis 实例。
		if _, ok := mredis.GetConfig(instanceName); s.useGlobalComponents && ok {
			return mredis.Instance(instanceName)
		}

		// 初始化 Redis 需要有可用的配置源。
		if !s.Config().Available(ctx) {
			panic(merror.NewCodef(mcode.CodeMissingConfiguration, `configuration not found for redis instance "%s"`, instanceName))
		}

		var (
			redisConfigMap map[string]any
		)
		// 一次性读取完整的作用域配置，供组件回退使用。
		configMap, err := s.Config().Data(ctx)
		if err != nil {
			panic(merror.NewCodef(mcode.CodeMissingConfiguration, `retrieve config data map failed: %+v`, err))
		}

		// 定位 Redis 配置节点。
		redisConfigNode, ok := configMap[configNodeNameRedis]
		if !ok {
			panic(merror.NewCode(mcode.CodeMissingConfiguration, `no configuration found for creating redis client`))
		}

		globalConfigMap := mustConfigMap(redisConfigNode, configNodeNameRedis)
		// 尝试获取指定实例的配置。
		if instanceConfig, ok := globalConfigMap[instanceName]; ok {
			redisConfigMap = mustConfigMap(instanceConfig, fmt.Sprintf("%s.%s", configNodeNameRedis, instanceName))
		} else if defaultConfig, ok := globalConfigMap["default"]; ok {
			// 尝试获取默认实例的配置
			redisConfigMap = mustConfigMap(defaultConfig, configNodeNameRedis+".default")
		} else if len(globalConfigMap) > 0 {
			// 使用扁平结构配置
			redisConfigMap = globalConfigMap
		}

		// 将选中的节点转换为 Redis 配置。
		if len(redisConfigMap) == 0 {
			panic(merror.NewCodef(mcode.CodeMissingConfiguration, `no configuration found for creating redis client for instance "%s"`, instanceName))
		}

		redisConfig, err := mredis.ConfigFromMap(redisConfigMap)
		if err != nil {
			panic(merror.NewCodef(mcode.CodeInvalidConfiguration, `create redis config from map failed for instance "%s": %v`, instanceName, err))
		}

		// 优先使用实例自身的日志配置，其次使用作用域日志器。
		var loggerConfigMap map[string]any
		if loggerConfig, ok := redisConfigMap[configNodeNameLogger]; ok {
			loggerConfigMap = mustConfigMap(loggerConfig, fmt.Sprintf("%s.%s.%s", configNodeNameRedis, instanceName, configNodeNameLogger))
		} else if globalLoggerConfig, ok := configMap[configNodeNameLogger]; ok {
			loggerConfigMap = mustConfigMap(globalLoggerConfig, configNodeNameLogger)
		}

		// 配置了日志时使用专用日志器。
		if len(loggerConfigMap) > 0 {
			redisLogger := mlog.New()
			if err := redisLogger.SetConfigWithMap(loggerConfigMap); err != nil {
				panic(merror.NewCodef(mcode.CodeInvalidConfiguration, `set redis logger config failed for instance "%s": %v`, instanceName, err))
			}
			redisConfig.SetLogger(redisLogger)
		} else {
			// 否则共用作用域的默认日志器。
			redisConfig.SetLogger(s.Log())
		}

		// 配置完成后才创建客户端。
		redisClient, err := mredis.New(redisConfig)
		if err != nil {
			panic(err)
		}
		return redisClient
	})

	if instance == nil {
		return nil
	}
	return instance.(*mredis.Redis)
}

// TryRedis 返回 Redis 实例或初始化错误。
// 与 Redis 不同，配置或客户端创建失败时不会 panic。
func TryRedis(name ...string) (client *mredis.Redis, err error) {
	return defaultScope.TryRedis(name...)
}

// TryRedis 返回作用域内的 Redis 实例或初始化错误。
func (s *Scope) TryRedis(name ...string) (client *mredis.Redis, err error) {
	defer recoverAsError(&err)
	return s.Redis(name...), nil
}

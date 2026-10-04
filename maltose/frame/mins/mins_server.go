package mins

import (
	"context"
	"fmt"

	"github.com/graingo/maltose/errors/mcode"
	"github.com/graingo/maltose/errors/merror"
	"github.com/graingo/maltose/net/mhttp"
	"github.com/graingo/maltose/os/mlog"
)

const (
	configNodeNameServer = "server" // server 的配置节点名
)

// Server 返回默认作用域中的 HTTP 服务实例。
func Server(name ...string) *mhttp.Server {
	return defaultScope.Server(name...)
}

// Server 返回作用域持有的 HTTP 服务实例。
func (s *Scope) Server(name ...string) *mhttp.Server {
	var (
		ctx          = context.Background()
		instanceName = mhttp.DefaultServerName
	)
	if len(name) > 0 && name[0] != "" {
		instanceName = name[0]
	}
	instanceKey := fmt.Sprintf("%s.%s", frameCoreNameServer, instanceName)

	instance := s.serverInstances.GetOrSetFunc(instanceKey, func() any {
		server := mhttp.New()

		// 当作用域配置可用时应用服务配置。
		if s.Config().Available(ctx) {
			configMap, err := s.Config().Data(ctx)
			if err != nil {
				panic(merror.NewCodef(mcode.CodeMissingConfiguration, `retrieve config data map failed: %v`, err))
			}

			if serverConfigNode, ok := configMap[configNodeNameServer]; ok {
				globalConfigMap := mustConfigMap(serverConfigNode, configNodeNameServer)

				var serverConfigMap map[string]any
				// 尝试获取指定实例的配置
				if instanceConfig, ok := globalConfigMap[instanceName]; ok {
					serverConfigMap = mustConfigMap(instanceConfig, fmt.Sprintf("%s.%s", configNodeNameServer, instanceName))
				} else if defaultConfig, ok := globalConfigMap["default"]; ok {
					// 尝试获取默认实例的配置
					serverConfigMap = mustConfigMap(defaultConfig, configNodeNameServer+".default")
				} else if len(globalConfigMap) > 0 {
					// 使用扁平结构配置
					serverConfigMap = globalConfigMap
				}

				if len(serverConfigMap) > 0 {
					if err := server.SetConfigWithMap(serverConfigMap); err != nil {
						panic(merror.NewCodef(mcode.CodeInvalidConfiguration, "set server config failed: %v", err))
					}

					// 优先使用服务自身的日志配置，其次使用作用域日志器。
					var loggerConfigMap map[string]any
					if cfg, ok := serverConfigMap[configNodeNameLogger].(map[string]any); ok {
						loggerConfigMap = cfg
					} else if globalLoggerConfig, ok := configMap[configNodeNameLogger]; ok {
						loggerConfigMap = mustConfigMap(globalLoggerConfig, configNodeNameLogger)
					}

					// 配置了日志时使用专用日志器。
					if len(loggerConfigMap) > 0 {
						serverLogger := mlog.New()
						if err := serverLogger.SetConfigWithMap(loggerConfigMap); err != nil {
							panic(merror.NewCodef(mcode.CodeInvalidConfiguration, "set server logger config failed: %v", err))
						}
						server.SetLogger(serverLogger)
					} else {
						// 否则共用作用域的默认日志器。
						server.SetLogger(s.Log())
					}
				}
			}
		}
		// 未显式配置名称时保留请求的实例名。
		if instanceName != mhttp.DefaultServerName {
			server.SetServerName(instanceName)
		}
		return server
	})

	return instance.(*mhttp.Server)
}

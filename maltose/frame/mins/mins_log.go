package mins

import (
	"context"
	"fmt"

	"github.com/graingo/maltose/errors/mcode"
	"github.com/graingo/maltose/errors/merror"
	"github.com/graingo/maltose/os/mlog"
)

const (
	configNodeNameLogger = "logger" // logger 的配置节点名
)

// Log 返回默认作用域中的日志实例。
func Log(name ...string) *mlog.Logger {
	return defaultScope.Log(name...)
}

// Log 返回作用域持有的日志实例。
func (s *Scope) Log(name ...string) *mlog.Logger {
	var (
		ctx          = context.Background()
		instanceName = mlog.DefaultName
	)
	if len(name) > 0 && name[0] != "" {
		instanceName = name[0]
	}
	instanceKey := fmt.Sprintf("%s.%s", frameCoreNameLogger, instanceName)

	instance := s.loggerInstances.GetOrSetFunc(instanceKey, func() any {
		logger := s.newLogger(instanceName)

		// 首先按实例名查找配置。
		certainLoggerNodeName := fmt.Sprintf(`%s.%s`, configNodeNameLogger, instanceName)
		if v, err := s.Config().Get(ctx, certainLoggerNodeName); err != nil {
			panic(merror.NewCodef(mcode.CodeInvalidConfiguration, `get logger config for instance "%s" failed: %v`, instanceName, err))
		} else if !v.IsNil() {
			if err := logger.SetConfigWithMap(v.Map()); err != nil {
				panic(merror.NewCodef(mcode.CodeInvalidConfiguration, `set logger config for instance "%s" failed: %v`, instanceName, err))
			}
			return logger
		}

		// 若找不到该实例名的配置，
		// 则继续查找默认配置。
		if v, err := s.Config().Get(ctx, configNodeNameLogger); err != nil {
			panic(merror.NewCodef(mcode.CodeInvalidConfiguration, `get default logger config failed: %v`, err))
		} else if !v.IsNil() {
			if err := logger.SetConfigWithMap(v.Map()); err != nil {
				panic(merror.NewCodef(mcode.CodeInvalidConfiguration, `set logger config for default failed: %v`, err))
			}
		}
		return logger
	})

	return instance.(*mlog.Logger)
}

package mins

import (
	"github.com/graingo/maltose/container/minstance"
	"github.com/graingo/maltose/os/mcfg"
	"github.com/graingo/maltose/os/mlog"
)

const (
	frameCoreNameLogger = "maltose.logger"
	frameCoreNameRedis  = "maltose.redis"
	frameCoreNameServer = "maltose.server"
	frameCoreNameDB     = "maltose.db"
)

// Scope 持有某个应用或测试边界内的框架实例。
// 包级辅助函数使用默认作用域，以兼容历史用法。
type Scope struct {
	config              *mcfg.Config
	dbInstances         *minstance.Container
	redisInstances      *minstance.Container
	serverInstances     *minstance.Container
	loggerInstances     *minstance.Container
	useGlobalComponents bool
}

var defaultScope = newScope(nil, true)

// NewScope 基于配置创建一个隔离的实例作用域。
// 配置不可为 nil，这样作用域就不会隐式回退到进程级全局配置。
func NewScope(config *mcfg.Config) *Scope {
	if config == nil {
		panic("mins: scope config must not be nil")
	}
	return newScope(config, false)
}

// DefaultScope 返回包级辅助函数使用的进程级作用域。
func DefaultScope() *Scope {
	return defaultScope
}

func newScope(config *mcfg.Config, useGlobalComponents bool) *Scope {
	return &Scope{
		config:              config,
		dbInstances:         minstance.New(),
		redisInstances:      minstance.New(),
		serverInstances:     minstance.New(),
		loggerInstances:     minstance.New(),
		useGlobalComponents: useGlobalComponents,
	}
}

func (s *Scope) configInstance() *mcfg.Config {
	if s == nil {
		panic("mins: scope must not be nil")
	}
	if s.config != nil {
		return s.config
	}
	return mcfg.Instance()
}

func (s *Scope) newLogger(instanceName string) *mlog.Logger {
	if s.useGlobalComponents {
		return mlog.Instance(instanceName)
	}
	return mlog.New()
}

package m

import (
	"context"

	"github.com/graingo/maltose/database/mdb"
	"github.com/graingo/maltose/database/mredis"
	"github.com/graingo/maltose/frame/mins"
	"github.com/graingo/maltose/net/mhttp"
	"github.com/graingo/maltose/os/mcfg"
	"github.com/graingo/maltose/os/mlog"
)

// NewScope 基于配置创建一个隔离的框架实例作用域。
func NewScope(config *mcfg.Config) *Scope {
	return mins.NewScope(config)
}

// DefaultScope 返回包级辅助函数所使用的作用域。
func DefaultScope() *Scope {
	return mins.DefaultScope()
}

// Server 返回指定名称的 HTTP 服务实例。
func Server(name ...string) *mhttp.Server {
	return mins.Server(name...)
}

// Config 返回指定名称的配置实例。
func Config(name ...string) *mcfg.Config {
	return mins.Config(name...)
}

// Log 返回指定名称的日志实例。
func Log(name ...string) *mlog.Logger {
	return mins.Log(name...)
}

// DB 返回指定名称的数据库实例。
func DB(name ...string) *mdb.DB {
	return mins.DB(name...)
}

// TryDB 返回数据库实例或初始化错误。
func TryDB(name ...string) (*mdb.DB, error) {
	return mins.TryDB(name...)
}

// DBContext 返回绑定指定 context 的指定名称数据库实例。
func DBContext(ctx context.Context, name ...string) *mdb.DB {
	return mins.DB(name...).WithContext(ctx)
}

// TryDBContext 返回绑定 context 的数据库实例或初始化错误。
func TryDBContext(ctx context.Context, name ...string) (*mdb.DB, error) {
	return mins.TryDBContext(ctx, name...)
}

// Redis 返回指定名称的 Redis 实例。
func Redis(name ...string) *mredis.Redis {
	return mins.Redis(name...)
}

// TryRedis 返回 Redis 实例或初始化错误。
func TryRedis(name ...string) (*mredis.Redis, error) {
	return mins.TryRedis(name...)
}

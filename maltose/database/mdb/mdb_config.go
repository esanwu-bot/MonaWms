package mdb

import (
	"time"

	"github.com/graingo/maltose"
	"github.com/graingo/maltose/os/mlog"
	"github.com/graingo/mconv"
	"github.com/uptrace/opentelemetry-go-extra/otelgorm"
	"gorm.io/gorm"
)

// Config 定义数据库连接、连接池、副本与插件。
// 传给 New 时，零值字段会继承框架默认值。
type Config struct {
	// Type 是数据库类型。
	Type string `mconv:"type"`
	// DSN 是数据源名称。
	DSN string `mconv:"dsn"`
	// Host 是数据库主机。
	Host string `mconv:"host"`
	// Port 是数据库端口。
	Port string `mconv:"port"`
	// User 是数据库用户。
	User string `mconv:"user"`
	// Password 是数据库密码。
	Password string `mconv:"password"`
	// DBName 是数据库名称。
	DBName string `mconv:"db_name"`
	// MaxIdleTime 是数据库连接的最大空闲时间。
	MaxIdleTime time.Duration `mconv:"max_idle_time"`
	// MaxIdleConnection 是数据库的最大空闲连接数。
	MaxIdleConnection int `mconv:"max_idle_connection"`
	// MaxOpenConnection 是数据库的最大打开连接数。
	MaxOpenConnection int `mconv:"max_open_connection"`
	// MaxLifetime 是数据库连接的最大存活时间。
	MaxLifetime time.Duration `mconv:"max_lifetime"`
	// SlowThreshold 是慢查询阈值。
	SlowThreshold time.Duration `mconv:"slow_threshold"`
	// Logger 通过 SetLogger 或 frame/mins 组件装配来配置。
	Logger *mlog.Logger `mconv:"-"`
	// Replicas 是副本列表。
	Replicas []Config
	// Plugins 通过 AddPlugin 或 SetPlugins 配置。
	Plugins []gorm.Plugin `mconv:"-"`
}

func defaultConfig() *Config {
	return &Config{
		Type:              "mysql",
		Port:              "3306",
		MaxIdleTime:       10 * time.Second,
		MaxIdleConnection: 10,
		MaxOpenConnection: 100,
		MaxLifetime:       0,
		Logger:            mlog.New(),
		SlowThreshold:     300 * time.Millisecond,
		Replicas:          []Config{},
		Plugins: []gorm.Plugin{
			otelgorm.NewPlugin(),
		},
	}
}

func cloneConfig(config *Config) *Config {
	if config == nil {
		return defaultConfig()
	}
	cloned := *config
	cloned.Replicas = append([]Config(nil), config.Replicas...)
	cloned.Plugins = append([]gorm.Plugin(nil), config.Plugins...)
	return &cloned
}

// mergeConfig 将用户配置的非零值覆盖到数据库默认值之上。
func mergeConfig(config *Config) *Config {
	merged := defaultConfig()
	if config == nil {
		return merged
	}

	if config.Type != "" {
		merged.Type = config.Type
	}
	if config.DSN != "" {
		merged.DSN = config.DSN
	}
	if config.Host != "" {
		merged.Host = config.Host
	}
	if config.Port != "" {
		merged.Port = config.Port
	}
	if config.User != "" {
		merged.User = config.User
	}
	if config.Password != "" {
		merged.Password = config.Password
	}
	if config.DBName != "" {
		merged.DBName = config.DBName
	}
	if config.MaxIdleTime != 0 {
		merged.MaxIdleTime = config.MaxIdleTime
	}
	if config.MaxIdleConnection != 0 {
		merged.MaxIdleConnection = config.MaxIdleConnection
	}
	if config.MaxOpenConnection != 0 {
		merged.MaxOpenConnection = config.MaxOpenConnection
	}
	if config.MaxLifetime != 0 {
		merged.MaxLifetime = config.MaxLifetime
	}
	if config.SlowThreshold != 0 {
		merged.SlowThreshold = config.SlowThreshold
	}
	if config.Logger != nil {
		merged.Logger = config.Logger
	}
	if config.Replicas != nil {
		merged.Replicas = append([]Config(nil), config.Replicas...)
	}
	if config.Plugins != nil {
		merged.Plugins = append([]gorm.Plugin(nil), config.Plugins...)
	}

	return merged
}

func (c *Config) SetConfigWithMap(config map[string]any) error {
	return mconv.ToStructE(config, c)
}

func (c *Config) SetLogger(logger *mlog.Logger) {
	if logger == nil {
		logger = mlog.New()
	}
	c.Logger = logger.With(mlog.String(maltose.COMPONENT, "mdb"))
}

func (c *Config) SetReplicas(replicas []Config) {
	c.Replicas = replicas
}

func (c *Config) AddReplica(replica Config) {
	c.Replicas = append(c.Replicas, replica)
}

func (c *Config) AddPlugin(plugins ...gorm.Plugin) {
	c.Plugins = append(c.Plugins, plugins...)
}

func (c *Config) SetPlugins(plugins []gorm.Plugin) {
	c.Plugins = plugins
}

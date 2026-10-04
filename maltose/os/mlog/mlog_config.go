package mlog

import (
	"io"
	"reflect"

	"github.com/graingo/mconv"
)

type Config struct {
	// Writer 是 logger 的自定义 writer。
	Writer io.Writer `mconv:"-"`
	// ServiceName 是服务名称。
	ServiceName string `mconv:"service_name"`
	// Level 是日志级别。
	Level Level `mconv:"level"`
	// TimeFormat 是日志时间格式。
	TimeFormat string `mconv:"time_format"`
	// Format 是日志格式，仅支持 "json" 与 "text"。
	Format string `mconv:"format"`
	// Caller 控制日志中是否包含调用方文件名与行号。
	// 为 true 时，调用方的文件名与行号会被写入日志条目。
	Caller bool `mconv:"caller"`
	// Development 表示是否为开发模式。
	// 为 true 时 logger 处于开发模式，会打印错误堆栈。
	Development bool `mconv:"development"`
	// Filepath 是日志文件路径。
	// 例如：/var/log/app.log 或 /var/log/app.{YYYYmmdd}.log
	Filepath string `mconv:"filepath"`
	// MaxSize 是日志文件轮转前的最大体积（MB）。
	// 仅对 'size' 轮转类型生效。
	MaxSize int `mconv:"max_size"` // （MB）
	// MaxBackups 是保留的旧日志文件最大数量。
	// 仅对 'size' 轮转类型生效。
	MaxBackups int `mconv:"max_backups"` // （文件数）
	// MaxAge 是旧日志文件的最大保留天数。
	// 对 'size' 与 'date' 两种轮转类型都生效。
	MaxAge int `mconv:"max_age"` // （天）
	// Stdout 表示是否输出到标准输出。
	Stdout bool `mconv:"stdout"`
	// CtxKeys 是需要从上下文中提取的键。
	CtxKeys []string `mconv:"ctx_keys"`
}

// defaultConfig 返回默认配置。
func defaultConfig() *Config {
	return &Config{
		ServiceName: "maltose",
		Level:       defaultLevel,
		TimeFormat:  defaultTimeFormat,
		Format:      defaultFormat,
		Caller:      false,
		Development: false,
		Filepath:    defaultFile,
		MaxSize:     100,
		MaxAge:      7,
		MaxBackups:  10,
		Stdout:      true,
		CtxKeys:     []string{},
	}
}

func cloneConfig(config *Config) *Config {
	if config == nil {
		return defaultConfig()
	}
	cloned := *config
	cloned.CtxKeys = append([]string(nil), config.CtxKeys...)
	return &cloned
}

// SetConfigWithMap 通过 map 设置 logger 配置。
func (c *Config) SetConfigWithMap(configMap map[string]any) error {
	return mconv.ToStructE(configMap, c, stringToLevelHookFunc)
}

// stringToLevelHookFunc 是将字符串转换为 Level 的钩子函数。
func stringToLevelHookFunc(from reflect.Type, to reflect.Type, data any) (any, error) {
	if from.Kind() != reflect.String {
		return data, nil
	}
	if to != reflect.TypeOf(Level(0)) {
		return data, nil
	}

	levelStr := data.(string)
	level, err := ParseLevel(levelStr)
	if err != nil {
		return data, err
	}

	return level, nil
}

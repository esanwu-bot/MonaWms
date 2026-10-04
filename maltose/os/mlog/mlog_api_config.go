package mlog

// SetConfig 设置 logger 配置。
func SetConfig(config *Config) error {
	return DefaultLogger().SetConfig(config)
}

// SetFilepath 设置日志文件路径。
func SetFilepath(path string) {
	_ = DefaultLogger().SetConfigWithMap(map[string]any{
		"filepath": path,
	})
}

// SetTimeFormat 设置日志时间格式。
func SetTimeFormat(timeFormat string) {
	_ = DefaultLogger().SetConfigWithMap(map[string]any{
		"time_format": timeFormat,
	})
}

// SetFormat 设置日志格式。
func SetFormat(format string) {
	_ = DefaultLogger().SetConfigWithMap(map[string]any{
		"format": format,
	})
}

// SetStdout 设置是否输出到标准输出。
func SetStdout(enabled bool) {
	_ = DefaultLogger().SetConfigWithMap(map[string]any{
		"stdout": enabled,
	})
}

// SetMaxSize 设置日志文件的最大体积。
func SetMaxSize(maxSize int) {
	_ = DefaultLogger().SetConfigWithMap(map[string]any{
		"max_size": maxSize,
	})
}

// SetMaxBackups 设置日志文件的最大备份数量。
func SetMaxBackups(maxBackups int) {
	_ = DefaultLogger().SetConfigWithMap(map[string]any{
		"max_backups": maxBackups,
	})
}

// SetMaxAge 设置日志文件的最大保留天数。
func SetMaxAge(maxAge int) {
	_ = DefaultLogger().SetConfigWithMap(map[string]any{
		"max_age": maxAge,
	})
}

// SetCtxKeys 设置需要从上下文中提取值的键。
func SetCtxKeys(keys []string) {
	_ = DefaultLogger().SetConfigWithMap(map[string]any{
		"ctx_keys": keys,
	})
}

// SetCaller 设置是否记录调用方信息。
func SetCaller(enabled bool) {
	_ = DefaultLogger().SetConfigWithMap(map[string]any{
		"caller": enabled,
	})
}

// SetLevel 设置日志级别。
func SetLevel(level Level) {
	DefaultLogger().SetLevel(level)
}

// GetLevel 返回日志级别。
func GetLevel() Level {
	return DefaultLogger().GetLevel()
}

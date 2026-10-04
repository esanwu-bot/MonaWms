package mdb

import (
	"context"
	"errors"
	"time"

	"github.com/graingo/maltose/os/mlog"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// GormLogger 是与 mlog 集成的自定义 GORM 日志器。
type GormLogger struct {
	logger                *mlog.Logger
	gormLogLevel          logger.LogLevel
	slowThreshold         time.Duration
	skipErrRecordNotFound bool
}

// Option 是用于配置 GormLogger 的函数式选项。
type Option func(*GormLogger)

// WithSlowThreshold 设置慢查询阈值。
func WithSlowThreshold(threshold time.Duration) Option {
	return func(l *GormLogger) {
		l.slowThreshold = threshold
	}
}

// WithSkipErrRecordNotFound 设置是否跳过 ErrRecordNotFound 错误。
func WithSkipErrRecordNotFound(skip bool) Option {
	return func(l *GormLogger) {
		l.skipErrRecordNotFound = skip
	}
}

// WithLogLevel 设置 GORM 日志级别。
func WithLogLevel(level logger.LogLevel) Option {
	return func(l *GormLogger) {
		l.gormLogLevel = level
	}
}

// NewGormLogger 创建一个新的 GormLogger。
func NewGormLogger(mlogger *mlog.Logger, opts ...Option) *GormLogger {
	l := &GormLogger{
		logger:                mlogger,
		gormLogLevel:          logger.Warn,
		slowThreshold:         200 * time.Millisecond,
		skipErrRecordNotFound: true,
	}
	for _, opt := range opts {
		opt(l)
	}
	return l
}

// LogMode 返回一个使用不同日志级别的新日志器。
func (l *GormLogger) LogMode(level logger.LogLevel) logger.Interface {
	newLogger := *l
	newLogger.gormLogLevel = level
	return &newLogger
}

// Info 记录一条信息级日志。
func (l *GormLogger) Info(ctx context.Context, msg string, args ...any) {
	if l.gormLogLevel >= logger.Info {
		l.logger.Infof(ctx, msg, args...)
	}
}

// Warn 记录一条警告级日志。
func (l *GormLogger) Warn(ctx context.Context, msg string, args ...any) {
	if l.gormLogLevel >= logger.Warn {
		l.logger.Warnf(ctx, msg, args...)
	}
}

// Error 记录一条错误级日志。
func (l *GormLogger) Error(ctx context.Context, msg string, args ...any) {
	if l.gormLogLevel >= logger.Error {
		l.logger.Errorf(ctx, nil, msg, args...)
	}
}

// Trace 记录一条 SQL 查询日志。
func (l *GormLogger) Trace(ctx context.Context, begin time.Time, fc func() (sql string, rowsAffected int64), err error) {
	if l.gormLogLevel <= logger.Silent {
		return
	}

	elapsed := time.Since(begin)
	sql, rows := fc()
	fields := mlog.Fields{
		mlog.String("sql", sql),
		mlog.Int64("rows", rows),
		mlog.Float64("elapsed_ms", float64(elapsed.Nanoseconds())/1e6),
	}

	switch {
	case err != nil && l.gormLogLevel >= logger.Error:
		if errors.Is(err, gorm.ErrRecordNotFound) && l.skipErrRecordNotFound {
			if l.gormLogLevel >= logger.Info {
				l.logger.Infow(ctx, "sql not found", fields...)
			}
			return
		}
		l.logger.Errorw(ctx, err, "sql error", fields...)
	case l.slowThreshold != 0 && elapsed > l.slowThreshold && l.gormLogLevel >= logger.Warn:
		l.logger.Warnw(ctx, "sql slow", fields...)
	case l.gormLogLevel >= logger.Info:
		l.logger.Infow(ctx, "sql trace", fields...)
	}
}

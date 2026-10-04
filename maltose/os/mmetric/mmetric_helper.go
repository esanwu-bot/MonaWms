package mmetric

import (
	"context"

	"go.opentelemetry.io/otel/attribute"
)

// NewMeterOption 创建新的 meter 选项
func NewMeterOption() MeterOption {
	return MeterOption{}
}

// WithInstrument 设置埋点库名称
func (o MeterOption) WithInstrument(instrument string) MeterOption {
	o.Instrument = instrument
	return o
}

// WithInstrumentVersion 设置埋点库版本
func (o MeterOption) WithInstrumentVersion(version string) MeterOption {
	o.InstrumentVersion = version
	return o
}

// WithMeterAttributes 设置属性
func (o MeterOption) WithMeterAttributes(attrs Attributes) MeterOption {
	o.Attributes = attrs
	return o
}

// NewMetricOption 创建新的指标选项
func NewMetricOption() MetricOption {
	return MetricOption{}
}

// WithHelp 设置帮助说明信息
func (o MetricOption) WithHelp(help string) MetricOption {
	o.Help = help
	return o
}

// WithUnit 设置单位
func (o MetricOption) WithUnit(unit string) MetricOption {
	o.Unit = unit
	return o
}

// WithMetricAttributes 设置属性
func (o MetricOption) WithMetricAttributes(attrs Attributes) MetricOption {
	o.Attributes = attrs
	return o
}

// WithBuckets 设置直方图的桶边界
func (o MetricOption) WithBuckets(buckets []float64) MetricOption {
	o.Buckets = buckets
	return o
}

// WithAttributes 用给定属性创建 Option。
// 这是为单次指标观测创建属性的便捷方法。
func WithAttributes(attrs ...attribute.KeyValue) Option {
	return Option{
		Attributes: attrs,
	}
}

// GetMeter 按指定埋点库名称创建 Meter。
// 它使用全局默认 provider。
func GetMeter(name string) Meter {
	p := GetProvider()
	return p.Meter(MeterOption{Instrument: name})
}

// NewCounter 创建新的 Counter 指标。
// 它使用全局默认 provider。
func NewCounter(name string, option MetricOption) (Counter, error) {
	meter := GetMeter(name)
	return meter.Counter(name, option)
}

// NewMustCounter 创建新的 Counter 指标，出错时 panic。
func NewMustCounter(name string, option MetricOption) Counter {
	meter := GetMeter(name)
	return meter.MustCounter(name, option)
}

// NewUpDownCounter 创建新的 UpDownCounter 指标。
func NewUpDownCounter(name string, option MetricOption) (UpDownCounter, error) {
	meter := GetMeter(name)
	return meter.UpDownCounter(name, option)
}

// NewMustUpDownCounter 创建新的 UpDownCounter 指标，出错时 panic。
func NewMustUpDownCounter(name string, option MetricOption) UpDownCounter {
	meter := GetMeter(name)
	return meter.MustUpDownCounter(name, option)
}

// NewHistogram 创建新的 Histogram 指标。
func NewHistogram(name string, option MetricOption) (Histogram, error) {
	meter := GetMeter(name)
	return meter.Histogram(name, option)
}

// NewMustHistogram 创建新的 Histogram 指标，出错时 panic。
func NewMustHistogram(name string, option MetricOption) Histogram {
	meter := GetMeter(name)
	return meter.MustHistogram(name, option)
}

// Shutdown 优雅关闭全局指标 provider。
func Shutdown(ctx context.Context) error {
	p := GetProvider()
	return p.Shutdown(ctx)
}

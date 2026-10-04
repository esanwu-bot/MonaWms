package mmetric

import (
	"context"

	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/metric"
)

// otelProvider 是对 metric.MeterProvider 的封装，实现了 Provider 接口。
type otelProvider struct {
	provider metric.MeterProvider
}

// Meter implements the Provider interface.
func (p *otelProvider) Meter(option MeterOption) Meter {
	if option.Instrument == "" {
		option.Instrument = defaultInstrument
	}
	meter := p.provider.Meter(
		option.Instrument,
		metric.WithInstrumentationVersion(option.InstrumentVersion),
	)
	return &meterWrapper{
		meter:      meter,
		attributes: append(Attributes(nil), option.Attributes...),
	}
}

// Shutdown 实现 Provider 接口。
// 注意：OpenTelemetry 的默认 provider 没有 Shutdown 方法。
// 若底层 provider 不支持 Shutdown，则该方法直接返回 nil。
func (p *otelProvider) Shutdown(ctx context.Context) error {
	if prov, ok := p.provider.(interface {
		Shutdown(context.Context) error
	}); ok {
		return prov.Shutdown(ctx)
	}
	return nil
}

// meterWrapper 是对 OpenTelemetry Meter 的封装，实现了 Meter 接口。
type meterWrapper struct {
	meter      metric.Meter
	attributes Attributes
}

// Counter 创建新的 Counter 指标工具。
func (m *meterWrapper) Counter(name string, option MetricOption) (Counter, error) {
	counter, err := m.meter.Float64Counter(
		name,
		metric.WithDescription(option.Help),
		metric.WithUnit(option.Unit),
	)
	if err != nil {
		return nil, err
	}
	return &counterWrapper{
		counter:    counter,
		attributes: combineAttributes(m.attributes, option.Attributes),
	}, nil
}

// MustCounter 创建新的 Counter，出错时 panic。
func (m *meterWrapper) MustCounter(name string, option MetricOption) Counter {
	counter, err := m.Counter(name, option)
	if err != nil {
		panic(err)
	}
	return counter
}

// UpDownCounter 创建新的 UpDownCounter 指标工具。
func (m *meterWrapper) UpDownCounter(name string, option MetricOption) (UpDownCounter, error) {
	counter, err := m.meter.Float64UpDownCounter(
		name,
		metric.WithDescription(option.Help),
		metric.WithUnit(option.Unit),
	)
	if err != nil {
		return nil, err
	}
	return &upDownCounterWrapper{
		counter:    counter,
		attributes: combineAttributes(m.attributes, option.Attributes),
	}, nil
}

// MustUpDownCounter 创建新的 UpDownCounter，出错时 panic。
func (m *meterWrapper) MustUpDownCounter(name string, option MetricOption) UpDownCounter {
	counter, err := m.UpDownCounter(name, option)
	if err != nil {
		panic(err)
	}
	return counter
}

// Histogram 创建新的 Histogram 指标工具。
func (m *meterWrapper) Histogram(name string, option MetricOption) (Histogram, error) {
	histogram, err := m.meter.Float64Histogram(
		name,
		metric.WithDescription(option.Help),
		metric.WithUnit(option.Unit),
		metric.WithExplicitBucketBoundaries(option.Buckets...),
	)
	if err != nil {
		return nil, err
	}
	return &histogramWrapper{
		histogram:  histogram,
		attributes: combineAttributes(m.attributes, option.Attributes),
	}, nil
}

// MustHistogram 创建新的 Histogram，出错时 panic。
func (m *meterWrapper) MustHistogram(name string, option MetricOption) Histogram {
	histogram, err := m.Histogram(name, option)
	if err != nil {
		panic(err)
	}
	return histogram
}

// counterWrapper 是对 OpenTelemetry Counter 的封装。
type counterWrapper struct {
	counter    metric.Float64Counter
	attributes Attributes
}

// Add 给计数器累加一个值。
func (c *counterWrapper) Add(ctx context.Context, value float64, opts ...Option) {
	c.counter.Add(ctx, value, metric.WithAttributes(
		combineAttributes(c.attributes, optionsToAttributes(opts))...,
	))
}

// Inc 将计数器加 1。
func (c *counterWrapper) Inc(ctx context.Context, opts ...Option) {
	c.counter.Add(ctx, 1, metric.WithAttributes(
		combineAttributes(c.attributes, optionsToAttributes(opts))...,
	))
}

// upDownCounterWrapper 是对 OpenTelemetry UpDownCounter 的封装。
type upDownCounterWrapper struct {
	counter    metric.Float64UpDownCounter
	attributes Attributes
}

// Add 给计数器累加一个值。
func (c *upDownCounterWrapper) Add(ctx context.Context, value float64, opts ...Option) {
	c.counter.Add(ctx, value, metric.WithAttributes(
		combineAttributes(c.attributes, optionsToAttributes(opts))...,
	))
}

// Inc 将计数器加 1。
func (c *upDownCounterWrapper) Inc(ctx context.Context, opts ...Option) {
	c.counter.Add(ctx, 1, metric.WithAttributes(
		combineAttributes(c.attributes, optionsToAttributes(opts))...,
	))
}

// Dec 将计数器减 1。
func (c *upDownCounterWrapper) Dec(ctx context.Context, opts ...Option) {
	c.counter.Add(ctx, -1, metric.WithAttributes(
		combineAttributes(c.attributes, optionsToAttributes(opts))...,
	))
}

// histogramWrapper 是对 OpenTelemetry Histogram 的封装。
type histogramWrapper struct {
	histogram  metric.Float64Histogram
	attributes Attributes
}

// Record 向直方图记录一个值。
func (h *histogramWrapper) Record(value float64, opts ...Option) {
	h.RecordContext(context.Background(), value, opts...)
}

func (h *histogramWrapper) RecordContext(ctx context.Context, value float64, opts ...Option) {
	h.histogram.Record(ctx, value, metric.WithAttributes(
		combineAttributes(h.attributes, optionsToAttributes(opts))...,
	))
}

func combineAttributes(base, extra Attributes) Attributes {
	attributes := make(Attributes, 0, len(base)+len(extra))
	attributes = append(attributes, base...)
	attributes = append(attributes, extra...)
	return attributes
}

// optionsToAttributes 将 Option 切片转换为 attribute.KeyValue 切片。
func optionsToAttributes(opts []Option) []attribute.KeyValue {
	if len(opts) == 0 {
		return nil
	}
	var totalSize int
	for _, opt := range opts {
		totalSize += len(opt.Attributes)
	}
	if totalSize == 0 {
		return nil
	}
	attributes := make([]attribute.KeyValue, 0, totalSize)
	for _, opt := range opts {
		attributes = append(attributes, opt.Attributes...)
	}
	return attributes
}

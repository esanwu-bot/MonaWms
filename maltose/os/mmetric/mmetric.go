package mmetric

import (
	"context"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/metric"
	sdkmetric "go.opentelemetry.io/otel/sdk/metric"
)

const (
	// defaultInstrument 是默认 meter 使用的埋点库名称。
	defaultInstrument = "github.com/graingo/maltose/os/mmetric"
)

// 指标属性的语义约定。
// 这些键名基于 OpenTelemetry 语义约定规范。
// 参见：https://opentelemetry.io/docs/specs/semconv/
const (
	// HTTP 相关属性。
	AttrHTTPRoute              = "http.route"
	AttrHTTPRequestMethod      = "http.request.method"
	AttrHTTPResponseStatusCode = "http.response.status_code"

	// 网络相关属性。
	AttrNetworkProtocolVersion = "network.protocol.version"
	AttrServerAddress          = "server.address"
	AttrServerPort             = "server.port"
	AttrClientAddress          = "client.address"

	// URL 相关属性。
	AttrURLScheme = "url.scheme"
	AttrURLPath   = "url.path"
	AttrURLHost   = "url.host"

	// 错误相关属性。
	AttrErrorCode = "error.code"
)

// Attributes 是 attribute.KeyValue 切片，用于为指标附加元数据。
// 使用 attribute.KeyValue 可以获得强类型属性，
// 这也是 OpenTelemetry 推荐的方式，性能更好且更不易出错。
//
// Example:
//
//	attrs := mmetric.Attributes{
//		attribute.String("request.method", "GET"),
//		attribute.Int("response.status_code", 200),
//	}
type Attributes []attribute.KeyValue

// MeterOption 是创建 meter 的选项，meter 负责创建各类埋点工具（如计数器、直方图）。
type MeterOption struct {
	// Instrument 是埋点库的名称。
	Instrument string
	// InstrumentVersion 是埋点库的版本。
	InstrumentVersion string
	// Attributes 是附加到该 meter 创建的全部指标上的属性列表。
	Attributes Attributes
}

// MetricOption 是创建指标工具（如 Counter、Histogram）的选项。
type MetricOption struct {
	// Help 是指标的简要说明，部分后端会在界面上展示该帮助文本。
	Help string
	// Unit 指定指标的单位，应符合 UCUM 标准。
	// 参见：https://unitsofmeasure.org/ucum.html
	Unit string
	// Attributes 是附加到该指标上的属性列表。
	Attributes Attributes
	// Buckets 定义直方图的桶边界，未设置时由 provider 使用默认桶。
	// 该字段仅对 Histogram 指标生效。
	Buckets []float64
}

// Option 是单次指标操作（如 Add、Inc）的选项。
type Option struct {
	// Attributes 是附加到本次指标观测上的属性列表。
	// 这些属性会与 Meter 和 Instrument 上的属性合并。
	Attributes Attributes
}

// Provider 是指标 provider 接口，负责创建 meter。
// 它是对 OpenTelemetry MeterProvider 的抽象。
type Provider interface {
	// Meter 按给定选项创建一个新的 meter。
	Meter(option MeterOption) Meter
	// Shutdown 优雅关闭 provider，确保缓存中的指标都被导出。
	Shutdown(ctx context.Context) error
}

// Meter 是指标 meter 接口，负责创建各类埋点工具。
// 它是对 OpenTelemetry Meter 的抽象。
type Meter interface {
	// Counter 创建新的计数器指标，计数只会递增。
	Counter(name string, option MetricOption) (Counter, error)
	// MustCounter 与 Counter 相同，但出错时 panic。
	MustCounter(name string, option MetricOption) Counter
	// UpDownCounter 创建新的可增可减计数器。
	UpDownCounter(name string, option MetricOption) (UpDownCounter, error)
	// MustUpDownCounter 与 UpDownCounter 相同，但出错时 panic。
	MustUpDownCounter(name string, option MetricOption) UpDownCounter
	// Histogram 创建新的直方图指标，用于衡量一组数值的分布情况。
	Histogram(name string, option MetricOption) (Histogram, error)
	// MustHistogram 与 Histogram 相同，但出错时 panic。
	MustHistogram(name string, option MetricOption) Histogram
}

// Counter 是计数器指标的接口。
type Counter interface {
	// Add 给计数器累加一个值，该值必须非负。
	Add(ctx context.Context, value float64, opts ...Option)
	// Inc 将计数器加 1。
	Inc(ctx context.Context, opts ...Option)
}

// UpDownCounter 是可增可减计数器指标的接口。
type UpDownCounter interface {
	// Add 给计数器累加一个值，该值可以为正也可以为负。
	Add(ctx context.Context, value float64, opts ...Option)
	// Inc 将计数器加 1。
	Inc(ctx context.Context, opts ...Option)
	// Dec 将计数器减 1。
	Dec(ctx context.Context, opts ...Option)
}

// Histogram 是直方图指标的接口。
type Histogram interface {
	// Record records a value in the histogram.
	Record(value float64, opts ...Option)
}

type contextHistogram interface {
	RecordContext(ctx context.Context, value float64, opts ...Option)
}

// RecordHistogram 在实现支持时携带调用方的 context 记录直方图数值，
// 同时保持对自定义 Histogram 实现的兼容。
func RecordHistogram(ctx context.Context, histogram Histogram, value float64, opts ...Option) {
	if recorder, ok := histogram.(contextHistogram); ok {
		recorder.RecordContext(ctx, value, opts...)
		return
	}
	histogram.Record(value, opts...)
}

// GetProvider 返回全局指标 provider，它是对 OpenTelemetry 默认 MeterProvider 的封装。
func GetProvider() Provider {
	return &otelProvider{
		provider: otel.GetMeterProvider(),
	}
}

// NewProvider 是对 sdkmetric.NewMeterProvider 的封装，
// 便于快速创建 OTel MeterProvider。
func NewProvider(opts ...sdkmetric.Option) *sdkmetric.MeterProvider {
	return sdkmetric.NewMeterProvider(opts...)
}

// SetProvider 设置全局指标 provider。
// 它是对 otel.SetMeterProvider 的便捷封装。
// 参数 `p` 应为实现了 metric.MeterProvider 接口的具体 provider，
// 通常由具体的 SDK 创建（例如 `*sdkmetric.MeterProvider`）。
func SetProvider(p metric.MeterProvider) {
	otel.SetMeterProvider(p)
}

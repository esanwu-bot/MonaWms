package mclient

import (
	"net/http"
	"time"

	"github.com/graingo/maltose/os/mmetric"
	"go.opentelemetry.io/otel/attribute"
)

// localMetricManager 是本地指标管理器。
type localMetricManager struct {
	HTTPClientRequestTotal         mmetric.Counter
	HTTPClientRequestDuration      mmetric.Histogram
	HTTPClientRequestDurationTotal mmetric.Counter
	HTTPClientRequestBodySize      mmetric.Counter
	HTTPClientResponseBodySize     mmetric.Counter
	HTTPpClientErrorTotal          mmetric.Counter
}

// 全局指标管理器
var metricManager = newMetricManager()

// 创建新的指标管理器
func newMetricManager() *localMetricManager {
	meter := mmetric.GetProvider().Meter(mmetric.MeterOption{
		Instrument:        instrumentName,
		InstrumentVersion: "v1.0.0",
	})
	return &localMetricManager{
		HTTPClientRequestDuration: meter.MustHistogram(
			"http.client.request.duration",
			mmetric.MetricOption{
				Help: "request duration",
				Unit: "ms",
			},
		),
		HTTPClientRequestTotal: meter.MustCounter(
			"http.client.request.total",
			mmetric.MetricOption{
				Help: "request total",
				Unit: "",
			},
		),
		HTTPClientRequestDurationTotal: meter.MustCounter(
			"http.client.request.duration_total",
			mmetric.MetricOption{
				Help: "request duration total",
				Unit: "ms",
			},
		),
		HTTPClientRequestBodySize: meter.MustCounter(
			"http.client.request.body_size",
			mmetric.MetricOption{
				Help: "request body size",
				Unit: "bytes",
			},
		),
		HTTPClientResponseBodySize: meter.MustCounter(
			"http.client.response.body_size",
			mmetric.MetricOption{
				Help: "response body size",
				Unit: "bytes",
			},
		),
		HTTPpClientErrorTotal: meter.MustCounter(
			"http.client.error.total",
			mmetric.MetricOption{
				Help: "error total",
				Unit: "",
			},
		),
	}
}

// 请求发出前采集指标
func handleMetricsBeforeRequest(req *http.Request) {
	var (
		ctx        = req.Context()
		attributes = []attribute.KeyValue{
			attribute.String(mmetric.AttrURLHost, getHost(req.URL)),
			attribute.String(mmetric.AttrURLPath, getPath(req.URL)),
			attribute.String(mmetric.AttrURLScheme, getSchema(req.URL)),
			attribute.String(mmetric.AttrHTTPRequestMethod, req.Method),
			attribute.String(mmetric.AttrNetworkProtocolVersion, getProtocolVersion(req.Proto)),
		}
	)

	metricManager.HTTPClientRequestBodySize.Add(
		ctx,
		float64(req.ContentLength),
		mmetric.WithAttributes(attributes...),
	)
}

// 请求完成后采集指标
func handleMetricsAfterRequestDone(req *http.Request, resp *http.Response, err error, startTime time.Time) {
	var (
		ctx           = req.Context()
		durationMilli = float64(time.Since(startTime).Milliseconds())
		attributes    = make([]attribute.KeyValue, 0, 7)
	)

	attributes = append(attributes,
		attribute.String(mmetric.AttrURLHost, getHost(req.URL)),
		attribute.String(mmetric.AttrURLPath, getPath(req.URL)),
		attribute.String(mmetric.AttrURLScheme, getSchema(req.URL)),
		attribute.String(mmetric.AttrHTTPRequestMethod, req.Method),
		attribute.String(mmetric.AttrNetworkProtocolVersion, getProtocolVersion(req.Proto)),
	)

	if resp != nil {
		attributes = append(attributes, attribute.Int(mmetric.AttrHTTPResponseStatusCode, resp.StatusCode))
	}

	if err != nil {
		attributes = append(attributes, attribute.Int(mmetric.AttrErrorCode, 1))
	}

	metricManager.HTTPClientRequestTotal.Inc(ctx, mmetric.WithAttributes(attributes...))
	mmetric.RecordHistogram(ctx, metricManager.HTTPClientRequestDuration, durationMilli, mmetric.WithAttributes(attributes...))
	metricManager.HTTPClientRequestDurationTotal.Add(ctx, durationMilli, mmetric.WithAttributes(attributes...))

	if resp != nil {
		metricManager.HTTPClientResponseBodySize.Add(
			ctx,
			float64(resp.ContentLength),
			mmetric.WithAttributes(attributes...),
		)
	}

	if err != nil {
		metricManager.HTTPpClientErrorTotal.Inc(ctx, mmetric.WithAttributes(attributes...))
	}
}

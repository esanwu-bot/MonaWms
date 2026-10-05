package middleware

import (
	"io"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/graingo/maltose/net/mhttp"
)

// newRequest 构造可用于取值测试的 Request（不依赖服务端实例）。
func newRequest(method, target, body string, header map[string]string) *mhttp.Request {
	gin.SetMode(gin.TestMode)
	reader := strings.NewReader(body)
	ginRequest := httptest.NewRequest(method, target, reader)
	for key, value := range header {
		ginRequest.Header.Set(key, value)
	}
	ginContext, _ := gin.CreateTestContext(httptest.NewRecorder())
	ginContext.Request = ginRequest
	return &mhttp.Request{Context: ginContext}
}

func TestResolveWarehouseIDFromSources(t *testing.T) {
	cases := []struct {
		name   string
		method string
		target string
		body   string
		header map[string]string
		want   int
	}{
		{"查询串", "GET", "/api/inventory?warehouse_id=3", "", nil, 3},
		{"请求头", "GET", "/api/inventory", "", map[string]string{"X-Warehouse-Id": "5"}, 5},
		{"查询串优先于请求头", "GET", "/api/inventory?warehouse_id=3", "", map[string]string{"X-Warehouse-Id": "5"}, 3},
		{"JSON 请求体", "POST", "/api/inventory", `{"warehouse_id":7}`,
			map[string]string{"Content-Type": "application/json"}, 7},
		{"非 JSON 请求体不解析", "POST", "/api/inventory", `{"warehouse_id":7}`,
			map[string]string{"Content-Type": "application/x-www-form-urlencoded"}, 0},
		{"非法值忽略", "GET", "/api/inventory?warehouse_id=abc", "", map[string]string{"X-Warehouse-Id": "-1"}, 0},
		{"未携带仓库上下文", "GET", "/api/inventory", "", nil, 0},
	}

	for _, item := range cases {
		t.Run(item.name, func(t *testing.T) {
			request := newRequest(item.method, item.target, item.body, item.header)
			if got := resolveWarehouseID(request); got != item.want {
				t.Fatalf("解析结果=%d, 期望 %d", got, item.want)
			}
		})
	}
}

func TestJSONBodyRestoredAfterInspect(t *testing.T) {
	request := newRequest("POST", "/api/inventory", `{"warehouse_id":9,"keyword":"abc"}`,
		map[string]string{"Content-Type": "application/json"})

	if got := resolveWarehouseID(request); got != 9 {
		t.Fatalf("应能从 JSON 请求体解析仓库 ID，实际 %d", got)
	}

	raw, err := io.ReadAll(request.Request.Body)
	if err != nil {
		t.Fatalf("重读请求体失败: %v", err)
	}
	if string(raw) != `{"warehouse_id":9,"keyword":"abc"}` {
		t.Fatalf("请求体应被完整回填，实际: %s", string(raw))
	}
}

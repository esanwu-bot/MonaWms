package cmd_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"

	"github.com/esanwu-bot/monawms-backend/cmd"
	"github.com/graingo/maltose/errors/mcode"
	"github.com/graingo/maltose/net/mhttp"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// responseEnvelope 是 Maltose 标准响应结构。
type responseEnvelope struct {
	Code    int            `json:"code"`
	Message string         `json:"message"`
	Data    map[string]any `json:"data"`
}

// testServer 保证整个测试过程中只装配一次服务端，避免重复注册路由。
var (
	testServer     *mhttp.Server
	testServerOnce sync.Once
)

func serverOf(t *testing.T) *mhttp.Server {
	t.Helper()
	testServerOnce.Do(func() {
		testServer = cmd.HTTPServer()
	})
	require.NotNil(t, testServer)
	return testServer
}

func doRequest(t *testing.T, method, target, body, authorization string) (int, responseEnvelope) {
	t.Helper()

	request := httptest.NewRequest(method, target, strings.NewReader(body))
	if body != "" {
		request.Header.Set("Content-Type", "application/json")
	}
	if authorization != "" {
		request.Header.Set("Authorization", authorization)
	}
	recorder := httptest.NewRecorder()
	serverOf(t).ServeHTTP(recorder, request)

	var envelope responseEnvelope
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &envelope))
	return recorder.Code, envelope
}

func TestAuthProtectedRoutesRequireToken(t *testing.T) {
	tests := []struct {
		name   string
		method string
		target string
	}{
		{name: "profile", method: http.MethodGet, target: "/api/auth/profile"},
		{name: "update profile", method: http.MethodPut, target: "/api/auth/profile"},
		{name: "logout", method: http.MethodPost, target: "/api/auth/logout"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			status, envelope := doRequest(t, tt.method, tt.target, "", "")
			assert.Equal(t, http.StatusUnauthorized, status)
			assert.Equal(t, mcode.CodeNotAuthorized.Code(), envelope.Code)
		})
	}
}

func TestAuthInvalidToken(t *testing.T) {
	tests := []struct {
		name          string
		authorization string
	}{
		{name: "missing bearer prefix", authorization: "abc.def.ghi"},
		{name: "invalid token", authorization: "Bearer invalid.token.value"},
		{name: "empty bearer token", authorization: "Bearer "},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			status, envelope := doRequest(t, http.MethodGet, "/api/auth/profile", "", tt.authorization)
			assert.Equal(t, http.StatusUnauthorized, status)
			assert.Equal(t, mcode.CodeNotAuthorized.Code(), envelope.Code)
		})
	}
}

func TestAuthPublicRoutesSkipAuthorization(t *testing.T) {
	// 登录与刷新属于白名单路由，参数非法时应返回校验错误而不是未授权。
	for _, target := range []string{"/api/auth/login", "/api/auth/refresh"} {
		t.Run(target, func(t *testing.T) {
			status, envelope := doRequest(t, http.MethodPost, target, `{}`, "")
			assert.Equal(t, http.StatusBadRequest, status)
			assert.Equal(t, mcode.CodeValidationFailed.Code(), envelope.Code)
		})
	}
}

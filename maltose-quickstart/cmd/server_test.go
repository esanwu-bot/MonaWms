package cmd_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/graingo/maltose-quickstart/cmd"
	"github.com/graingo/maltose/errors/mcode"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type responseEnvelope struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Data    *struct {
		Name string `json:"name"`
	} `json:"data"`
}

func TestHTTPServer(t *testing.T) {
	server := cmd.HTTPServer()

	tests := []struct {
		name       string
		method     string
		target     string
		body       string
		wantStatus int
		wantCode   int
		wantName   string
	}{
		{
			name:       "hello v1",
			method:     http.MethodGet,
			target:     "/api/v1/hello?name=Maltose",
			wantStatus: http.StatusOK,
			wantCode:   mcode.CodeOK.Code(),
			wantName:   "Hello, Maltose!",
		},
		{
			name:       "bye v1",
			method:     http.MethodPost,
			target:     "/api/v1/bye",
			body:       `{"name":"Maltose"}`,
			wantStatus: http.StatusOK,
			wantCode:   mcode.CodeOK.Code(),
			wantName:   "Goodbye, Maltose!",
		},
		{
			name:       "bye v2",
			method:     http.MethodPost,
			target:     "/api/v2/bye",
			body:       `{"name":"Maltose"}`,
			wantStatus: http.StatusOK,
			wantCode:   mcode.CodeOK.Code(),
			wantName:   "See you again, Maltose!",
		},
		{
			name:       "validation failure",
			method:     http.MethodGet,
			target:     "/api/v1/hello",
			wantStatus: http.StatusBadRequest,
			wantCode:   mcode.CodeValidationFailed.Code(),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			request := httptest.NewRequest(tt.method, tt.target, bytes.NewBufferString(tt.body))
			if tt.body != "" {
				request.Header.Set("Content-Type", "application/json")
			}
			recorder := httptest.NewRecorder()

			server.ServeHTTP(recorder, request)

			assert.Equal(t, tt.wantStatus, recorder.Code)
			var response responseEnvelope
			require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &response))
			assert.Equal(t, tt.wantCode, response.Code)
			if tt.wantName == "" {
				assert.Nil(t, response.Data)
				return
			}
			if assert.NotNil(t, response.Data) {
				assert.Equal(t, tt.wantName, response.Data.Name)
			}
		})
	}
}

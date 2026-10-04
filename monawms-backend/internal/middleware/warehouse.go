package middleware

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"strconv"
	"strings"

	"github.com/esanwu-bot/monawms-backend/internal/dao"
	"github.com/esanwu-bot/monawms-backend/internal/pkg/permission"
	"github.com/esanwu-bot/monawms-backend/internal/pkg/scope"
	"github.com/esanwu-bot/monawms-backend/internal/pkg/token"
	"github.com/graingo/maltose/errors/mcode"
	"github.com/graingo/maltose/errors/merror"
	"github.com/graingo/maltose/frame/m"
	"github.com/graingo/maltose/net/mhttp"
)

const (
	// warehouseIDHeader 是前端仓库切换器统一携带的请求头，与原 PHP 后端一致。
	warehouseIDHeader = "X-Warehouse-Id"
	// warehouseIDField 是仓库 ID 在查询串/表单/请求体中的字段名。
	warehouseIDField = "warehouse_id"
	// inspectBodyLimit 是探测 JSON 请求体的最大字节数，避免大 body 被整体读入内存。
	inspectBodyLimit = 1 << 20
	// grantStatusActive 是授权记录的生效状态（user_warehouse_grant.status）。
	grantStatusActive = "active"
)

// WarehouseScope 解析 X-Warehouse-Id，校验「账号 × 仓库」二维授权，并把授权态写入 context。
//
// 行为与原 PHP 的 app\middleware\WarehouseScope 保持一致：
//  1. 仓库 ID 解析优先级：查询串/表单 > 请求头 X-Warehouse-Id > JSON 请求体；
//  2. 解析到仓库但未授权 → 403（除非开启 permission.admin_bypass_warehouse 且全局角色为 admin）；
//  3. 未解析到仓库时不拦截，但授权集合仍写入 context，供列表级过滤使用。
//
// 必须在 Auth 中间件之后执行。
func WarehouseScope() mhttp.MiddlewareFunc {
	return func(r *mhttp.Request) {
		ctx := r.Request.Context()

		identity, ok := token.IdentityFromCtx(ctx)
		if !ok {
			// 白名单路由（登录/注册/刷新）没有登录身份，直接放行。
			r.Next()
			return
		}

		grants, err := loadGrants(ctx, identity.UserID)
		if err != nil {
			r.Error(err)
			r.Abort()
			return
		}

		current := scope.Context{
			UserID: identity.UserID,
			Role:   identity.Role,
			Grants: grants,
		}

		if warehouseID := resolveWarehouseID(r); warehouseID > 0 {
			grantRole, granted := grants[warehouseID]
			if !granted {
				// 严格模式（默认）下 admin 同样需要授权，豁免开关打开时才放行。
				if !(identity.Role == permission.RoleAdmin && permission.AdminBypass(ctx)) {
					r.Error(merror.NewCode(mcode.CodeForbidden, "该账号未被授权访问此仓库"))
					r.Abort()
					return
				}
				grantRole = permission.GrantRoleManager
			}
			current.WarehouseID = warehouseID
			current.GrantRole = grantRole
		}

		r.Request = r.Request.WithContext(scope.With(ctx, current))
		r.Next()
	}
}

// loadGrants 取账号全部有效授权，返回「仓库ID -> 仓库角色」映射。
func loadGrants(ctx context.Context, userID int) (scope.Grants, error) {
	list, err := dao.NewUserWarehouseGrantDao(m.DB()).FindList(ctx, map[string]any{
		"user_id": userID,
		"status":  grantStatusActive,
	})
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "查询仓库授权失败")
	}

	grants := make(scope.Grants, len(list))
	for _, item := range list {
		grants[item.WarehouseId] = item.GrantRole
	}
	return grants, nil
}

// resolveWarehouseID 按优先级从请求各位置解析仓库 ID，取不到时返回 0。
func resolveWarehouseID(r *mhttp.Request) int {
	if value := parsePositiveInt(r.Query(warehouseIDField)); value > 0 {
		return value
	}
	if value := parsePositiveInt(r.PostForm(warehouseIDField)); value > 0 {
		return value
	}
	if value := parsePositiveInt(r.Request.Header.Get(warehouseIDHeader)); value > 0 {
		return value
	}
	return fromJSONBody(r)
}

// fromJSONBody 从 JSON 请求体中取 warehouse_id。
// 读取后必须回填 body，否则下游 handler 无法再次绑定请求体。
func fromJSONBody(r *mhttp.Request) int {
	if r.Request.Body == nil {
		return 0
	}
	if !strings.Contains(strings.ToLower(r.Request.Header.Get("Content-Type")), "application/json") {
		return 0
	}

	raw, err := io.ReadAll(io.LimitReader(r.Request.Body, inspectBodyLimit))
	if err != nil {
		return 0
	}
	// 无论是否命中都必须回填：原 body 已被消费。
	r.Request.Body = io.NopCloser(bytes.NewReader(raw))
	if len(raw) == 0 {
		return 0
	}

	var payload map[string]any
	if err := json.Unmarshal(raw, &payload); err != nil {
		return 0
	}
	return parsePositiveInt(anyToString(payload[warehouseIDField]))
}

// anyToString 把 JSON 中的标量统一转成字符串，避免浮点转字符串出现科学计数法。
func anyToString(value any) string {
	switch typed := value.(type) {
	case string:
		return typed
	case float64:
		return strconv.FormatFloat(typed, 'f', -1, 64)
	case json.Number:
		return typed.String()
	default:
		return ""
	}
}

func parsePositiveInt(raw string) int {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return 0
	}
	value, err := strconv.Atoi(raw)
	if err != nil || value <= 0 {
		return 0
	}
	return value
}

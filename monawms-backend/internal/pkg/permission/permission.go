// Package permission 实现「账号 × 仓库」二维权限判定，
// 规则移植自原 PHP 后端 config/permission.php，保持语义一致。
package permission

import (
	"context"

	"github.com/esanwu-bot/monawms-backend/internal/pkg/scope"
	"github.com/esanwu-bot/monawms-backend/internal/pkg/token"
	"github.com/graingo/maltose/errors/mcode"
	"github.com/graingo/maltose/errors/merror"
	"github.com/graingo/maltose/frame/m"
)

// 全局角色取值。
const (
	RoleAdmin    = "admin"
	RoleOperator = "operator"
)

// 仓库级授权角色取值。
const (
	GrantRoleManager  = "manager"
	GrantRoleOperator = "operator"
)

// 系统级动作：仅全局 admin 可做，与仓库授权无关。
var systemActions = map[string]struct{}{
	"user:manage":     {},
	"grant:manage":    {},
	"warehouse:write": {},
	"zone:write":      {},
	"location:write":  {},
	"product:write":   {},
	"category:write":  {},
	"supplier:write":  {},
	"customer:write":  {},
	"report:global":   {},
}

// 仓库级动作 → 允许的 grant_role 列表。未登记的动作一律拒绝。
var warehouseActions = map[string][]string{
	"inbound:write":         {GrantRoleManager, GrantRoleOperator},
	"outbound:write":        {GrantRoleManager, GrantRoleOperator},
	"stocktake:write":       {GrantRoleManager, GrantRoleOperator},
	"inventory:read":        {GrantRoleManager, GrantRoleOperator},
	"report:export":         {GrantRoleManager, GrantRoleOperator},
	"inbound:post":          {GrantRoleManager},
	"outbound:post":         {GrantRoleManager},
	"stocktake:post":        {GrantRoleManager},
	"inventory:adjust":      {GrantRoleManager},
	"inventory:transfer":    {GrantRoleManager},
	"doc:reverse":           {GrantRoleManager},
	"location:write_scoped": {GrantRoleManager},
}

// AdminBypass 读取「系统管理员豁免仓库授权」开关，默认 false（严格模式）。
func AdminBypass(ctx context.Context) bool {
	return m.Config().MustGetBool(ctx, "permission.admin_bypass_warehouse", false)
}

// IsSystemAction 判断动作是否为系统级动作。
func IsSystemAction(action string) bool {
	_, ok := systemActions[action]
	return ok
}

// CanSystem 判定系统级动作：仅全局角色为 admin 时允许。
func CanSystem(ctx context.Context, action string) bool {
	if !IsSystemAction(action) {
		return false
	}
	identity, ok := token.IdentityFromCtx(ctx)
	return ok && identity.Role == RoleAdmin
}

// CanWarehouse 判定仓库级动作：必须有该仓库授权，且 grant_role 在允许列表内。
func CanWarehouse(ctx context.Context, action string, warehouseID int) bool {
	allowed, ok := warehouseActions[action]
	if !ok || warehouseID <= 0 {
		return false // 动作未登记或缺少仓库上下文 → 默认拒绝
	}

	identity, ok := token.IdentityFromCtx(ctx)
	if !ok {
		return false
	}
	current, ok := scope.From(ctx)
	if !ok {
		return false
	}

	if identity.Role == RoleAdmin && AdminBypass(ctx) {
		return true
	}

	grantRole, granted := current.Grants[warehouseID]
	if !granted {
		return false
	}
	for _, role := range allowed {
		if role == grantRole {
			return true
		}
	}
	return false
}

// Can 统一判定入口：系统级动作走全局角色，其余走仓库授权。
// warehouseID 为 0 时表示动作不带仓库上下文。
func Can(ctx context.Context, action string, warehouseID int) bool {
	if IsSystemAction(action) {
		return CanSystem(ctx, action)
	}
	return CanWarehouse(ctx, action, warehouseID)
}

// Require 判定并按需返回 403 错误：先判仓库授权，再判动作权限，便于前端区分提示。
func Require(ctx context.Context, action string, warehouseID int) error {
	if IsSystemAction(action) {
		if !CanSystem(ctx, action) {
			return merror.NewCode(mcode.CodeForbidden, "权限不足")
		}
		return nil
	}

	current, _ := scope.From(ctx)
	identity, _ := token.IdentityFromCtx(ctx)
	if warehouseID <= 0 {
		return merror.NewCode(mcode.CodeForbidden, "权限不足")
	}
	if _, granted := current.Grants[warehouseID]; !granted {
		if !(identity.Role == RoleAdmin && AdminBypass(ctx)) {
			return merror.NewCode(mcode.CodeForbidden, "该账号未被授权访问此仓库")
		}
	}
	if !CanWarehouse(ctx, action, warehouseID) {
		return merror.NewCode(mcode.CodeForbidden, "权限不足")
	}
	return nil
}

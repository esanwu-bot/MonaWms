package permission

import (
	"context"
	"testing"

	"github.com/esanwu-bot/monawms-backend/internal/pkg/scope"
	"github.com/esanwu-bot/monawms-backend/internal/pkg/token"
)

// ctxWith 构造「身份 + 授权集合」的请求上下文。
func ctxWith(role string, grants scope.Grants) context.Context {
	ctx := token.WithIdentity(context.Background(), token.Identity{UserID: 1, Username: "tester", Role: role})
	return scope.With(ctx, scope.Context{UserID: 1, Role: role, Grants: grants})
}

func TestIsSystemAction(t *testing.T) {
	for _, action := range []string{"user:manage", "grant:manage", "warehouse:write", "product:write"} {
		if !IsSystemAction(action) {
			t.Fatalf("%s 应被判定为系统级动作", action)
		}
	}
	for _, action := range []string{"inbound:write", "outbound:post", "unknown:action"} {
		if IsSystemAction(action) {
			t.Fatalf("%s 不应被判定为系统级动作", action)
		}
	}
}

func TestCanSystem(t *testing.T) {
	cases := []struct {
		name   string
		role   string
		action string
		want   bool
	}{
		{"管理员可写主数据", RoleAdmin, "product:write", true},
		{"录入员不可写主数据", RoleOperator, "product:write", false},
		{"未登录不可写主数据", "", "product:write", false},
	}
	for _, item := range cases {
		t.Run(item.name, func(t *testing.T) {
			if got := CanSystem(ctxWith(item.role, nil), item.action); got != item.want {
				t.Fatalf("CanSystem=%v, 期望 %v", got, item.want)
			}
		})
	}
}

func TestCanWarehouse(t *testing.T) {
	grants := scope.Grants{11: GrantRoleManager, 12: GrantRoleOperator}

	cases := []struct {
		name        string
		role        string
		action      string
		warehouseID int
		want        bool
	}{
		{"仓库管理员可过账入库", RoleOperator, "inbound:post", 11, true},
		{"仓库录入员不可过账入库", RoleOperator, "inbound:post", 12, false},
		{"仓库录入员可录入入库", RoleOperator, "inbound:write", 12, true},
		{"未授权仓库一律拒绝", RoleOperator, "inbound:write", 99, false},
		{"缺少仓库上下文拒绝", RoleOperator, "inbound:write", 0, false},
		{"未登记动作一律拒绝", RoleOperator, "unknown:action", 11, false},
	}
	for _, item := range cases {
		t.Run(item.name, func(t *testing.T) {
			got := CanWarehouse(ctxWith(item.role, grants), item.action, item.warehouseID)
			if got != item.want {
				t.Fatalf("CanWarehouse=%v, 期望 %v", got, item.want)
			}
		})
	}
}

func TestRequire区分未授权与权限不足(t *testing.T) {
	grants := scope.Grants{11: GrantRoleManager}

	// 已授权仓库 + 角色足够 → 通过
	if err := Require(ctxWith(RoleOperator, grants), "inbound:post", 11); err != nil {
		t.Fatalf(" Managers 应可过账，实际错误: %v", err)
	}

	// 未授权仓库 → 提示未授权
	err := Require(ctxWith(RoleOperator, grants), "inbound:post", 99)
	if err == nil {
		t.Fatal("未授权仓库应返回错误")
	}
	if message := err.Error(); message != "该账号未被授权访问此仓库" {
		t.Fatalf("未授权仓库文案不符: %s", message)
	}

	// 已授权但角色不足 → 提示权限不足
	err = Require(ctxWith(RoleOperator, scope.Grants{12: GrantRoleOperator}), "inbound:post", 12)
	if err == nil {
		t.Fatal("角色不足应返回错误")
	}
	if message := err.Error(); message != "权限不足" {
		t.Fatalf("角色不足文案不符: %s", message)
	}
}

package scope

import (
	"context"
	"sort"
	"testing"
)

func TestWithAndFrom(t *testing.T) {
	grants := Grants{1: "manager", 2: "operator"}
	target := Context{
		UserID:      7,
		Role:        "operator",
		WarehouseID: 1,
		GrantRole:   "manager",
		Grants:      grants,
	}

	ctx := With(context.Background(), target)
	got, ok := From(ctx)
	if !ok {
		t.Fatal("应能从 context 取出仓库作用域")
	}
	if got.UserID != 7 || got.WarehouseID != 1 || got.GrantRole != "manager" {
		t.Fatalf("取出作用域与预期不符: %+v", got)
	}
	if !got.Granted(1) || got.Granted(9) {
		t.Fatal("授权判定错误")
	}
	if got.RoleIn(2) != "operator" || got.RoleIn(9) != "" {
		t.Fatal("仓库角色判定错误")
	}

	ids := got.WarehouseIDs()
	sort.Ints(ids)
	if len(ids) != 2 || ids[0] != 1 || ids[1] != 2 {
		t.Fatalf("授权仓库集合错误: %v", ids)
	}
}

func TestFromEmpty(t *testing.T) {
	if _, ok := From(context.Background()); ok {
		t.Fatal("未注入作用域时应返回 false")
	}
}

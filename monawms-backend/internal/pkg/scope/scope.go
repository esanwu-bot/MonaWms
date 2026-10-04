// Package scope 描述「账号 × 仓库」二维授权的当前请求作用域，
// 由 internal/middleware 解析 X-Warehouse-Id 后写入 context 向下游传递。
package scope

import "context"

// Grants 是「仓库ID -> 仓库角色」的有效授权集合。
type Grants map[int]string

// Context 是当前请求的仓库作用域上下文。
type Context struct {
	// UserID 是当前登录账号 ID。
	UserID int
	// Role 是账号的全局角色（users.role）。
	Role string
	// WarehouseID 是当前请求指定的仓库 ID，0 表示未指定仓库上下文。
	WarehouseID int
	// GrantRole 是账号在当前仓库的授权角色（user_warehouse_grant.grant_role）。
	GrantRole string
	// Grants 是该账号全部有效授权，用于列表级过滤与跨仓库校验。
	Grants Grants
}

type contextKey struct{}

// With 返回携带仓库作用域的 context。
func With(ctx context.Context, c Context) context.Context {
	return context.WithValue(ctx, contextKey{}, c)
}

// From 取出仓库作用域，未注入时返回 false。
func From(ctx context.Context) (Context, bool) {
	c, ok := ctx.Value(contextKey{}).(Context)
	return c, ok
}

// Granted 判断账号是否被授权某个仓库。
func (c Context) Granted(warehouseID int) bool {
	_, ok := c.Grants[warehouseID]
	return ok
}

// RoleIn 返回账号在指定仓库的授权角色，未授权时返回空字符串。
func (c Context) RoleIn(warehouseID int) string {
	return c.Grants[warehouseID]
}

// WarehouseIDs 返回该账号全部被授权仓库 ID 的升序切片，便于 IN 查询。
func (c Context) WarehouseIDs() []int {
	ids := make([]int, 0, len(c.Grants))
	for id := range c.Grants {
		ids = append(ids, id)
	}
	return ids
}

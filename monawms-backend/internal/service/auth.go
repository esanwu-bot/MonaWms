// =================================================================================
// 代码由 Maltose 工具生成并维护，可按需自行修改。
// =================================================================================
package service

import (
	"context"

	"github.com/esanwu-bot/monawms-backend/api/auth/v1"
)

type IAuth interface {
	// Login 校验账号密码并签发访问令牌与刷新令牌。
	Login(ctx context.Context, req *v1.LoginReq) (res *v1.LoginRes, err error)
	// Register 注册新账号，默认角色为 viewer。
	Register(ctx context.Context, req *v1.RegisterReq) (res *v1.RegisterRes, err error)
	// Refresh 用刷新令牌换取新的访问令牌与刷新令牌。
	Refresh(ctx context.Context, req *v1.RefreshReq) (res *v1.RefreshRes, err error)
	// Profile 查询当前登录用户信息。
	Profile(ctx context.Context, req *v1.ProfileReq) (res *v1.ProfileRes, err error)
	// UpdateProfile 更新当前登录用户的资料或密码。
	UpdateProfile(ctx context.Context, req *v1.UpdateProfileReq) (res *v1.UpdateProfileRes, err error)
	// Logout 退出登录，服务端无状态变更。
	Logout(ctx context.Context, req *v1.LogoutReq) (res *v1.LogoutRes, err error)
}

var localAuth IAuth

// Auth 返回 IAuth 已注册的实现。
// 若未注册任何实现则会 panic。
func Auth() IAuth {
	if localAuth == nil {
		panic("implement not found for interface IAuth, forgot register?")
	}
	return localAuth
}

// RegisterAuth 为 IAuth 接口注册实现。
func RegisterAuth(i IAuth) {
	localAuth = i
}

// =================================================================================
// 代码由 Maltose 工具生成并维护，可按需自行修改。
// =================================================================================
package auth

import (
	"context"

	"github.com/esanwu-bot/monawms-backend/api/auth/v1"
	"github.com/esanwu-bot/monawms-backend/internal/service"
)

// Login 是 Login API 的处理函数。
func (c *AuthV1) Login(ctx context.Context, req *v1.LoginReq) (res *v1.LoginRes, err error) {
	return service.Auth().Login(ctx, req)
}

// Register 是 Register API 的处理函数。
func (c *AuthV1) Register(ctx context.Context, req *v1.RegisterReq) (res *v1.RegisterRes, err error) {
	return service.Auth().Register(ctx, req)
}

// Refresh 是 Refresh API 的处理函数。
func (c *AuthV1) Refresh(ctx context.Context, req *v1.RefreshReq) (res *v1.RefreshRes, err error) {
	return service.Auth().Refresh(ctx, req)
}

// Profile 是 Profile API 的处理函数。
func (c *AuthV1) Profile(ctx context.Context, req *v1.ProfileReq) (res *v1.ProfileRes, err error) {
	return service.Auth().Profile(ctx, req)
}

// UpdateProfile 是 UpdateProfile API 的处理函数。
func (c *AuthV1) UpdateProfile(ctx context.Context, req *v1.UpdateProfileReq) (res *v1.UpdateProfileRes, err error) {
	return service.Auth().UpdateProfile(ctx, req)
}

// Logout 是 Logout API 的处理函数。
func (c *AuthV1) Logout(ctx context.Context, req *v1.LogoutReq) (res *v1.LogoutRes, err error) {
	return service.Auth().Logout(ctx, req)
}

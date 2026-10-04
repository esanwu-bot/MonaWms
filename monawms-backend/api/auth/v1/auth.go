package v1

import "github.com/graingo/maltose/frame/m"

// UserInfo 是返回给前端的用户信息，字段名与原 PHP 后端保持一致。
type UserInfo struct {
	Id          int    `json:"id"`
	Username    string `json:"username"`
	RealName    string `json:"real_name,omitempty"`
	Email       string `json:"email"`
	Role        string `json:"role"`
	RoleText    string `json:"role_text"`
	Status      string `json:"status"`
	StatusText  string `json:"status_text"`
	CreatedAt   string `json:"created_at,omitempty"`
	LastLoginAt string `json:"last_login_at,omitempty"`
}

// LoginReq 是登录接口的入参。
type LoginReq struct {
	m.Meta   `method:"POST" path:"/auth/login" summary:"用户登录" tag:"认证"`
	Username string `json:"username" dc:"用户名" binding:"required,max=50"`
	Password string `json:"password" dc:"密码" binding:"required,min=6"`
}

// LoginRes 是登录接口返回的数据。
type LoginRes struct {
	Token        string   `json:"token"`
	RefreshToken string   `json:"refreshToken"`
	User         UserInfo `json:"user"`
}

// RegisterReq 是注册接口的入参。
type RegisterReq struct {
	m.Meta          `method:"POST" path:"/auth/register" summary:"用户注册" tag:"认证"`
	Username        string `json:"username" dc:"用户名" binding:"required,max=50"`
	Email           string `json:"email" dc:"邮箱" binding:"required,email"`
	Password        string `json:"password" dc:"密码" binding:"required,min=6"`
	PasswordConfirm string `json:"password_confirm" dc:"确认密码" binding:"required"`
	Role            string `json:"role" dc:"角色，取值 admin/manager/operator/viewer"`
	RealName        string `json:"real_name" dc:"姓名"`
	Phone           string `json:"phone" dc:"手机号"`
}

// RegisterRes 是注册接口返回的数据。
type RegisterRes struct {
	User UserInfo `json:"user"`
}

// RefreshReq 是刷新 token 接口的入参。
type RefreshReq struct {
	m.Meta       `method:"POST" path:"/auth/refresh" summary:"刷新Token" tag:"认证"`
	RefreshToken string `json:"refreshToken" dc:"刷新令牌" binding:"required"`
}

// RefreshRes 是刷新 token 接口返回的数据。
type RefreshRes struct {
	Token        string `json:"token"`
	RefreshToken string `json:"refreshToken"`
}

// ProfileReq 是查询当前用户信息接口的入参。
type ProfileReq struct {
	m.Meta `method:"GET" path:"/auth/profile" summary:"获取当前用户信息" tag:"认证"`
}

// ProfileRes 是查询当前用户信息接口返回的数据。
type ProfileRes struct {
	User UserInfo `json:"user"`
}

// UpdateProfileReq 是更新当前用户信息接口的入参。
type UpdateProfileReq struct {
	m.Meta             `method:"PUT" path:"/auth/profile" summary:"更新当前用户信息" tag:"认证"`
	Email              string `json:"email" dc:"邮箱" binding:"omitempty,email"`
	RealName           string `json:"real_name" dc:"姓名"`
	Phone              string `json:"phone" dc:"手机号"`
	OldPassword        string `json:"old_password" dc:"原密码"`
	NewPassword        string `json:"new_password" dc:"新密码" binding:"omitempty,min=6"`
	NewPasswordConfirm string `json:"new_password_confirm" dc:"确认新密码"`
}

// UpdateProfileRes 是更新当前用户信息接口返回的数据。
type UpdateProfileRes struct {
	User UserInfo `json:"user"`
}

// LogoutReq 是退出登录接口的入参。
type LogoutReq struct {
	m.Meta `method:"POST" path:"/auth/logout" summary:"退出登录" tag:"认证"`
}

// LogoutRes 是退出登录接口返回的数据。
type LogoutRes struct{}

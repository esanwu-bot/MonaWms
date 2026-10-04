// =================================================================================
// 代码由 Maltose 工具生成并维护，可按需自行修改。
// =================================================================================
package auth

import (
	"context"
	"time"

	"github.com/esanwu-bot/monawms-backend/api/auth/v1"
	"github.com/esanwu-bot/monawms-backend/internal/dao"
	"github.com/esanwu-bot/monawms-backend/internal/model/entity"
	"github.com/esanwu-bot/monawms-backend/internal/pkg/token"
	"github.com/esanwu-bot/monawms-backend/internal/service"
	"github.com/graingo/maltose/errors/mcode"
	"github.com/graingo/maltose/errors/merror"
	"github.com/graingo/maltose/frame/m"
	"golang.org/x/crypto/bcrypt"
)

// 用户状态与角色取值，与数据表枚举保持一致。
const (
	statusActive   = "active"
	statusInactive = "inactive"

	roleAdmin    = "admin"
	roleManager  = "manager"
	roleOperator = "operator"
	roleViewer   = "viewer"

	defaultRegisterRole = roleViewer
)

func init() {
	service.RegisterAuth(New())
}

type sAuth struct{}

// New 创建一个新的 service logic 实现。
func New() service.IAuth {
	return &sAuth{}
}

// Login 校验账号密码，签发访问令牌与刷新令牌，并回写最后登录时间。
func (s *sAuth) Login(ctx context.Context, input *v1.LoginReq) (output *v1.LoginRes, err error) {
	output = new(v1.LoginRes)

	user, err := dao.NewUserDao(m.DB()).FindOne(ctx, map[string]any{
		"username": input.Username,
		"status":   statusActive,
	})
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "查询用户失败")
	}
	// 用户不存在、已禁用、密码错误统一返回同一文案，避免账号枚举。
	if user == nil || bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.Password)) != nil {
		return nil, merror.NewCode(mcode.CodeNotAuthorized, "用户名或密码错误")
	}

	identity := token.Identity{UserID: user.Id, Username: user.Username, Role: user.Role}
	accessToken, err := token.SignAccessToken(ctx, identity)
	if err != nil {
		return nil, err
	}
	refreshTokenValue, err := token.SignRefreshToken(ctx, user.Id)
	if err != nil {
		return nil, err
	}

	if err := dao.NewUserDao(m.DB()).UpdateColumns(ctx, user.Id, map[string]any{
		"last_login_at": time.Now(),
	}); err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "更新登录时间失败")
	}

	output.Token = accessToken
	output.RefreshToken = refreshTokenValue
	output.User = toUserInfo(user)
	return output, nil
}

// Register 注册新账号，默认角色为 viewer，密码使用 bcrypt 存储。
func (s *sAuth) Register(ctx context.Context, input *v1.RegisterReq) (output *v1.RegisterRes, err error) {
	output = new(v1.RegisterRes)

	role := input.Role
	if role == "" {
		role = defaultRegisterRole
	}
	if role != roleAdmin && role != roleManager && role != roleOperator && role != roleViewer {
		return nil, merror.NewCode(mcode.CodeValidationFailed, "角色取值非法")
	}

	userDao := dao.NewUserDao(m.DB())
	if exist, err := userDao.FindOne(ctx, map[string]any{"username": input.Username}); err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "校验用户名失败")
	} else if exist != nil {
		return nil, merror.NewCode(mcode.CodeBusinessValidationFailed, "用户名已存在")
	}
	if exist, err := userDao.FindOne(ctx, map[string]any{"email": input.Email}); err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "校验邮箱失败")
	} else if exist != nil {
		return nil, merror.NewCode(mcode.CodeBusinessValidationFailed, "邮箱已存在")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeInternalError, "密码加密失败")
	}

	user := &entity.User{
		Username:     input.Username,
		RealName:     input.RealName,
		Email:        input.Email,
		Phone:        input.Phone,
		PasswordHash: string(hash),
		Role:         role,
		Status:       statusActive,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
	if err := userDao.Create(ctx, user); err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "创建用户失败")
	}

	output.User = toUserInfo(user)
	return output, nil
}

// Refresh 用刷新令牌换取新的访问令牌与刷新令牌。
func (s *sAuth) Refresh(ctx context.Context, input *v1.RefreshReq) (output *v1.RefreshRes, err error) {
	output = new(v1.RefreshRes)

	userID, err := token.UserIDFromRefreshToken(ctx, input.RefreshToken)
	if err != nil {
		return nil, err
	}

	user, err := dao.NewUserDao(m.DB()).GetByID(ctx, userID)
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "查询用户失败")
	}
	if user == nil {
		return nil, merror.NewCode(mcode.CodeNotAuthorized, "用户不存在")
	}

	accessToken, err := token.SignAccessToken(ctx, token.Identity{
		UserID:   user.Id,
		Username: user.Username,
		Role:     user.Role,
	})
	if err != nil {
		return nil, err
	}
	refreshTokenValue, err := token.SignRefreshToken(ctx, user.Id)
	if err != nil {
		return nil, err
	}

	output.Token = accessToken
	output.RefreshToken = refreshTokenValue
	return output, nil
}

// Profile 查询当前登录用户信息。
func (s *sAuth) Profile(ctx context.Context, input *v1.ProfileReq) (output *v1.ProfileRes, err error) {
	output = new(v1.ProfileRes)

	user, err := currentUser(ctx)
	if err != nil {
		return nil, err
	}
	output.User = toUserInfo(user)
	return output, nil
}

// UpdateProfile 更新当前登录用户的资料或密码。
func (s *sAuth) UpdateProfile(ctx context.Context, input *v1.UpdateProfileReq) (output *v1.UpdateProfileRes, err error) {
	output = new(v1.UpdateProfileRes)

	user, err := currentUser(ctx)
	if err != nil {
		return nil, err
	}

	updates := make(map[string]any)
	if input.Email != "" {
		updates["email"] = input.Email
	}
	if input.RealName != "" {
		updates["real_name"] = input.RealName
	}
	if input.Phone != "" {
		updates["phone"] = input.Phone
	}

	// 修改密码需要校验原密码，且新旧密码不得相同。
	if input.NewPassword != "" {
		if input.OldPassword == "" {
			return nil, merror.NewCode(mcode.CodeValidationFailed, "原密码不能为空")
		}
		if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.OldPassword)); err != nil {
			return nil, merror.NewCode(mcode.CodeValidationFailed, "原密码错误")
		}
		hash, err := bcrypt.GenerateFromPassword([]byte(input.NewPassword), bcrypt.DefaultCost)
		if err != nil {
			return nil, merror.WrapCode(err, mcode.CodeInternalError, "密码加密失败")
		}
		updates["password_hash"] = string(hash)
	}

	if len(updates) == 0 {
		output.User = toUserInfo(user)
		return output, nil
	}
	updates["updated_at"] = time.Now()

	userDao := dao.NewUserDao(m.DB())
	if email, ok := updates["email"]; ok {
		if exist, err := userDao.FindOne(ctx, map[string]any{"email": email}); err != nil {
			return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "校验邮箱失败")
		} else if exist != nil && exist.Id != user.Id {
			return nil, merror.NewCode(mcode.CodeBusinessValidationFailed, "邮箱已存在")
		}
	}

	if err := userDao.UpdateColumns(ctx, user.Id, updates); err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "更新用户失败")
	}

	updated, err := userDao.GetByID(ctx, user.Id)
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "查询用户失败")
	}
	output.User = toUserInfo(updated)
	return output, nil
}

// Logout 退出登录。JWT 无状态，服务端不做黑名单，客户端自行清除令牌。
func (s *sAuth) Logout(ctx context.Context, input *v1.LogoutReq) (output *v1.LogoutRes, err error) {
	return new(v1.LogoutRes), nil
}

// currentUser 依据请求上下文中的身份查询用户，用户不存在或已禁用时返回未授权。
func currentUser(ctx context.Context) (*entity.User, error) {
	identity, ok := token.IdentityFromCtx(ctx)
	if !ok {
		return nil, merror.NewCode(mcode.CodeNotAuthorized, "Token无效或已过期")
	}

	user, err := dao.NewUserDao(m.DB()).GetByID(ctx, identity.UserID)
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeDbOperationError, "查询用户失败")
	}
	if user == nil || user.Status != statusActive {
		return nil, merror.NewCode(mcode.CodeNotAuthorized, "用户不存在或已禁用")
	}
	return user, nil
}

// toUserInfo 把用户实体转换为对外响应结构。
func toUserInfo(user *entity.User) v1.UserInfo {
	info := v1.UserInfo{
		Id:         user.Id,
		Username:   user.Username,
		RealName:   user.RealName,
		Email:      user.Email,
		Role:       user.Role,
		RoleText:   roleText(user.Role),
		Status:     user.Status,
		StatusText: statusText(user.Status),
	}
	if !user.CreatedAt.IsZero() {
		info.CreatedAt = user.CreatedAt.Format(time.DateTime)
	}
	if !user.LastLoginAt.IsZero() {
		info.LastLoginAt = user.LastLoginAt.Format(time.DateTime)
	}
	return info
}

// roleText 与原后端保持一致的角色文案映射。
func roleText(role string) string {
	switch role {
	case roleAdmin:
		return "管理员"
	case roleOperator:
		return "录入员"
	default:
		return "未知"
	}
}

// statusText 返回账号状态文案。
func statusText(status string) string {
	switch status {
	case statusActive:
		return "激活"
	case statusInactive:
		return "禁用"
	default:
		return "未知"
	}
}

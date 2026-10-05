// Package token 封装 MonaWms 的 JWT 签发、解析与身份传递。
// Claims 结构保持与原 PHP 后端一致：业务字段统一放在 data 子对象中，
// 保证存量 token 仍可被解析。
package token

import (
	"context"
	"encoding/json"
	"errors"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/graingo/maltose/errors/mcode"
	"github.com/graingo/maltose/errors/merror"
	"github.com/graingo/maltose/frame/m"
)

const (
	// issuer 是签发方，与原 PHP 后端保持一致。
	issuer = "MonaWMS"
	// audience 是接收方，与原 PHP 后端保持一致。
	audience = "MonaWMS-Client"
	// defaultSecret 是配置文件缺失时使用的兜底密钥，仅用于本地开发。
	defaultSecret = "monawms_jwt_secret_key_2024"

	// TokenTypeRefresh 标识刷新令牌。
	TokenTypeRefresh = "refresh"

	claimUserID   = "user_id"
	claimUsername = "username"
	claimRole     = "role"
	claimType     = "type"

	// DefaultAccessTTL 是访问令牌默认有效期，等价于原后端的 jwt.exp=7200s。
	DefaultAccessTTL = 2 * time.Hour
	// DefaultRefreshTTL 是刷新令牌默认有效期，等价于原后端的 30 天。
	DefaultRefreshTTL = 30 * 24 * time.Hour
)

// Claims 是 MonaWms 的 JWT 载荷。
type Claims struct {
	jwt.RegisteredClaims
	// Data 存放业务字段，与原后端 claims.data 对应。
	Data map[string]any `json:"data"`
}

// Identity 是当前请求的登录身份，通过 context 传递（禁止使用包级全局变量）。
type Identity struct {
	UserID   int
	Username string
	Role     string
}

type identityKey struct{}

// WithIdentity 返回携带登录身份的 context。
func WithIdentity(ctx context.Context, identity Identity) context.Context {
	return context.WithValue(ctx, identityKey{}, identity)
}

// IdentityFromCtx 从 context 中取出登录身份。
func IdentityFromCtx(ctx context.Context) (Identity, bool) {
	identity, ok := ctx.Value(identityKey{}).(Identity)
	return identity, ok
}

// secret 读取 JWT 密钥，优先取配置文件 jwt.secret。
func secret(ctx context.Context) string {
	value := m.Config().MustGetString(ctx, "jwt.secret", defaultSecret)
	if strings.TrimSpace(value) == "" {
		return defaultSecret
	}
	return value
}

// accessTTL 读取访问令牌有效期。
func accessTTL(ctx context.Context) time.Duration {
	value := m.Config().MustGetString(ctx, "jwt.access_expire", DefaultAccessTTL.String())
	return parseDuration(value, DefaultAccessTTL)
}

// refreshTTL 读取刷新令牌有效期。
func refreshTTL(ctx context.Context) time.Duration {
	value := m.Config().MustGetString(ctx, "jwt.refresh_expire", DefaultRefreshTTL.String())
	return parseDuration(value, DefaultRefreshTTL)
}

func parseDuration(value string, fallback time.Duration) time.Duration {
	value = strings.TrimSpace(value)
	if value == "" {
		return fallback
	}
	duration, err := time.ParseDuration(value)
	if err != nil {
		return fallback
	}
	return duration
}

// Sign 签发一个携带 data 载荷的令牌。
func Sign(ctx context.Context, data map[string]any, ttl time.Duration) (string, error) {
	now := time.Now()
	claims := Claims{
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    issuer,
			Audience:  jwt.ClaimStrings{audience},
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
		},
		Data: data,
	}

	signed, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(secret(ctx)))
	if err != nil {
		return "", merror.WrapCode(err, mcode.CodeInternalError, "签发令牌失败")
	}
	return signed, nil
}

// SignAccessToken 签发访问令牌。
func SignAccessToken(ctx context.Context, identity Identity) (string, error) {
	return Sign(ctx, map[string]any{
		claimUserID:   identity.UserID,
		claimUsername: identity.Username,
		claimRole:     identity.Role,
	}, accessTTL(ctx))
}

// SignRefreshToken 签发刷新令牌。
func SignRefreshToken(ctx context.Context, userID int) (string, error) {
	return Sign(ctx, map[string]any{
		claimUserID: userID,
		claimType:   TokenTypeRefresh,
	}, refreshTTL(ctx))
}

// Parse 解析并校验令牌，返回其中的业务载荷。
func Parse(ctx context.Context, tokenString string) (map[string]any, error) {
	claims := &Claims{}
	_, err := jwt.ParseWithClaims(
		tokenString,
		claims,
		func(*jwt.Token) (any, error) { return []byte(secret(ctx)), nil },
		jwt.WithIssuer(issuer),
		jwt.WithAudience(audience),
	)
	if err != nil {
		return nil, merror.WrapCode(err, mcode.CodeNotAuthorized, "Token无效或已过期")
	}
	if claims.Data == nil {
		return nil, merror.NewCode(mcode.CodeNotAuthorized, "Token无效或已过期")
	}
	return claims.Data, nil
}

// IdentityFromToken 从访问令牌中提取登录身份，刷新令牌不可用。
func IdentityFromToken(ctx context.Context, tokenString string) (Identity, error) {
	data, err := Parse(ctx, tokenString)
	if err != nil {
		return Identity{}, err
	}
	if stringFromClaim(data[claimType]) == TokenTypeRefresh {
		return Identity{}, merror.NewCode(mcode.CodeNotAuthorized, "Token无效或已过期")
	}
	identity := Identity{
		UserID:   intFromClaim(data[claimUserID]),
		Username: stringFromClaim(data[claimUsername]),
		Role:     stringFromClaim(data[claimRole]),
	}
	if identity.UserID <= 0 {
		return Identity{}, merror.NewCode(mcode.CodeNotAuthorized, "Token无效或已过期")
	}
	return identity, nil
}

// UserIDFromRefreshToken 校验刷新令牌并返回其中的用户 ID。
func UserIDFromRefreshToken(ctx context.Context, tokenString string) (int, error) {
	data, err := Parse(ctx, tokenString)
	if err != nil {
		return 0, err
	}
	if stringFromClaim(data[claimType]) != TokenTypeRefresh {
		return 0, merror.NewCode(mcode.CodeNotAuthorized, "无效的refreshToken")
	}
	userID := intFromClaim(data[claimUserID])
	if userID <= 0 {
		return 0, merror.NewCode(mcode.CodeNotAuthorized, "无效的refreshToken")
	}
	return userID, nil
}

// ExtractBearer 从 Authorization 头中提取 Bearer token。
func ExtractBearer(authorization string) (string, error) {
	trimmed := strings.TrimSpace(authorization)
	if trimmed == "" {
		return "", merror.NewCode(mcode.CodeNotAuthorized, "缺少Authorization请求头")
	}
	const prefix = "Bearer "
	if len(trimmed) <= len(prefix) || !strings.EqualFold(trimmed[:len(prefix)], prefix) {
		return "", merror.NewCode(mcode.CodeNotAuthorized, "Authorization格式错误")
	}
	value := strings.TrimSpace(trimmed[len(prefix):])
	if value == "" {
		return "", merror.NewCode(mcode.CodeNotAuthorized, "Authorization格式错误")
	}
	return value, nil
}

// ErrNoIdentity 表示请求上下文中缺少登录身份。
var ErrNoIdentity = errors.New("请求上下文中缺少登录身份")

func intFromClaim(value any) int {
	switch typed := value.(type) {
	case float64:
		return int(typed)
	case float32:
		return int(typed)
	case int:
		return typed
	case int64:
		return int(typed)
	case json.Number:
		parsed, _ := typed.Int64()
		return int(parsed)
	case string:
		parsed, _ := strconv.Atoi(typed)
		return parsed
	default:
		return 0
	}
}

func stringFromClaim(value any) string {
	switch typed := value.(type) {
	case string:
		return typed
	default:
		return ""
	}
}

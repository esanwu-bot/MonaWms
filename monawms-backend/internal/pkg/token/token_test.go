// Package token 的单元测试不依赖数据库与外部服务。
package token

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSignAndParseAccessToken(t *testing.T) {
	ctx := context.Background()
	identity := Identity{UserID: 7, Username: "admin", Role: "admin"}

	signed, err := SignAccessToken(ctx, identity)
	require.NoError(t, err)
	require.NotEmpty(t, signed)

	parsed, err := IdentityFromToken(ctx, signed)
	require.NoError(t, err)
	assert.Equal(t, identity, parsed)
}

func TestSignAndParseRefreshToken(t *testing.T) {
	ctx := context.Background()

	signed, err := SignRefreshToken(ctx, 42)
	require.NoError(t, err)

	userID, err := UserIDFromRefreshToken(ctx, signed)
	require.NoError(t, err)
	assert.Equal(t, 42, userID)

	// 刷新令牌不能被当作访问令牌使用。
	_, err = IdentityFromToken(ctx, signed)
	assert.Error(t, err)
}

func TestParseInvalidToken(t *testing.T) {
	ctx := context.Background()

	_, err := Parse(ctx, "not-a-token")
	assert.Error(t, err)

	// 使用其它密钥签发的令牌必须被拒绝。
	forged, err := Sign(ctx, map[string]any{"user_id": 1}, time.Minute)
	require.NoError(t, err)
	_, err = Parse(ctx, forged+"tampered")
	assert.Error(t, err)
}

func TestExpiredToken(t *testing.T) {
	ctx := context.Background()

	signed, err := Sign(ctx, map[string]any{"user_id": 1}, -time.Minute)
	require.NoError(t, err)

	_, err = Parse(ctx, signed)
	assert.Error(t, err)
}

func TestExtractBearer(t *testing.T) {
	value, err := ExtractBearer("Bearer abc.def.ghi")
	require.NoError(t, err)
	assert.Equal(t, "abc.def.ghi", value)

	_, err = ExtractBearer("")
	assert.Error(t, err)

	_, err = ExtractBearer("abc.def.ghi")
	assert.Error(t, err)

	_, err = ExtractBearer("Bearer ")
	assert.Error(t, err)
}

func TestIdentityContext(t *testing.T) {
	ctx := context.Background()

	_, ok := IdentityFromCtx(ctx)
	assert.False(t, ok)

	identity := Identity{UserID: 3, Username: "operator"}
	ctx = WithIdentity(ctx, identity)

	stored, ok := IdentityFromCtx(ctx)
	assert.True(t, ok)
	assert.Equal(t, identity, stored)
}

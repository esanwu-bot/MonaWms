package mredis

import (
	"context"
	"time"

	"github.com/graingo/maltose/container/mvar"
	"github.com/redis/go-redis/v9"
)

// Set 将键设置为给定的字符串值。
// 若键已存在，无论其原类型是什么都会被覆盖。
// SET 成功后，该键原有的过期时间会被清除。
func (r *Redis) Set(ctx context.Context, key string, value interface{}) error {
	return r.client.Set(ctx, key, value, 0).Err()
}

// SetEX 将键设置为给定的字符串值并设置过期时间。
func (r *Redis) SetEX(ctx context.Context, key string, value interface{}, duration time.Duration) error {
	return r.client.SetEx(ctx, key, value, duration).Err()
}

// Get 获取并返回给定 `key` 对应的值。
// 若键不存在，返回特殊值 nil。
// 若键中存储的不是字符串，则返回错误，因为 GET 只处理字符串值。
func (r *Redis) Get(ctx context.Context, key string) (*mvar.Var, error) {
	val, err := r.client.Get(ctx, key).Result()
	if err != nil {
		if err == redis.Nil {
			return nil, nil
		}
		return nil, err
	}
	return mvar.New(val), nil
}

// MSet 对应 Redis 的 MSET 命令。
func (r *Redis) MSet(ctx context.Context, data map[string]interface{}) error {
	return r.client.MSet(ctx, data).Err()
}

// MGet 对应 Redis 的 MGET 命令。
func (r *Redis) MGet(ctx context.Context, keys ...string) ([]*mvar.Var, error) {
	result, err := r.client.MGet(ctx, keys...).Result()
	if err != nil {
		return nil, err
	}
	vars := make([]*mvar.Var, len(result))
	for i, v := range result {
		vars[i] = mvar.New(v)
	}
	return vars, nil
}

// SetNX 在键不存在时将其设置为字符串值。
// 此时等同于 SET；若键已存在值，则不执行任何操作。
// SETNX 是原子操作。
func (r *Redis) SetNX(ctx context.Context, key string, value interface{}, duration time.Duration) (bool, error) {
	return r.client.SetNX(ctx, key, value, duration).Result()
}

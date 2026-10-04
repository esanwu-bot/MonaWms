package mredis

import (
	"context"
	"time"
)

// Del 对应 Redis 的 DEL 命令。
func (r *Redis) Del(ctx context.Context, keys ...string) (int64, error) {
	return r.client.Del(ctx, keys...).Result()
}

// Exists 对应 Redis 的 EXISTS 命令。
func (r *Redis) Exists(ctx context.Context, keys ...string) (int64, error) {
	return r.client.Exists(ctx, keys...).Result()
}

// Expire 对应 Redis 的 EXPIRE 命令。
func (r *Redis) Expire(ctx context.Context, key string, expiration time.Duration) (bool, error) {
	return r.client.Expire(ctx, key, expiration).Result()
}

// Persist 移除键的过期时间。
func (r *Redis) Persist(ctx context.Context, key string) (bool, error) {
	return r.client.Persist(ctx, key).Result()
}

// Keys 对应 Redis 的 KEYS 命令。
func (r *Redis) Keys(ctx context.Context, pattern string) ([]string, error) {
	return r.client.Keys(ctx, pattern).Result()
}

// TTL 对应 Redis 的 TTL 命令。
func (r *Redis) TTL(ctx context.Context, key string) (time.Duration, error) {
	return r.client.TTL(ctx, key).Result()
}

// DBSize 对应 Redis 的 DBSIZE 命令。
func (r *Redis) DBSize(ctx context.Context) (int64, error) {
	return r.client.DBSize(ctx).Result()
}

// FlushDB 对应 Redis 的 FLUSHDB 命令。
func (r *Redis) FlushDB(ctx context.Context) error {
	return r.client.FlushDB(ctx).Err()
}

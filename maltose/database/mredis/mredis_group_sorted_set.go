package mredis

import (
	"context"

	"github.com/redis/go-redis/v9"
)

type Z = redis.Z

// ZAdd 将带有指定分值的成员添加到键对应的有序集合。
func (r *Redis) ZAdd(ctx context.Context, key string, members ...Z) (int64, error) {
	return r.client.ZAdd(ctx, key, members...).Result()
}

// ZScore 返回键对应有序集合中指定成员的分值。
func (r *Redis) ZScore(ctx context.Context, key, member string) (float64, error) {
	return r.client.ZScore(ctx, key, member).Result()
}

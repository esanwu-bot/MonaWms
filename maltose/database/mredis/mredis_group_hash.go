package mredis

import (
	"context"

	"github.com/graingo/maltose/container/mvar"
	"github.com/redis/go-redis/v9"
)

// HSet 将指定字段及其值写入键对应的哈希表。
func (r *Redis) HSet(ctx context.Context, key string, fields map[string]interface{}) error {
	return r.client.HSet(ctx, key, fields).Err()
}

// HGet 返回键对应哈希表中指定字段的值。
func (r *Redis) HGet(ctx context.Context, key, field string) (*mvar.Var, error) {
	val, err := r.client.HGet(ctx, key, field).Result()
	if err != nil {
		if err == redis.Nil {
			return nil, nil
		}
		return nil, err
	}
	return mvar.New(val), nil
}

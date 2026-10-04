package mredis

import (
	"context"

	"github.com/graingo/maltose/container/mvar"
	"github.com/redis/go-redis/v9"
)

// LPush 将一个或多个值从头部插入列表。
func (r *Redis) LPush(ctx context.Context, key string, values ...interface{}) (int64, error) {
	return r.client.LPush(ctx, key, values...).Result()
}

// RPop 移除并返回键对应列表的最后一个元素。
func (r *Redis) RPop(ctx context.Context, key string) (*mvar.Var, error) {
	val, err := r.client.RPop(ctx, key).Result()
	if err != nil {
		if err == redis.Nil {
			return nil, nil
		}
		return nil, err
	}
	return mvar.New(val), nil
}

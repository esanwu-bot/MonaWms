package mredis

import (
	"context"
)

// SAdd 将指定成员添加到键对应的集合。
func (r *Redis) SAdd(ctx context.Context, key string, members ...interface{}) (int64, error) {
	return r.client.SAdd(ctx, key, members...).Result()
}

// SIsMember 判断 member 是否为键对应集合的成员。
func (r *Redis) SIsMember(ctx context.Context, key string, member interface{}) (bool, error) {
	return r.client.SIsMember(ctx, key, member).Result()
}

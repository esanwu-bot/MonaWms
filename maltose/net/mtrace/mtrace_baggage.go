package mtrace

import (
	"context"

	"github.com/graingo/maltose/container/mvar"
	"github.com/graingo/mconv"
	"go.opentelemetry.io/otel/baggage"
)

// Baggage 是在分布式系统中传播键值对数据的机制。
// 借助它可以把自定义数据（如用户 ID、请求 ID 等）附加到链路上，并跨服务调用传播。
type Baggage struct {
	ctx context.Context
}

// NewBaggage 创建一个新的 Baggage 实例。
func NewBaggage(ctx context.Context) *Baggage {
	if ctx == nil {
		ctx = context.Background()
	}
	return &Baggage{
		ctx: ctx,
	}
}

// SetValue 设置单个 baggage 值。
func (b *Baggage) SetValue(key string, value interface{}) context.Context {
	member, err := baggage.NewMember(key, mconv.ToString(value))
	if err != nil {
		return b.ctx
	}
	// 基于上下文中已有的 baggage 正确创建带有新成员的 baggage。
	// 必须从上下文中已有的 baggage 开始。
	bag := baggage.FromContext(b.ctx)
	bag, err = bag.SetMember(member)
	if err != nil {
		return b.ctx
	}
	b.ctx = baggage.ContextWithBaggage(b.ctx, bag)
	return b.ctx
}

// SetMap 批量设置 baggage 值。
func (b *Baggage) SetMap(data map[string]interface{}) context.Context {
	bag := baggage.FromContext(b.ctx)
	for k, v := range data {
		member, err := baggage.NewMember(k, mconv.ToString(v))
		if err != nil {
			continue
		}
		updated, err := bag.SetMember(member)
		if err != nil {
			continue
		}
		bag = updated
	}
	b.ctx = baggage.ContextWithBaggage(b.ctx, bag)
	return b.ctx
}

// GetMap 获取全部 baggage 值。
func (b *Baggage) GetMap() map[string]interface{} {
	bag := baggage.FromContext(b.ctx)
	result := make(map[string]interface{})
	for _, member := range bag.Members() {
		result[member.Key()] = member.Value()
	}
	return result
}

// GetVar 获取指定键对应的 baggage 值。
func (b *Baggage) GetVar(key string) *mvar.Var {
	member := baggage.FromContext(b.ctx).Member(key)
	// 若成员不存在，其值为空，
	// 但这里仍应返回一个值为 nil 的 Var。
	if member.Key() == "" {
		return mvar.New(nil)
	}
	return mvar.New(member.Value())
}

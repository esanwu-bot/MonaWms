package mcfg

import (
	"context"
	"fmt"
	"sync"
)

// StatefulHook 在转换已加载配置的同时保留多次调用之间的状态。
type StatefulHook interface {
	Hook(ctx context.Context, data map[string]any) (map[string]any, error)
}

// ConfigHookFunc 在适配器加载配置之后对其进行转换。
type ConfigHookFunc func(ctx context.Context, data map[string]any) (map[string]any, error)

type hookRegistry struct {
	mu      sync.RWMutex
	keys    map[string]struct{}
	ordered []ConfigHookFunc
}

var hooks = &hookRegistry{keys: make(map[string]struct{})}

func (r *hookRegistry) register(key string, hook ConfigHookFunc) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, exists := r.keys[key]; exists {
		return
	}
	r.keys[key] = struct{}{}
	r.ordered = append(r.ordered, hook)
}

func (r *hookRegistry) all() []ConfigHookFunc {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return append([]ConfigHookFunc(nil), r.ordered...)
}

func (r *hookRegistry) count() int {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return len(r.ordered)
}

func (r *hookRegistry) clear() {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.keys = make(map[string]struct{})
	r.ordered = nil
}

// RegisterAfterLoadHook 注册一个进程级钩子，在适配器加载配置后执行。
// 参数为 ConfigHookFunc、其底层函数签名或 StatefulHook。
// 请在首次读取配置之前注册钩子。
// 钩子按注册顺序执行。
func RegisterAfterLoadHook(hook any) {
	var hookFunc ConfigHookFunc
	switch h := hook.(type) {
	case ConfigHookFunc:
		hookFunc = h
	case func(context.Context, map[string]any) (map[string]any, error):
		hookFunc = h
	case StatefulHook:
		hookFunc = h.Hook
	default:
		panic(fmt.Sprintf("unsupported hook type: %T. Must be a ConfigHookFunc or a StatefulHook", h))
	}

	hooks.register(fmt.Sprintf("%p", hook), hookFunc)
}

// ClearHooks 移除所有已注册的钩子。
// 该方法仅用于测试。
func ClearHooks() {
	hooks.clear()
}

// runAfterLoadHooks 按注册顺序执行所有加载后钩子。
func runAfterLoadHooks(ctx context.Context, data map[string]any) (map[string]any, error) {
	processedData := data
	var err error

	for _, hook := range hooks.all() {
		processedData, err = hook(ctx, processedData)
		if err != nil {
			return nil, err
		}
	}

	return processedData, nil
}

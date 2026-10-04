package msync

import "sync"

// LockedCalls 保证同一 key 的调用串行执行。
// 与 SingleFlight 不同，每次调用都会独立执行函数并得到自己的结果。
// 适用于每个操作都必须执行、但同一 key 的操作必须串行化的写场景。
type LockedCalls struct {
	mu sync.Mutex
	m  map[string]*sync.WaitGroup
}

// NewLockedCalls 创建并返回一个新的 LockedCalls 实例。
func NewLockedCalls() *LockedCalls {
	return &LockedCalls{
		m: make(map[string]*sync.WaitGroup),
	}
}

// Do 针对指定 key 执行给定函数。
// 若已有其他 goroutine 正在执行同一 key 的函数，
// 本次调用会等待其完成后再执行。
// 每次调用都独立执行函数并得到自己的结果。
func (lc *LockedCalls) Do(key string, fn func() (any, error)) (any, error) {
begin:
	lc.mu.Lock()

	// 检查是否有其他 goroutine 正在处理该 key
	if wg, ok := lc.m[key]; ok {
		lc.mu.Unlock()
		wg.Wait()  // 等待其完成
		goto begin // 再次尝试获取锁
	}

	// 由当前 goroutine 处理该 key
	return lc.makeCall(key, fn)
}

// makeCall 执行函数并管理锁的生命周期。
func (lc *LockedCalls) makeCall(key string, fn func() (any, error)) (any, error) {
	wg := &sync.WaitGroup{}
	wg.Add(1)
	lc.m[key] = wg
	lc.mu.Unlock()

	// 唤醒等待者之前始终先移除 key，fn 发生 panic 时也一样。
	// panic 会自然地向上传播给调用方。
	defer func() {
		lc.mu.Lock()
		delete(lc.m, key)
		lc.mu.Unlock()
		wg.Done()
	}()

	return fn()
}

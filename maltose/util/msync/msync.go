// Package msync 提供并发控制工具，用于管理 Go 应用中的并发操作。
//
// 本包包含以下组件：
//
//   - SingleFlight：避免同一 key 的重复函数调用，可用于防止缓存击穿。
//
//   - LockedCalls：保证同一 key 的操作串行执行，适用于必须串行化的写操作。
//
//   - Limit：控制最大并发数，可用于限流与资源管理。
//
//   - Pool：管理带容量上限与过期时间的可复用对象池，
//     适用于连接池、缓冲区池等场景。
//
// 基本用法示例：
//
//	// SingleFlight —— 防止缓存击穿
//	sf := msync.NewSingleFlight()
//	result, err := sf.Do("cache-key", func() (any, error) {
//	    return queryDatabase()
//	})
//
//	// LockedCalls —— 串行化操作
//	lc := msync.NewLockedCalls()
//	_, err := lc.Do("user-123", func() (any, error) {
//	    return updateUserBalance(amount)
//	})
//
//	// Limit —— 控制并发
//	limit := msync.NewLimit(10) // 最大并发 10
//	limit.Borrow()
//	defer limit.Return()
//	// 执行操作
//
//	// Pool —— 对象池
//	pool := msync.NewPool(50,
//	    func() any { return createConnection() },
//	    func(x any) { x.(*Connection).Close() },
//	    msync.WithMaxAge(5*time.Minute),
//	)
//	conn := pool.Get()
//	defer pool.Put(conn)
//	// 使用连接
package msync

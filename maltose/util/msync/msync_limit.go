package msync

import "errors"

var (
	// ErrLimitReturn 在没有对应 Borrow 的情况下调用 Return 时返回。
	ErrLimitReturn = errors.New("msync: limit return without borrow")
)

// Limit 是基于 channel 实现的信号量，用于限制并发执行数量。
// 可通过它控制最大并发操作数。
type Limit struct {
	pool chan struct{}
}

// NewLimit 按指定容量创建并返回一个 Limit 实例。
// 容量决定了允许的最大并发操作数。
func NewLimit(n int) *Limit {
	if n <= 0 {
		panic("msync: limit capacity must be positive")
	}
	return &Limit{
		pool: make(chan struct{}, n),
	}
}

// Borrow 从并发额度池中获取一个名额，池满时阻塞等待。
// 必须配对调用 Return 释放名额。
func (l *Limit) Borrow() {
	l.pool <- struct{}{}
}

// TryBorrow 尝试非阻塞地获取一个名额。
// 获取成功返回 true，池满则返回 false。
func (l *Limit) TryBorrow() bool {
	select {
	case l.pool <- struct{}{}:
		return true
	default:
		return false
	}
}

// Return 将名额归还到并发额度池。
// 若 Return 的调用次数多于 Borrow，则返回错误。
func (l *Limit) Return() error {
	select {
	case <-l.pool:
		return nil
	default:
		return ErrLimitReturn
	}
}

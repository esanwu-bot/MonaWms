package msync

import (
	"sync"
	"time"
)

// Pool 是支持容量上限与过期淘汰的对象池。
// 与 sync.Pool 相比，它：
// - 支持容量上限
// - 支持按空闲时间淘汰对象
// - 支持自定义创建与销毁回调
// - 不会被 GC 清空
type Pool struct {
	limit   int           // 对象数量上限
	created int           // 已创建的对象数量
	maxAge  time.Duration // 对象过期前的最大空闲时间
	lock    sync.Mutex    // 保护对象池
	cond    *sync.Cond    // 池满时用于阻塞的条件变量
	head    *node         // 空闲对象链表的头节点
	create  func() any    // 创建新对象的函数
	destroy func(any)     // 销毁对象的函数
}

// node 表示空闲对象链表中的一个节点。
type node struct {
	item     any
	next     *node
	lastUsed time.Time
}

// PoolOption 是用于配置 Pool 的函数类型。
type PoolOption func(*Pool)

// WithMaxAge 设置池中对象的最大空闲时间。
// 空闲时间超过该时长的对象在取出时会被销毁。
func WithMaxAge(d time.Duration) PoolOption {
	return func(p *Pool) {
		p.maxAge = d
	}
}

// NewPool 创建并返回一个新的 Pool 实例。
//
// 参数：
//   - limit：允许同时存在的对象数量上限
//   - create：创建新对象的函数
//   - destroy：销毁对象的函数（可为 nil）
//   - opts：可选的配置项
func NewPool(limit int, create func() any, destroy func(any), opts ...PoolOption) *Pool {
	if limit <= 0 {
		panic("msync: pool capacity must be positive")
	}
	if create == nil {
		panic("msync: pool create function cannot be nil")
	}
	if destroy == nil {
		destroy = func(any) {} // 空实现的销毁函数
	}

	p := &Pool{
		limit:   limit,
		create:  create,
		destroy: destroy,
	}
	p.cond = sync.NewCond(&p.lock)

	// 应用配置项
	for _, opt := range opts {
		opt(p)
	}

	return p
}

// Get 从池中获取一个对象。
// 池为空且未达上限时创建新对象。
// 池为空且已达上限时，Get 会阻塞直到有可用对象。
func (p *Pool) Get() any {
	for {
		p.lock.Lock()

		// 情况 1：尝试获取空闲对象
		if p.head != nil {
			head := p.head
			p.head = head.next

			// 检查对象是否已过期
			if p.maxAge > 0 && time.Since(head.lastUsed) > p.maxAge {
				p.created--
				p.cond.Signal()
				p.lock.Unlock()
				p.destroy(head.item)
				continue // 尝试获取下一个对象
			}

			p.lock.Unlock()
			return head.item
		}

		// 情况 2：未达上限时创建新对象
		if p.created < p.limit {
			p.created++
			p.lock.Unlock()
			return p.createObject()
		}

		// 情况 3：池已满，等待对象归还
		p.cond.Wait()
		p.lock.Unlock()
	}
}

// createObject 在不持有池锁的情况下创建对象。若创建过程发生 panic，
// 会在 panic 传递给调用方之前释放已占用的容量。
func (p *Pool) createObject() (item any) {
	defer func() {
		if panicValue := recover(); panicValue != nil {
			p.lock.Lock()
			p.created--
			p.cond.Signal()
			p.lock.Unlock()
			panic(panicValue)
		}
	}()

	item = p.create()
	if item == nil {
		panic("msync: pool create function returned nil")
	}
	return item
}

// Put 将对象归还到池中。
// 从 Get 获取的每个对象都应恰好归还一次；归还外部对象，
// 或重复归还同一对象，都会破坏池的容量记账约定。
// 若 x 为 nil，则直接忽略。
func (p *Pool) Put(x any) {
	if x == nil {
		return
	}

	p.lock.Lock()
	defer p.lock.Unlock()

	// 将对象插入链表头部
	p.head = &node{
		item:     x,
		next:     p.head,
		lastUsed: time.Now(),
	}

	// 唤醒一个等待中的 goroutine
	p.cond.Signal()
}

// Size 返回池中当前的对象数量（含空闲与在用）。
func (p *Pool) Size() int {
	p.lock.Lock()
	defer p.lock.Unlock()
	return p.created
}

// Available 返回池中当前空闲对象的数量。
func (p *Pool) Available() int {
	p.lock.Lock()
	defer p.lock.Unlock()

	count := 0
	for n := p.head; n != nil; n = n.next {
		count++
	}
	return count
}

// Clear 移除并销毁池中所有的空闲对象。
func (p *Pool) Clear() {
	p.lock.Lock()
	head := p.head
	p.head = nil

	for current := head; current != nil; current = current.next {
		p.created--
	}
	p.cond.Broadcast()
	p.lock.Unlock()

	// 用户回调在锁外执行，因此可以安全地重入对象池。
	p.destroyObjects(head)
}

// destroyObjects 尝试销毁每一个对象，然后向上抛出第一个 panic。
// 这样可避免某个异常回调导致已摘除的空闲链表其余对象泄漏。
func (p *Pool) destroyObjects(head *node) {
	var panicValue any

	for head != nil {
		next := head.next
		func(item any) {
			defer func() {
				if recovered := recover(); recovered != nil && panicValue == nil {
					panicValue = recovered
				}
			}()
			p.destroy(item)
		}(head.item)
		head = next
	}

	if panicValue != nil {
		panic(panicValue)
	}
}

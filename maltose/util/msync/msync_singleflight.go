package msync

import "sync"

// SingleFlight 用于避免同一 key 的重复函数调用。
// 同一 key 的多个并发调用会共享同一次执行的结果。
type SingleFlight struct {
	mu    sync.Mutex
	calls map[string]*call
}

// call 表示一次进行中或已完成的 Do 调用。
type call struct {
	wg         sync.WaitGroup
	val        any
	err        error
	panicValue any
}

// NewSingleFlight 创建并返回一个新的 SingleFlight 实例。
func NewSingleFlight() *SingleFlight {
	return &SingleFlight{
		calls: make(map[string]*call),
	}
}

// Do 执行并返回给定函数的结果，
// 确保同一 key 同一时刻只有一次执行在进行。
// 若出现重复调用，重复方会等待首次调用完成，并得到相同的结果。
func (sf *SingleFlight) Do(key string, fn func() (any, error)) (any, error) {
	c, fresh := sf.start(key)
	if !fresh {
		return c.result()
	}

	return sf.execute(key, c, fn)
}

// DoEx 与 Do 类似，但会额外返回结果是否为新执行产生（fresh）。
// 若由本次调用执行了函数，fresh 为 true；
// 若等待了其他调用者的结果，则为 false。
func (sf *SingleFlight) DoEx(key string, fn func() (any, error)) (val any, fresh bool, err error) {
	c, fresh := sf.start(key)
	if !fresh {
		val, err = c.result()
		return val, false, err
	}

	val, err = sf.execute(key, c, fn)
	return val, true, err
}

// start 返回与 key 关联的调用，并报告调用方是否需要负责执行它。
func (sf *SingleFlight) start(key string) (*call, bool) {
	sf.mu.Lock()
	defer sf.mu.Unlock()

	if c, ok := sf.calls[key]; ok {
		return c, false
	}

	c := &call{}
	c.wg.Add(1)
	sf.calls[key] = c
	return c, true
}

// execute 执行 fn，并始终释放等待同一 key 的调用方。
// panic 会在释放等待者之前被记录下来，
// 以便每个调用方观察到一致的结果。
func (sf *SingleFlight) execute(key string, c *call, fn func() (any, error)) (any, error) {
	defer func() {
		if panicValue := recover(); panicValue != nil {
			c.panicValue = panicValue
		}

		sf.mu.Lock()
		delete(sf.calls, key)
		sf.mu.Unlock()
		c.wg.Done()

		if c.panicValue != nil {
			panic(c.panicValue)
		}
	}()

	c.val, c.err = fn()
	return c.val, c.err
}

// result 等待共享调用完成，并复现其返回值或 panic 值。
func (c *call) result() (any, error) {
	c.wg.Wait()
	if c.panicValue != nil {
		panic(c.panicValue)
	}
	return c.val, c.err
}

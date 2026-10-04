package mins

import (
	"github.com/graingo/maltose/os/mcfg"
)

// Config 返回一个 mcfg.Config 实例。
func Config(name ...string) *mcfg.Config {
	return mcfg.Instance(name...)
}

// Config 返回作用域持有的配置源。
func (s *Scope) Config() *mcfg.Config {
	return s.configInstance()
}

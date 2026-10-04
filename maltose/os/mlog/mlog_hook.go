package mlog

import (
	"github.com/graingo/maltose/errors/merror"
)

type Hook interface {
	// Name 返回 hook 的名称。
	Name() string
	// Levels 返回 hook 生效的级别。
	Levels() []Level
	// Fire 在写入日志时被调用。
	Fire(entry *Entry)
}

// AddHook 为 logger 添加一个 hook。
func (l *Logger) AddHook(hook Hook) error {
	if hook == nil {
		return merror.New("hook cannot be nil")
	}
	l.hookMu.Lock()
	defer l.hookMu.Unlock()
	for _, h := range l.hooks {
		if h.Name() == hook.Name() {
			return merror.Newf("hook %s already exists", hook.Name())
		}
	}
	l.hooks = append(l.hooks, hook)
	return nil
}

// RemoveHook 从 logger 中移除指定名称的 hook。
func (l *Logger) RemoveHook(hookName string) {
	l.hookMu.Lock()
	defer l.hookMu.Unlock()
	for i, h := range l.hooks {
		if h.Name() == hookName {
			l.hooks = append(l.hooks[:i], l.hooks[i+1:]...)
			break
		}
	}
}

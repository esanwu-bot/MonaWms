package mlog

import (
	"context"
	"sync"
)

// entryPool 是 Entry 实例的对象池。
var entryPool = sync.Pool{
	New: func() any {
		return &Entry{}
	},
}

// Entry 表示一条日志条目。
type Entry struct {
	ctx    context.Context
	msg    string
	fields Fields
}

// SetMsg 设置日志条目的消息。
func (e *Entry) SetMsg(msg string) *Entry {
	e.msg = msg
	return e
}

// GetMsg 返回日志条目的消息。
func (e *Entry) GetMsg() string {
	return e.msg
}

// AddField 为日志条目添加一个字段。
func (e *Entry) AddField(field Field) *Entry {
	e.fields = append(e.fields, field)
	return e
}

// GetFields 返回日志条目的字段。
func (e *Entry) GetFields() Fields {
	return e.fields
}

// SetFields 设置日志条目的字段。
func (e *Entry) SetFields(fields Fields) *Entry {
	e.fields = fields
	return e
}

// GetContext 返回日志条目的上下文。
func (e *Entry) GetContext() context.Context {
	return e.ctx
}

// SetContext 设置日志条目的上下文。
func (e *Entry) SetContext(ctx context.Context) *Entry {
	e.ctx = ctx
	return e
}

// reset 重置日志条目。
func (e *Entry) reset() *Entry {
	e.ctx = nil
	e.msg = ""
	e.fields = nil
	return e
}

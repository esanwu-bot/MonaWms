package mhttp

import (
	"net/http/pprof"
	"strings"
)

const (
	defaultPProfPattern = "/debug/pprof"
)

// utilPProf 是 PProf 接口的实现
type utilPProf struct{}

// EnablePProf 为服务端开启 PProf 功能
func (s *Server) EnablePProf(pattern ...string) {
	p := defaultPProfPattern
	if len(pattern) > 0 && pattern[0] != "" {
		p = pattern[0]
	}

	up := &utilPProf{}
	uri := strings.TrimRight(p, "/")

	s.Group(uri, func(group *RouterGroup) {
		group.GET("/", up.Index)
		group.GET("/:action", up.Index)
		group.GET("/cmdline", up.Cmdline)
		group.GET("/profile", up.Profile)
		group.GET("/symbol", up.Symbol)
		group.GET("/trace", up.Trace)
	})
}

// Index 展示 PProf 首页
func (p *utilPProf) Index(r *Request) {
	action := r.Param("action")
	if action == "" {
		pprof.Index(r.Writer, r.Request)
		return
	}

	pprof.Handler(action).ServeHTTP(r.Writer, r.Request)
}

// Cmdline 返回运行中程序的命令行信息
func (p *utilPProf) Cmdline(r *Request) {
	pprof.Cmdline(r.Writer, r.Request)
}

// Profile 以 pprof 格式返回 CPU profile
func (p *utilPProf) Profile(r *Request) {
	pprof.Profile(r.Writer, r.Request)
}

// Symbol 根据请求查找对应的程序计数器
func (p *utilPProf) Symbol(r *Request) {
	pprof.Symbol(r.Writer, r.Request)
}

// Trace 以二进制格式返回执行 trace 数据
func (p *utilPProf) Trace(r *Request) {
	pprof.Trace(r.Writer, r.Request)
}

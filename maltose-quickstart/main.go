package main

import (
	"log"

	"github.com/graingo/maltose-quickstart/cmd"
	"github.com/graingo/maltose/frame/m"
)

// main 是应用入口，运行失败时直接以非零状态退出。
func main() {
	if err := run(); err != nil {
		log.Fatalf("server run failed: %v", err)
	}
}

// run 装配 Logger 与 HTTP 服务端，并交由 m.App 管理生命周期。
func run() error {
	logger := m.Log()
	server := cmd.HTTPServer()

	app := m.NewApp(
		m.WithLogger(logger),
		m.WithServer(server),
	)
	return app.Run()
}

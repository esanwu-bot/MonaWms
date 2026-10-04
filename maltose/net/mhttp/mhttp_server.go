package mhttp

import (
	"context"
	"errors"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/graingo/maltose/errors/merror"
)

// SetStaticPath 在指定 URL 前缀下提供目录中的静态文件。
func (s *Server) SetStaticPath(prefix string, directory string) {
	s.engine.StaticFS(prefix, http.Dir(directory))
}

// Handler 返回已就绪的 HTTP handler。
// 首次调用 Handler、ServeHTTP、Start 或 Run 之前必须完成路由注册。
func (s *Server) Handler() http.Handler {
	s.prepare(context.Background())
	return s
}

// ServeHTTP 实现 http.Handler 接口，使 Server 可用于 httptest。
func (s *Server) ServeHTTP(writer http.ResponseWriter, request *http.Request) {
	s.prepare(request.Context())
	s.engine.ServeHTTP(writer, request)
}

// Run 启动 HTTP 服务端，并等待关闭或进程信号。
func (s *Server) Run() {
	ctx := context.Background()
	errChan := make(chan error, 1)
	go func() {
		errChan <- s.Start(ctx)
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	defer signal.Stop(quit)

	select {
	case err := <-errChan:
		if err != nil {
			s.logger().Errorf(ctx, err, "HTTP server %s start failed", s.config.ServerName)
		}
	case <-quit:
		s.logger().Infof(ctx, "Shutting down server...")
		if err := s.Stop(ctx); err != nil {
			s.logger().Errorf(ctx, err, "HTTP server %s forced to shutdown", s.config.ServerName)
		}
	}
}

// Start 在配置的地址上启动服务端，并阻塞直到其停止。
func (s *Server) Start(ctx context.Context) error {
	s.prepare(ctx)
	server := &http.Server{
		Addr:           s.normalizeAddress(),
		Handler:        s,
		ReadTimeout:    s.config.ReadTimeout,
		WriteTimeout:   s.config.WriteTimeout,
		IdleTimeout:    s.config.IdleTimeout,
		MaxHeaderBytes: s.config.MaxHeaderBytes,
	}
	s.setHTTPServer(server)
	defer s.clearHTTPServer(server)
	// 先注册服务端再检查取消信号，这样并发调用 Stop 时
	// 要么关闭该服务端，要么被已取消的上下文阻止监听。
	if err := ctx.Err(); err != nil {
		return err
	}

	var err error
	if s.config.TLSEnable {
		if s.config.TLSCertFile == "" || s.config.TLSKeyFile == "" {
			return merror.New("tls certificate and key files are required")
		}
		err = server.ListenAndServeTLS(s.config.TLSCertFile, s.config.TLSKeyFile)
	} else {
		err = server.ListenAndServe()
	}
	return s.handleServeError(ctx, err)
}

// StartListener 在给定 listener 上提供 HTTP 服务，并阻塞直到服务端停止。
// 当调用方需要自行控制端口分配（例如在测试中）时非常有用。
func (s *Server) StartListener(ctx context.Context, listener net.Listener) error {
	if listener == nil {
		return merror.New("HTTP listener is required")
	}
	s.prepare(ctx)
	server := &http.Server{
		Handler:        s,
		ReadTimeout:    s.config.ReadTimeout,
		WriteTimeout:   s.config.WriteTimeout,
		IdleTimeout:    s.config.IdleTimeout,
		MaxHeaderBytes: s.config.MaxHeaderBytes,
	}
	s.setHTTPServer(server)
	defer s.clearHTTPServer(server)
	if err := ctx.Err(); err != nil {
		return err
	}

	var err error
	if s.config.TLSEnable {
		if s.config.TLSCertFile == "" || s.config.TLSKeyFile == "" {
			return merror.New("tls certificate and key files are required")
		}
		err = server.ServeTLS(listener, s.config.TLSCertFile, s.config.TLSKeyFile)
	} else {
		err = server.Serve(listener)
	}
	return s.handleServeError(ctx, err)
}

// Stop 优雅地停止运行中的 HTTP 服务端。
func (s *Server) Stop(ctx context.Context) error {
	s.logger().Infof(ctx, "HTTP server %s is stopping", s.config.ServerName)
	server := s.currentHTTPServer()
	if server == nil {
		return nil
	}
	if !s.config.GracefulEnable {
		return server.Close()
	}

	shutdownCtx, cancel := gracefulShutdownContext(ctx, s.config.GracefulTimeout)
	defer cancel()
	if waitErr := waitForGracefulShutdown(shutdownCtx, s.config.GracefulWaitTime); waitErr != nil {
		// 即使上下文已过期，Shutdown 也会将服务端标记为正在停止。
		// 随后 Close 强制释放活跃连接，避免 Start 在应用关闭
		// 截止时间之后仍然阻塞。
		shutdownErr := server.Shutdown(shutdownCtx)
		closeErr := server.Close()
		return errors.Join(waitErr, shutdownErr, closeErr)
	}
	return server.Shutdown(shutdownCtx)
}

func (s *Server) prepare(ctx context.Context) {
	s.prepareOnce.Do(func() {
		s.registerHealthCheck(ctx)
		s.registerDoc(ctx)
		s.bindRoutes(ctx)
		s.printRoute(ctx)
	})
}

func (s *Server) handleServeError(ctx context.Context, err error) error {
	if err == nil || err == http.ErrServerClosed {
		return nil
	}
	s.logger().Errorf(ctx, err, "HTTP server %s start failed", s.config.ServerName)
	return err
}

func (s *Server) setHTTPServer(server *http.Server) {
	s.serverMu.Lock()
	s.srv = server
	s.serverMu.Unlock()
}

func (s *Server) currentHTTPServer() *http.Server {
	s.serverMu.RLock()
	defer s.serverMu.RUnlock()
	return s.srv
}

func (s *Server) clearHTTPServer(server *http.Server) {
	s.serverMu.Lock()
	if s.srv == server {
		s.srv = nil
	}
	s.serverMu.Unlock()
}

func gracefulShutdownContext(ctx context.Context, timeout time.Duration) (context.Context, context.CancelFunc) {
	if timeout <= 0 {
		return context.WithCancel(ctx)
	}
	if deadline, ok := ctx.Deadline(); ok && time.Until(deadline) <= timeout {
		return context.WithCancel(ctx)
	}
	return context.WithTimeout(ctx, timeout)
}

func waitForGracefulShutdown(ctx context.Context, wait time.Duration) error {
	if wait <= 0 {
		return nil
	}
	timer := time.NewTimer(wait)
	defer timer.Stop()
	select {
	case <-timer.C:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

// normalizeAddress 检查并格式化服务端地址。
// 若地址中只包含端口，则在其前补充冒号以构成合法的监听地址。
func (s *Server) normalizeAddress() string {
	address := s.config.Address
	if address != "" && !strings.Contains(address, ":") {
		return ":" + address
	}
	return address
}

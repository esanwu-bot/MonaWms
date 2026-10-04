package m

import (
	"context"
	"errors"
	"io"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"github.com/graingo/maltose/os/mlog"
	"golang.org/x/sync/errgroup"
)

// App 是核心应用结构，用于管理服务与钩子的生命周期。
type App struct {
	servers         []AppServer
	shutdownHooks   []func(ctx context.Context) error
	shutdownOnce    sync.Once
	shutdownTimeout time.Duration
	logger          *mlog.Logger
	ctx             context.Context
	cancel          context.CancelFunc
}

// Option 用于配置 App。
type Option func(*App)

// WithServer 向应用添加服务。
func WithServer(servers ...AppServer) Option {
	return func(a *App) {
		a.servers = append(a.servers, servers...)
	}
}

// WithShutdownHook 添加优雅退出时调用的函数。
// 钩子按注册顺序的逆序执行，且每个钩子都有各自的超时时间。
func WithShutdownHook(hooks ...func(ctx context.Context) error) Option {
	return func(a *App) {
		a.shutdownHooks = append(a.shutdownHooks, hooks...)
	}
}

// WithCloser 注册需要在应用退出时关闭的资源。
// 在所有受管服务停止后，closer 按注册顺序的逆序执行。
func WithCloser(closers ...io.Closer) Option {
	return func(a *App) {
		for _, closer := range closers {
			if closer == nil {
				continue
			}
			resource := closer
			a.shutdownHooks = append(a.shutdownHooks, func(context.Context) error {
				return resource.Close()
			})
		}
	}
}

// WithLogger 设置应用使用的日志器。
func WithLogger(logger *mlog.Logger) Option {
	return func(a *App) {
		if logger != nil {
			a.logger = logger
		}
	}
}

// WithShutdownTimeout 设置每个服务停止、钩子与 closer 的最大超时时间。
func WithShutdownTimeout(timeout time.Duration) Option {
	return func(a *App) {
		if timeout > 0 {
			a.shutdownTimeout = timeout
		}
	}
}

// AppServer 定义了可被 App 管理的服务接口。
type AppServer interface {
	// Start 启动服务并阻塞。
	// 若服务启动失败，应返回错误。
	// 调用 Stop 应使 Start 解除阻塞并返回 nil。
	Start(ctx context.Context) error
	// Stop 优雅关闭服务。
	// 该方法应当是幂等的，并由应用框架调用。
	Stop(ctx context.Context) error
}

// NewApp 根据给定选项创建一个新的 App 实例。
func NewApp(opts ...Option) *App {
	ctx, cancel := context.WithCancel(context.Background())
	app := &App{
		servers:         make([]AppServer, 0),
		shutdownHooks:   make([]func(ctx context.Context) error, 0),
		logger:          mlog.New(),
		shutdownTimeout: 10 * time.Second,
		ctx:             ctx,
		cancel:          cancel,
	}
	for _, opt := range opts {
		opt(app)
	}
	return app
}

// Run 启动应用并等待信号以优雅退出。
func (a *App) Run() error {
	defer a.cancel()
	eg, ctx := errgroup.WithContext(a.ctx)

	// 启动所有服务及其对应的停止监听器。
	for _, s := range a.servers {
		srv := s
		if srv == nil {
			continue
		}
		// 在 goroutine 中启动服务。
		eg.Go(func() error {
			err := srv.Start(ctx)
			// 服务返回（无论是否有错误）都会结束应用生命周期。
			a.cancel()
			return err
		})
		// 为该服务启动对应的停止监听器。
		eg.Go(func() error {
			// 等待 context 被取消。
			<-ctx.Done()
			return stopServer(srv, a.shutdownTimeout)
		})
	}

	// 启动 goroutine 监听操作系统信号。
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	defer signal.Stop(quit)
	eg.Go(func() error {
		select {
		case <-ctx.Done():
			// 当组中其他部分先失败时会出现这种情况。
			return nil
		case sig := <-quit:
			a.logger.Infof(context.Background(), "Received signal %v, initiating shutdown.", sig)
			// 取消主 context 以触发优雅退出。
			// 这会使服务停止监听器中的 <-ctx.Done() 解除阻塞。
			a.cancel()
			return nil
		}
	})

	startErr := eg.Wait()

	// 一旦拿到启动错误就立即记录。这对定位退出的根本原因很关键，
	// 因为退出是并发进行的，各服务的 "stopping server..." 日志可能先出现。
	if startErr != nil && !errors.Is(startErr, context.Canceled) {
		a.logger.Warnf(context.Background(), "Shutdown initiated due to a service startup failure. You can see the error from return value.")
	}

	var shutdownErr error
	a.shutdownOnce.Do(func() {
		for i := len(a.shutdownHooks) - 1; i >= 0; i-- {
			if err := runShutdownHook(a.shutdownHooks[i], a.shutdownTimeout); err != nil {
				a.logger.Errorf(context.Background(), err, "Shutdown hook failed")
				shutdownErr = errors.Join(shutdownErr, err)
			}
		}
	})

	// 确定最终返回的错误。
	// 正常退出时 startErr 会出现 `context.Canceled`，这是预期的，不当作真正的错误。
	if startErr != nil && !errors.Is(startErr, context.Canceled) {
		return errors.Join(startErr, shutdownErr)
	}

	return shutdownErr
}

func runShutdownHook(hook func(context.Context) error, timeout time.Duration) error {
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	done := make(chan error, 1)
	go func() {
		done <- hook(ctx)
	}()
	select {
	case err := <-done:
		return err
	case <-ctx.Done():
		return ctx.Err()
	}
}

func stopServer(server AppServer, timeout time.Duration) error {
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()
	done := make(chan error, 1)
	go func() {
		done <- server.Stop(ctx)
	}()
	select {
	case err := <-done:
		return err
	case <-ctx.Done():
		return ctx.Err()
	}
}

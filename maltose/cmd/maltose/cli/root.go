// Package cli 提供本应用的命令行接口。
package cli

import (
	"github.com/graingo/maltose"
	"github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
	Use:   "maltose",
	Short: "Maltose is a lightweight and powerful Go framework for building modern web applications.",
	Long: `Maltose provides an elegant and concise way to build web services, 
with a focus on high performance, scalability, and developer experience.
It includes features like routing, middleware, configuration management, and more.`,
	RunE: func(cmd *cobra.Command, _ []string) error { return cmd.Help() },
}

// Execute 将所有子命令加入根命令并设置相应的 flag。
// 该方法由 main.main() 调用，对 rootCmd 只需执行一次。
func Execute() error {
	return rootCmd.Execute()
}

func init() {
	rootCmd.Version = maltose.VERSION
	rootCmd.CompletionOptions.DisableDefaultCmd = true
}

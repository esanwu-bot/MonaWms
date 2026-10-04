package cli

import (
	"github.com/spf13/cobra"
)

// genCmd 表示 gen 命令，是其他代码生成命令的父命令。
var genCmd = &cobra.Command{
	Use:   "gen",
	Short: "Generate various codes (service, model, etc.)",
	Long:  "A collection of code generation commands.",
}

func init() {
	rootCmd.AddCommand(genCmd)
}

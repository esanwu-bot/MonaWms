package utils

import (
	"os"
	"path/filepath"

	"github.com/graingo/maltose/errors/merror"
	"golang.org/x/mod/modfile"
)

// GetModuleInfo 从 fromPath 向上逐层查找 go.mod 文件，
// 并返回模块名与模块根目录路径。
func GetModuleInfo(fromPath string) (name, rootPath string, err error) {
	currentPath, err := filepath.Abs(fromPath)
	if err != nil {
		return "", "", merror.Wrapf(err, "failed to get absolute path for %s", fromPath)
	}

	for {
		goModPath := filepath.Join(currentPath, "go.mod")
		content, err := os.ReadFile(goModPath)
		if err == nil {
			return modfile.ModulePath(content), currentPath, nil
		}
		if !os.IsNotExist(err) {
			// 文件存在但无法读取。
			return "", "", merror.Wrapf(err, "failed to read go.mod at %s", goModPath)
		}

		parent := filepath.Dir(currentPath)
		if parent == currentPath { // 已到达根目录
			return "", "", merror.Newf("go.mod not found in any parent directory of %s", fromPath)
		}
		currentPath = parent
	}
}

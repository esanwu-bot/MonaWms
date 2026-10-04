package cli

import (
	"context"
	"fmt"
	"go/parser"
	"go/token"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/graingo/maltose/cmd/maltose/utils"
	"github.com/graingo/maltose/errors/merror"
	"github.com/spf13/cobra"
	"golang.org/x/mod/modfile"
	"golang.org/x/mod/module"
)

var moduleFlag string
var repoURLFlag string
var templateDirFlag string

const (
	// defaultQuickstartRepository 是默认模板仓库。
	defaultQuickstartRepository = "https://github.com/esanwu-bot/MonaWms.git"
	// defaultQuickstartSubDir 是模板在仓库中的子目录。
	// 模板不再单独建仓，而是随主仓一起维护，因此需要按子目录提取。
	defaultQuickstartSubDir = "maltose-quickstart"
	// 环境变量用于覆盖默认仓库与子目录，便于私有化部署或本地联调。
	envQuickstartRepo   = "MALTOSE_QUICKSTART_REPO"
	envQuickstartSubDir = "MALTOSE_QUICKSTART_SUBDIR"
)

// resolveTemplateSource 计算最终使用的模板仓库与子目录。
// 优先级：命令行标志 > 环境变量 > 内置默认值；
// 自定义仓库默认整体作为模板，除非显式指定子目录。
func resolveTemplateSource() (repoURL string, templateDir string) {
	repoURL = defaultQuickstartRepository
	templateDir = defaultQuickstartSubDir

	if env := os.Getenv(envQuickstartRepo); env != "" {
		repoURL = env
		templateDir = ""
	}
	if env := os.Getenv(envQuickstartSubDir); env != "" {
		templateDir = env
	}
	if repoURLFlag != "" {
		repoURL = repoURLFlag
		templateDir = templateDirFlag
	}
	if templateDirFlag != "" {
		templateDir = templateDirFlag
	}
	return repoURL, templateDir
}

// newCmd 基于 Maltose 快速开始模板仓库创建项目。
var newCmd = &cobra.Command{
	Use:   "new [project-name]",
	Short: "Create a new Maltose project.",
	Long:  "Creates a new Maltose project from the quickstart template, rewrites its module imports, and prepares its dependencies. The template normally lives in a subdirectory of the template repository.",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		projectName := args[0]
		repoURL, templateDir := resolveTemplateSource()
		modulePath := moduleFlag
		if modulePath == "" {
			modulePath = filepath.ToSlash(filepath.Clean(projectName))
		}
		if err := module.CheckPath(modulePath); err != nil {
			return merror.Wrap(err, "invalid Go module path")
		}

		cwd, err := os.Getwd()
		if err != nil {
			return merror.Wrap(err, "failed to get current working directory")
		}

		utils.PrintInfo("🚀 Creating new Maltose project at './{{.ProjectName}}'...", utils.TplData{"ProjectName": projectName})
		if templateDir != "" {
			utils.PrintInfo("📥 Cloning template directory '{{.TemplateDir}}' from {{.RepoURL}}...", utils.TplData{"TemplateDir": templateDir, "RepoURL": repoURL})
		} else {
			utils.PrintInfo("📥 Cloning project template from {{.RepoURL}}...", utils.TplData{"RepoURL": repoURL})
		}
		if err := createProject(cmd.Context(), cmd.OutOrStdout(), cmd.ErrOrStderr(), cwd, projectName, modulePath, repoURL, templateDir); err != nil {
			return err
		}

		utils.PrintSuccess("✅ Successfully created project '{{.ProjectName}}'.", utils.TplData{"ProjectName": projectName})
		utils.PrintInfo("🔧 Module path has been set to '{{.ModulePath}}'.", utils.TplData{"ModulePath": modulePath})
		fmt.Fprintln(cmd.OutOrStdout(), utils.Print("\n👉 To get started, run:\n"))
		fmt.Fprintln(cmd.OutOrStdout(), utils.Printf("  cd {{.ProjectName}}", utils.TplData{"ProjectName": projectName}))
		fmt.Fprintln(cmd.OutOrStdout(), utils.Print("  go run main.go"))

		return nil
	},
}

// createProject 克隆、定制并准备一个新的 Maltose 项目。
// templateDir 非空时，只取模板仓库中的该子目录作为项目内容。
func createProject(ctx context.Context, stdout, stderr io.Writer, cwd, projectName, modulePath, repoURL, templateDir string) (err error) {
	target, err := projectTarget(cwd, projectName)
	if err != nil {
		return err
	}
	if err := ensureAbsentDir(target); err != nil {
		return err
	}

	if err := fetchTemplate(ctx, stdout, stderr, target, repoURL, templateDir); err != nil {
		return err
	}

	completed := false
	defer func() {
		if !completed {
			_ = os.RemoveAll(target)
		}
	}()

	if err := os.RemoveAll(filepath.Join(target, ".git")); err != nil {
		return merror.Wrap(err, "failed to remove template Git metadata")
	}
	if err := rewriteProjectModule(target, modulePath); err != nil {
		return err
	}

	tidyCmd := exec.CommandContext(ctx, "go", "mod", "tidy")
	tidyCmd.Dir = target
	tidyCmd.Stdout = stdout
	tidyCmd.Stderr = stderr
	if err := tidyCmd.Run(); err != nil {
		return merror.Wrap(err, "failed to prepare project dependencies")
	}

	completed = true
	return nil
}

// fetchTemplate 把模板内容放置到 target。
// templateDir 为空表示模板位于仓库根目录，直接浅克隆；
// 否则先克隆到暂存目录，再把该子目录提升为项目根目录。
func fetchTemplate(ctx context.Context, stdout, stderr io.Writer, target, repoURL, templateDir string) error {
	if templateDir == "" {
		return runGit(ctx, stdout, stderr, "", "clone", "--depth", "1", "--", repoURL, target)
	}

	// 模板只是仓库的一小部分，用稀疏检出避免下载整个仓库。
	staging := target + ".maltose-template"
	if err := os.RemoveAll(staging); err != nil {
		return merror.Wrapf(err, "failed to clean staging directory %s", staging)
	}
	defer func() {
		_ = os.RemoveAll(staging)
	}()

	sparseErr := runGit(ctx, stdout, stderr, "", "clone", "--depth", "1", "--filter=blob:none", "--sparse", "--", repoURL, staging)
	if sparseErr != nil {
		// 旧版 Git 或服务端不支持部分克隆时，退化为完整浅克隆。
		_ = os.RemoveAll(staging)
		if err := runGit(ctx, stdout, stderr, "", "clone", "--depth", "1", "--", repoURL, staging); err != nil {
			return err
		}
	} else if err := runGit(ctx, stdout, stderr, staging, "sparse-checkout", "set", templateDir); err != nil {
		return merror.Wrapf(err, "failed to sparse-checkout template directory %s", templateDir)
	}

	return promoteTemplateDir(staging, target, templateDir)
}

// promoteTemplateDir 把暂存目录中的子目录移动为项目根目录。
func promoteTemplateDir(staging, target, templateDir string) error {
	source := filepath.Join(staging, filepath.FromSlash(templateDir))
	info, err := os.Stat(source)
	if err != nil {
		return merror.Wrapf(err, "template directory %s is missing in the repository", templateDir)
	}
	if !info.IsDir() {
		return merror.Newf("template path %s is not a directory", templateDir)
	}
	if err := os.RemoveAll(target); err != nil {
		return merror.Wrapf(err, "failed to prepare project directory %s", target)
	}
	if err := os.Rename(source, target); err != nil {
		return merror.Wrapf(err, "failed to move template directory to %s", target)
	}
	return nil
}

// ensureAbsentDir 确保目标路径尚不存在或为空目录，避免覆盖已有项目。
func ensureAbsentDir(target string) error {
	info, err := os.Stat(target)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return merror.Wrapf(err, "failed to inspect project directory %s", target)
	}
	if !info.IsDir() {
		return merror.Newf("project path %s already exists and is not a directory", target)
	}
	entries, err := os.ReadDir(target)
	if err != nil {
		return merror.Wrapf(err, "failed to read project directory %s", target)
	}
	if len(entries) > 0 {
		return merror.Newf("project directory %s already exists and is not empty", target)
	}
	return nil
}

// runGit 在指定目录执行 git 命令，dir 为空时使用当前目录。
func runGit(ctx context.Context, stdout, stderr io.Writer, dir string, args ...string) error {
	command := exec.CommandContext(ctx, "git", args...)
	command.Dir = dir
	command.Stdout = stdout
	command.Stderr = stderr
	if err := command.Run(); err != nil {
		return merror.Wrapf(err, "git %s failed", strings.Join(args, " "))
	}
	return nil
}

// rewriteProjectModule 更新 go.mod 以及引用模板模块的导入路径。
func rewriteProjectModule(projectRoot, modulePath string) error {
	gomodPath := filepath.Join(projectRoot, "go.mod")
	content, err := os.ReadFile(gomodPath)
	if err != nil {
		return merror.Wrap(err, "failed to read go.mod")
	}

	goMod, err := modfile.Parse(gomodPath, content, nil)
	if err != nil {
		return merror.Wrap(err, "failed to parse go.mod")
	}
	if goMod.Module == nil || goMod.Module.Mod.Path == "" {
		return merror.New("template go.mod does not declare a module path")
	}

	templateModule := goMod.Module.Mod.Path
	if err := goMod.AddModuleStmt(modulePath); err != nil {
		return merror.Wrap(err, "failed to update module path")
	}
	newContent, err := goMod.Format()
	if err != nil {
		return merror.Wrap(err, "failed to format go.mod")
	}
	if err := os.WriteFile(gomodPath, newContent, 0644); err != nil {
		return merror.Wrap(err, "failed to write updated go.mod")
	}

	return filepath.Walk(projectRoot, func(path string, info os.FileInfo, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if info.IsDir() || filepath.Ext(path) != ".go" {
			return nil
		}
		return rewriteGoImports(path, templateModule, modulePath)
	})
}

// rewriteGoImports 替换以 oldModule 为根的导入路径，不影响其他字符串。
func rewriteGoImports(path, oldModule, newModule string) error {
	content, err := os.ReadFile(path)
	if err != nil {
		return merror.Wrapf(err, "failed to read Go source %s", path)
	}

	fileSet := token.NewFileSet()
	file, err := parser.ParseFile(fileSet, path, content, parser.ImportsOnly)
	if err != nil {
		return merror.Wrapf(err, "failed to parse Go imports in %s", path)
	}

	type replacement struct {
		start int
		end   int
		value string
	}
	replacements := make([]replacement, 0)
	for _, importSpec := range file.Imports {
		importPath, unquoteErr := strconv.Unquote(importSpec.Path.Value)
		if unquoteErr != nil {
			return merror.Wrapf(unquoteErr, "failed to parse import path in %s", path)
		}
		if importPath != oldModule && !strings.HasPrefix(importPath, oldModule+"/") {
			continue
		}

		start := fileSet.Position(importSpec.Path.Pos()).Offset
		end := fileSet.Position(importSpec.Path.End()).Offset
		replacements = append(replacements, replacement{
			start: start,
			end:   end,
			value: strconv.Quote(newModule + strings.TrimPrefix(importPath, oldModule)),
		})
	}

	for i := len(replacements) - 1; i >= 0; i-- {
		replacement := replacements[i]
		content = append(content[:replacement.start], append([]byte(replacement.value), content[replacement.end:]...)...)
	}
	if len(replacements) == 0 {
		return nil
	}
	if err := os.WriteFile(path, content, infoMode(path)); err != nil {
		return merror.Wrapf(err, "failed to rewrite imports in %s", path)
	}
	return nil
}

func infoMode(path string) os.FileMode {
	info, err := os.Stat(path)
	if err != nil {
		return 0644
	}
	return info.Mode().Perm()
}

func init() {
	rootCmd.AddCommand(newCmd)
	newCmd.Flags().StringVar(&moduleFlag, "module", "", "Specify the Go module path for the new project.")
	newCmd.Flags().StringVar(&repoURLFlag, "repo-url", "", "Specify a custom git repository URL for the project template.")
	newCmd.Flags().StringVar(&templateDirFlag, "template-dir", "", "Specify a subdirectory inside the template repository that holds the project template.")
}

func projectTarget(cwd, projectName string) (string, error) {
	if strings.TrimSpace(projectName) == "" || filepath.IsAbs(projectName) {
		return "", merror.New("project name must be a non-empty relative path")
	}
	cleanName := filepath.Clean(projectName)
	if cleanName == "." || cleanName == ".." || strings.HasPrefix(cleanName, ".."+string(os.PathSeparator)) {
		return "", merror.New("project path must stay inside the current directory")
	}
	target := filepath.Join(cwd, cleanName)
	relative, err := filepath.Rel(cwd, target)
	if err != nil || relative == "." || relative == ".." || strings.HasPrefix(relative, ".."+string(os.PathSeparator)) {
		return "", merror.New("project path must stay inside the current directory")
	}
	return target, nil
}

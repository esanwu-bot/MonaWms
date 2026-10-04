package cli

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestProjectTargetStaysInsideWorkingDirectory(t *testing.T) {
	cwd := t.TempDir()
	target, err := projectTarget(cwd, "services/example")
	require.NoError(t, err)
	assert.Equal(t, filepath.Join(cwd, "services", "example"), target)

	for _, invalid := range []string{"", ".", "..", "../outside", filepath.Join(string(filepath.Separator), "tmp", "outside")} {
		_, err := projectTarget(cwd, invalid)
		assert.Error(t, err, invalid)
	}
}

func TestCreateProjectRewritesModuleAndBuilds(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("local file URLs have platform-specific Git behavior on Windows")
	}
	if _, err := exec.LookPath("git"); err != nil {
		t.Skip("git is required for the project creation test")
	}
	if _, err := exec.LookPath("go"); err != nil {
		t.Skip("go is required for the project creation test")
	}

	const (
		templateModule = "example.com/maltose-template"
		projectModule  = "example.com/acme/service"
	)

	templateDir := filepath.Join(t.TempDir(), "template")
	require.NoError(t, os.MkdirAll(filepath.Join(templateDir, "internal", "greeting"), 0755))
	require.NoError(t, os.WriteFile(filepath.Join(templateDir, "go.mod"), []byte("module "+templateModule+"\n\ngo 1.23\n"), 0644))
	require.NoError(t, os.WriteFile(filepath.Join(templateDir, "main.go"), []byte(`package main

import (
	"fmt"

	"example.com/maltose-template/internal/greeting"
)

func main() {
	fmt.Println(greeting.Message())
}
`), 0644))
	require.NoError(t, os.WriteFile(filepath.Join(templateDir, "internal", "greeting", "greeting.go"), []byte(`package greeting

// Message returns the example greeting.
func Message() string { return "hello" }
`), 0644))
	runCommand(t, templateDir, "git", "init", "--quiet")
	runCommand(t, templateDir, "git", "add", ".")
	runCommand(t, templateDir, "git", "-c", "user.name=Maltose Test", "-c", "user.email=maltose@example.com", "commit", "--quiet", "-m", "initial template")

	workingDir := t.TempDir()
	err := createProject(context.Background(), os.Stdout, os.Stderr, workingDir, "service", projectModule, templateDir, "")
	require.NoError(t, err)

	projectDir := filepath.Join(workingDir, "service")
	goMod, err := os.ReadFile(filepath.Join(projectDir, "go.mod"))
	require.NoError(t, err)
	assert.Contains(t, string(goMod), "module "+projectModule)

	mainSource, err := os.ReadFile(filepath.Join(projectDir, "main.go"))
	require.NoError(t, err)
	assert.Contains(t, string(mainSource), projectModule+"/internal/greeting")
	assert.NotContains(t, string(mainSource), templateModule)
	assert.NoDirExists(t, filepath.Join(projectDir, ".git"))

	runCommand(t, projectDir, "go", "test", "./...")
}

func TestCreateProjectUsesTemplateSubDirectory(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("local file URLs have platform-specific Git behavior on Windows")
	}
	if _, err := exec.LookPath("git"); err != nil {
		t.Skip("git is required for the project creation test")
	}
	if _, err := exec.LookPath("go"); err != nil {
		t.Skip("go is required for the project creation test")
	}

	const (
		templateModule = "example.com/maltose-template"
		projectModule  = "example.com/acme/service"
	)

	// 模板仓库只有 templates/quickstart 子目录是项目内容，与真实仓库结构保持一致。
	repoRoot := filepath.Join(t.TempDir(), "repo")
	nested := filepath.Join(repoRoot, "templates", "quickstart")
	require.NoError(t, os.MkdirAll(filepath.Join(nested, "cmd"), 0755))
	require.NoError(t, os.WriteFile(filepath.Join(nested, "go.mod"), []byte("module "+templateModule+"\n\ngo 1.23\n"), 0644))
	require.NoError(t, os.WriteFile(filepath.Join(nested, "main.go"), []byte("package main\n\nfunc main() {}\n"), 0644))
	runCommand(t, repoRoot, "git", "init", "--quiet")
	runCommand(t, repoRoot, "git", "add", ".")
	runCommand(t, repoRoot, "git", "-c", "user.name=Maltose Test", "-c", "user.email=maltose@example.com", "commit", "--quiet", "-m", "initial template")

	workingDir := t.TempDir()
	err := createProject(context.Background(), os.Stdout, os.Stderr, workingDir, "service", projectModule, repoRoot, "templates/quickstart")
	require.NoError(t, err)

	projectDir := filepath.Join(workingDir, "service")
	goMod, err := os.ReadFile(filepath.Join(projectDir, "go.mod"))
	require.NoError(t, err)
	assert.Contains(t, string(goMod), "module "+projectModule)
	assert.FileExists(t, filepath.Join(projectDir, "main.go"))
	assert.DirExists(t, filepath.Join(projectDir, "cmd"))
	assert.NoDirExists(t, filepath.Join(projectDir, "templates"))
	assert.NoDirExists(t, filepath.Join(projectDir, ".git"))
}

func TestPromoteTemplateDirMovesSubDirectoryToRoot(t *testing.T) {
	staging := filepath.Join(t.TempDir(), "staging")
	nested := filepath.Join(staging, "templates", "quickstart")
	require.NoError(t, os.MkdirAll(filepath.Join(nested, "cmd"), 0755))
	require.NoError(t, os.WriteFile(filepath.Join(nested, "main.go"), []byte("package main\n"), 0644))

	target := filepath.Join(t.TempDir(), "project")
	require.NoError(t, promoteTemplateDir(staging, target, "templates/quickstart"))
	assert.FileExists(t, filepath.Join(target, "main.go"))
	assert.DirExists(t, filepath.Join(target, "cmd"))

	assert.Error(t, promoteTemplateDir(staging, target, "templates/missing"))
}

func TestResolveTemplateSource(t *testing.T) {
	repoURL, templateDir := resolveTemplateSource()
	assert.Equal(t, defaultQuickstartRepository, repoURL)
	assert.Equal(t, defaultQuickstartSubDir, templateDir)

	t.Setenv(envQuickstartRepo, "https://example.com/private-template.git")
	repoURL, templateDir = resolveTemplateSource()
	assert.Equal(t, "https://example.com/private-template.git", repoURL)
	assert.Empty(t, templateDir, "自定义仓库默认整体作为模板")

	t.Setenv(envQuickstartSubDir, "templates/quickstart")
	_, templateDir = resolveTemplateSource()
	assert.Equal(t, "templates/quickstart", templateDir)

	repoURLFlag = "https://example.com/other.git"
	templateDirFlag = "nested/dir"
	t.Cleanup(func() {
		repoURLFlag = ""
		templateDirFlag = ""
	})
	repoURL, templateDir = resolveTemplateSource()
	assert.Equal(t, "https://example.com/other.git", repoURL)
	assert.Equal(t, "nested/dir", templateDir)
}

func TestRewriteGoImportsLeavesOrdinaryStringsUnchanged(t *testing.T) {
	path := filepath.Join(t.TempDir(), "sample.go")
	source := `package sample

import "example.com/template/pkg"

const moduleName = "example.com/template/pkg"
`
	require.NoError(t, os.WriteFile(path, []byte(source), 0644))
	require.NoError(t, rewriteGoImports(path, "example.com/template", "example.com/project"))

	rewritten, err := os.ReadFile(path)
	require.NoError(t, err)
	assert.Contains(t, string(rewritten), `import "example.com/project/pkg"`)
	assert.Contains(t, string(rewritten), `const moduleName = "example.com/template/pkg"`)
}

func runCommand(t *testing.T, dir, name string, args ...string) {
	t.Helper()
	command := exec.Command(name, args...)
	command.Dir = dir
	output, err := command.CombinedOutput()
	require.NoError(t, err, "%s %s failed: %s", name, strings.Join(args, " "), output)
}

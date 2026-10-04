// Package gen 包含代码生成的公共逻辑。
package gen

import (
	"bytes"
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"strings"
	"text/template"

	"go/format"

	"github.com/graingo/maltose/cmd/maltose/utils"
	"github.com/graingo/maltose/errors/merror"
	"github.com/iancoleman/strcase"
)

// ServiceGenerator 保存生成 service 所需的配置。
type ServiceGenerator struct {
	Src               string // API 定义文件的源路径
	Dst               string // 生成文件的目标路径
	ServiceName       string // 单个 service 生成时使用的名称
	ModuleName        string // Go 模块名
	ModuleRoot        string // 模块根目录在文件系统中的路径
	InterfaceMode     bool   // 是否生成带接口的 service
	processedServices map[string]bool
}

// serviceFunction 保存解析后的函数信息。
type serviceFunction struct {
	Name         string
	ReqName      string
	ResName      string
	ReqIsPointer bool
	ResIsPointer bool
}

// serviceTplData 是 service 模板所需的数据结构。
type serviceTplData struct {
	Module       string
	Service      string
	Controller   string
	SvcName      string
	APIModule    string
	APIPkg       string
	FileName     string
	Version      string
	VersionLower string
	Functions    []serviceFunction
	SvcPackage   string
}

func NewServiceGenerator(src, dst, serviceName string, interfaceMode bool) (*ServiceGenerator, error) {
	pathForModule := src
	if src == "" {
		pathForModule = dst
	}

	absPath, err := filepath.Abs(pathForModule)
	if err != nil {
		return nil, merror.Wrap(err, "failed to get absolute source path")
	}

	moduleName, moduleRoot, err := utils.GetModuleInfo(absPath)
	if err != nil {
		return nil, merror.Wrap(err, "could not find go.mod")
	}

	return &ServiceGenerator{
		Src:               src,
		Dst:               dst,
		ServiceName:       serviceName,
		ModuleName:        moduleName,
		ModuleRoot:        moduleRoot,
		InterfaceMode:     interfaceMode,
		processedServices: make(map[string]bool),
	}, nil
}

// Gen 生成 service 与 controller 文件。
func (g *ServiceGenerator) Gen() error {
	if g.ServiceName != "" {
		return g.genSimpleService()
	}

	utils.PrintInfo("🔍 Scanning directory: {{.Path}}", utils.TplData{"Path": filepath.Base(g.Src)})
	return filepath.Walk(g.Src, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() && strings.HasSuffix(info.Name(), ".go") {
			if err := g.genFromFile(path); err != nil {
				// 发生真正的错误，停止遍历。
				return merror.Wrap(err, "failed to generate service file")
			}
		}
		return nil
	})
}

func (g *ServiceGenerator) genSimpleService() error {
	fileName := strings.TrimSuffix(g.ServiceName, ".go")
	outputPath := filepath.Join(g.ModuleRoot, g.Dst, "service", fileName+".go")

	if _, err := os.Stat(outputPath); !os.IsNotExist(err) {
		utils.PrintWarn("  -> ⏩ Skipping service file {{.Path}} (already exists)", utils.TplData{"Path": outputPath})
		return nil
	}

	data := serviceTplData{
		Service: strcase.ToCamel(fileName),
	}

	return generateFile(outputPath, "serviceInterface", TplGenServiceInterface, &data)
}

func (g *ServiceGenerator) genFromFile(file string) error {
	fset := token.NewFileSet()
	node, err := parser.ParseFile(fset, file, nil, parser.ParseComments)
	if err != nil {
		return err
	}

	parser := &Parser{
		file:       node,
		fset:       fset,
		module:     g.ModuleName,
		moduleRoot: g.ModuleRoot,
	}

	info, err := parser.parse()
	if err != nil {
		return merror.Wrapf(err, "failed to parse file %s", file)
	}

	if info == nil {
		// 文件解析成功但不包含有效的 Req/Res 结构体时会走到这里。
		// 这不属于错误，直接返回 nil 跳过即可。
		utils.PrintWarn("⚠️ No valid API definitions found in {{.File}}, skipping.", utils.TplData{"File": filepath.Base(file)})
		return nil
	}

	// controller 需要导入的包始终是 ".../internal/service"。
	info.SvcPackage = strings.ReplaceAll(filepath.Join(g.ModuleName, "internal", "service"), "\\", "/")

	// --- service 文件生成（按模块决定创建或追加）---
	// 针对不同用途规范化模块名。
	// 文件名场景："user-center" -> "user_center"
	snakeCaseModule := strcase.ToSnake(info.Module)
	// 结构体名场景："user-center" -> "UserCenter"
	camelCaseModule := strcase.ToCamel(info.Module)

	svcOutputPath := filepath.Join(g.Dst, "service", snakeCaseModule+".go")

	svcFullTpl := TplGenService
	svcAppendTpl := TplGenServiceMethodOnly
	if g.InterfaceMode {
		svcFullTpl = TplGenServiceInterface
		svcAppendTpl = TplGenServiceInterfaceMethodOnly
	}

	// 使用 generateOrAppend 创建 service 文件或向其追加内容。
	// 注意：service 场景需要稍作调整，
	// 模板 `data` 的 `Service` 字段要基于模块名而非文件名。
	serviceData := *info
	serviceData.Service = camelCaseModule // 结构体名使用驼峰命名

	if err := g.generateOrAppend(svcOutputPath, svcFullTpl, svcAppendTpl, &serviceData); err != nil {
		return merror.Wrap(err, "failed to generate or append service file")
	}

	// --- Controller 生成（创建或追加）---
	// 规范化 controller 包路径中的模块名。
	// 这里会把 "user-center" 转换为合法的包名 "usercenter"。
	cleanControllerModule := sanitizeModuleName(info.Module)

	// 情况 1：专业布局，形如 api/<module>/<version>/...
	if info.Version != "" && !strings.EqualFold(info.Module, info.Version) {
		// 为 controller 模板单独准备一份数据，避免产生副作用。
		controllerData := *info
		controllerData.Module = cleanControllerModule

		// 处理 controller 结构体文件（不存在则创建，已存在则跳过）
		controllerStructPath := filepath.Join(g.Dst, "controller", cleanControllerModule, cleanControllerModule+".go")
		if _, err := os.Stat(controllerStructPath); os.IsNotExist(err) {
			if err := generateFile(controllerStructPath, "controllerStruct", TplGenControllerStruct, &controllerData); err != nil {
				return merror.Wrap(err, "failed to generate controller struct")
			}
		}

		// 处理 controller 方法文件（创建或追加）
		methodFileName := fmt.Sprintf("%s_%s.go", cleanControllerModule, strings.ToLower(info.Version))
		controllerMethodPath := filepath.Join(g.Dst, "controller", cleanControllerModule, methodFileName)
		return g.generateOrAppend(controllerMethodPath, TplGenControllerMethod, TplGenControllerMethodOnly, &controllerData)
	}

	// 情况 2：简单布局，形如 api/<version>/...
	// 该布局下 controller 文件直接位于版本目录中，
	// 包名由版本推导（如 "v1"），因此模块路径无需规范化。
	controllerPath := filepath.Join(g.Dst, "controller", info.VersionLower, info.FileName)
	return g.generateOrAppend(controllerPath, TplGenController, TplGenControllerMethodOnly, info)
}

// generateOrAppend 处理创建新文件或向已有文件追加内容的逻辑。
func (g *ServiceGenerator) generateOrAppend(filePath, fullTpl, appendTpl string, data *serviceTplData) error {
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		// 文件不存在，从头生成新文件。
		return generateFile(filePath, "controller", fullTpl, data)
	}

	// 文件已存在，进入追加逻辑。
	existingMethods, err := parseGoFileForMethods(filePath)
	if err != nil {
		return merror.Wrapf(err, "could not parse existing controller file %s", filePath)
	}

	var methodsToAppend []serviceFunction
	for _, neededMethod := range data.Functions {
		if _, exists := existingMethods[neededMethod.Name]; !exists {
			methodsToAppend = append(methodsToAppend, neededMethod)
		}
	}

	if len(methodsToAppend) > 0 {
		utils.PrintSuccess("✨ Appended {{.Count}} new methods to {{.Path}}.", utils.TplData{
			"Count": len(methodsToAppend),
			"Path":  filePath,
		})
		appendData := *data
		appendData.Functions = methodsToAppend
		return appendToFile(filePath, appendTpl, &appendData)
	}

	return nil // 没有需要追加的内容
}

// appendToFile 执行模板并把结果追加到文件中。
func appendToFile(filePath, tplContent string, data *serviceTplData) error {
	var buffer bytes.Buffer
	tpl, err := template.New("method").Parse(tplContent)
	if err != nil {
		return merror.Wrap(err, "failed to parse append template")
	}
	if err := tpl.Execute(&buffer, data); err != nil {
		return merror.Wrap(err, "failed to execute append template")
	}

	// 追加前先格式化生成的代码。
	formatted, err := format.Source(buffer.Bytes())
	if err != nil {
		return merror.Wrapf(err, "failed to format generated service code for %s", filePath)
	}

	f, err := os.OpenFile(filePath, os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		return merror.Wrap(err, "failed to open file for appending")
	}
	defer f.Close()

	if _, err := f.Write(formatted); err != nil {
		return merror.Wrap(err, "failed to append to file")
	}
	return nil
}

// parseGoFileForMethods 解析 Go 文件并返回其方法名集合。
func parseGoFileForMethods(path string) (map[string]struct{}, error) {
	fset := token.NewFileSet()
	node, err := parser.ParseFile(fset, path, nil, 0)
	if err != nil {
		return nil, err
	}

	methods := make(map[string]struct{})
	ast.Inspect(node, func(n ast.Node) bool {
		if fn, isFn := n.(*ast.FuncDecl); isFn && fn.Recv != nil && len(fn.Recv.List) > 0 {
			methods[fn.Name.Name] = struct{}{}
		}
		return true
	})
	return methods, nil
}

type Parser struct {
	file       *ast.File
	fset       *token.FileSet
	module     string
	moduleRoot string
}

func (p *Parser) parse() (*serviceTplData, error) {
	var functions []serviceFunction
	var moduleName, versionName, structBaseName, fileName string

	// --- 增强的路径解析逻辑 ---
	fullPath := p.fset.File(p.file.Pos()).Name()
	absPath, err := filepath.Abs(fullPath)
	if err != nil {
		return nil, merror.Wrapf(err, "could not get absolute path for %s", fullPath)
	}

	relPath, err := filepath.Rel(p.moduleRoot, absPath)
	if err != nil {
		return nil, merror.Wrap(err, "could not determine file path relative to module root")
	}

	parts := strings.Split(filepath.ToSlash(relPath), "/")
	apiIndex := -1
	for i, part := range parts {
		if part == "api" {
			apiIndex = i
			break
		}
	}

	if apiIndex == -1 {
		return nil, merror.Newf("path does not contain 'api' directory: %s", fullPath)
	}

	// api/<module>/<version>/<file>.go
	if len(parts) > apiIndex+3 {
		moduleName = parts[apiIndex+1]
		versionName = parts[apiIndex+2]
		fileName = parts[len(parts)-1]
		structBaseName = strings.TrimSuffix(fileName, ".go")
		// api/v1/hello.go -> api/hello/v1/hello.go（module=hello，version=v1）
	} else if len(parts) > apiIndex+2 { // 覆盖 api/<version>/<file>.go 与 api/<module>/<file>.go
		part1 := parts[apiIndex+1]
		fileName = parts[len(parts)-1]
		structBaseName = strings.TrimSuffix(fileName, ".go")

		// 启发式判断：若目录名形如版本号（v1、v2...），则视为版本目录。
		isVersionLike := len(part1) > 1 && part1[0] == 'v' && part1[1] >= '0' && part1[1] <= '9'

		if isVersionLike { // 情况：api/v1/hello.go
			versionName = part1
			moduleName = part1 // 该布局下简化处理，把版本当作模块名
		} else { // 情况：api/hello/hello.go
			moduleName = part1
			versionName = "v1" // 按文档约定默认版本为 v1
		}
	} else {
		return nil, merror.Newf("path format not supported. Use 'api/<version>/<file>.go' or 'api/<module>/<version>/<file>.go' or 'api/<module>/<file>.go': %s", fullPath)
	}

	info := &serviceTplData{
		Module:       moduleName,
		Service:      strcase.ToCamel(structBaseName),
		Controller:   strcase.ToCamel(moduleName) + strcase.ToCamel(versionName),
		SvcName:      strcase.ToCamel(structBaseName),
		APIModule:    "", // Will be calculated below
		APIPkg:       p.file.Name.Name,
		FileName:     fileName,
		Version:      strcase.ToCamel(versionName),
		VersionLower: strings.ToLower(versionName),
		Functions:    nil,
	}

	// 简单布局下，controller 名称为 c<Service>
	if strings.EqualFold(moduleName, versionName) {
		info.Controller = "c" + strcase.ToCamel(structBaseName)
	}

	if p.moduleRoot != "" {
		relDir, err := filepath.Rel(p.moduleRoot, filepath.Dir(absPath))
		if err != nil {
			return nil, merror.Wrapf(err, "could not get relative path for %s", absPath)
		}
		info.APIModule = filepath.ToSlash(filepath.Join(p.module, relDir))
	} else {
		// 未找到模块根目录时的兜底处理
		apiModuleDir := filepath.ToSlash(filepath.Dir(fullPath))
		if p.module != "" {
			if i := strings.Index(apiModuleDir, p.module); i != -1 {
				info.APIModule = apiModuleDir[i:]
			}
		}
	}

	// --- 健壮的 Req/Res 解析逻辑 ---
	reqs := make(map[string]bool)
	ress := make(map[string]bool)

	ast.Inspect(p.file, func(n ast.Node) bool {
		spec, ok := n.(*ast.TypeSpec)
		if !ok {
			return true
		}

		if strings.HasSuffix(spec.Name.Name, "Req") {
			reqs[spec.Name.Name] = true
		} else if strings.HasSuffix(spec.Name.Name, "Res") {
			ress[spec.Name.Name] = true
		}
		return true
	})

	for reqName := range reqs {
		funcName := strings.TrimSuffix(reqName, "Req")
		resName := funcName + "Res"
		if ress[resName] {
			functions = append(functions, serviceFunction{
				Name:    funcName,
				ReqName: reqName,
				ResName: resName,
			})
		}
	}

	// 遍历完所有声明后若仍未找到任何函数，
	// 说明该文件可能是辅助文件（例如定义共享类型），
	// 而非 API 入口文件，应当跳过。
	if len(functions) == 0 {
		return nil, nil
	}

	info.Functions = functions
	return info, nil
}

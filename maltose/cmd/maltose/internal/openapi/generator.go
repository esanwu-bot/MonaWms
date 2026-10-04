// Package openapi 负责生成 OpenAPI 规范文档。
package openapi

import (
	"bytes"
	"encoding/json"
	"os"
	"path"
	"path/filepath"

	"github.com/graingo/maltose/cmd/maltose/utils"
	"github.com/graingo/maltose/errors/merror"
	"gopkg.in/yaml.v3"
)

// Generate 生成最终的 OpenAPI 规范文件。
func Generate(src, outputFile, format string) error {
	if format != "yaml" && format != "json" {
		return merror.Newf("unsupported OpenAPI output format %q: use yaml or json", format)
	}

	utils.PrintInfo("🔍 Scanning directory: {{.Path}}", utils.TplData{"Path": filepath.Base(src)})

	// 第 1 步：解析目录中的源码。
	// 解析器会返回 API 定义的结构化表示。
	apiDefs, allStructs, err := ParseDir(src)
	if err != nil {
		return merror.Wrap(err, "failed to parse source directory")
	}

	if len(apiDefs) == 0 {
		return merror.Newf("no API definitions (structs with m.Meta) found in %s", src)
	}

	utils.PrintInfo("ℹ️  Found {{.Count}} API endpoint definitions.", utils.TplData{"Count": len(apiDefs)})

	moduleName, _, err := utils.GetModuleInfo(".")
	if err != nil {
		return merror.Wrap(err, "failed to get project name")
	}
	projectName := path.Base(moduleName)

	// 第 2 步：基于解析结果构建 OpenAPI 规范。
	spec, err := BuildSpec(apiDefs, projectName, allStructs)
	if err != nil {
		return merror.Wrap(err, "failed to build OpenAPI spec")
	}

	var outputBytes []byte
	var marshalErr error

	if format == "json" {
		// 第 3 步（JSON）：将规范序列化为 JSON。
		outputBytes, marshalErr = spec.MarshalJSON()
		if marshalErr == nil {
			// 对 JSON 进行格式化缩进
			var prettyJSON bytes.Buffer
			if err := json.Indent(&prettyJSON, outputBytes, "", "  "); err == nil {
				outputBytes = prettyJSON.Bytes()
			}
		}
	} else {
		// 第 3 步（YAML）：将规范序列化为 YAML，并手动控制字段顺序。
		var buf bytes.Buffer
		encoder := yaml.NewEncoder(&buf)
		encoder.SetIndent(2)

		// 这里构造 yaml.Node 树，以保证顺序为 openapi、info、paths、components。
		var content []*yaml.Node
		appendNode := func(key string, value interface{}) error {
			valNode := &yaml.Node{}
			if err := valNode.Encode(value); err != nil {
				return merror.Wrapf(err, "failed to encode yaml for key '%s'", key)
			}
			content = append(content,
				&yaml.Node{Kind: yaml.ScalarNode, Value: key, Tag: "!!str"},
				valNode,
			)
			return nil
		}

		// 按期望顺序添加字段
		if err := appendNode("openapi", spec.OpenAPI); err != nil {
			return err
		}
		if err := appendNode("info", spec.Info); err != nil {
			return err
		}
		if spec.Paths != nil && len(spec.Paths.Map()) > 0 {
			if err := appendNode("paths", spec.Paths); err != nil {
				return err
			}
		}

		// 手动检查 components 是否为空
		if spec.Components != nil && len(spec.Components.Schemas) > 0 {
			if err := appendNode("components", spec.Components); err != nil {
				return err
			}
		}

		root := &yaml.Node{
			Kind:    yaml.MappingNode,
			Content: content,
		}

		if err := encoder.Encode(root); err != nil {
			marshalErr = err
		} else {
			outputBytes = buf.Bytes()
		}
	}

	if marshalErr != nil {
		return merror.Wrapf(marshalErr, "failed to marshal spec to %s", format)
	}

	// 第 4 步：将结果写入文件。
	utils.PrintInfo("📝 Writing OpenAPI specification to {{.Path}}", utils.TplData{"Path": outputFile})
	if err := os.WriteFile(outputFile, outputBytes, 0644); err != nil {
		return merror.Wrapf(err, "failed to write OpenAPI spec to %s", outputFile)
	}

	return nil
}

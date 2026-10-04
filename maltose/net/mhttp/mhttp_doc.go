package mhttp

import (
	"context"
	"reflect"
	"strings"

	"github.com/getkin/kin-openapi/openapi3"
	"github.com/graingo/maltose/util/mmeta"
)

// schemaBuilder 是运行时构建 OpenAPI schema 的辅助类型。
type schemaBuilder struct {
	spec *openapi3.T
}

func (s *Server) registerDoc(ctx context.Context) {
	s.initOpenAPI(ctx)

	if s.config.OpenapiPath != "" {
		s.GET(s.config.OpenapiPath, s.openapiHandler)
		s.logger().Infof(ctx, "OpenAPI specification registered at %s", s.config.OpenapiPath)
	}

	if s.config.SwaggerPath != "" {
		s.GET(s.config.SwaggerPath, s.swaggerHandler)
		s.logger().Infof(ctx, "Swagger UI registered at %s", s.config.SwaggerPath)
	}
}

func (s *Server) initOpenAPI(_ context.Context) {
	if s.config.OpenapiPath == "" {
		return
	}

	spec := &openapi3.T{
		OpenAPI: "3.0.0",
		Info: &openapi3.Info{
			Title:   s.config.ServerName,
			Version: "1.0.0",
		},
		Paths:      openapi3.NewPaths(),
		Components: &openapi3.Components{},
	}
	spec.Components.Schemas = make(openapi3.Schemas)

	builder := &schemaBuilder{spec: spec}

	for _, route := range s.Routes() {
		// 仅处理 controller 路由
		if route.Type != routeTypeController {
			continue
		}

		// 直接使用已保存的类型信息
		reqType := route.ReqType
		respType := route.RespType

		// 由 reflect.Type 创建实例以获取元数据
		reqInstance := reflect.New(reqType.Elem()).Interface()
		metaData := mmeta.Data(reqInstance)
		if len(metaData) == 0 {
			continue
		}

		summary := mmeta.Get(reqInstance, "summary").String()
		tags := mmeta.Get(reqInstance, "tag").String()
		description := mmeta.Get(reqInstance, "dc").String()

		operation := &openapi3.Operation{
			Tags:        []string{tags},
			Summary:     summary,
			Description: description,
			Responses:   openapi3.NewResponses(),
		}
		// 创建带 schema 引用的响应
		responseContent := openapi3.NewContent()
		responseContent["application/json"] = &openapi3.MediaType{
			Schema: builder.typeToSchema(respType),
		}
		operation.Responses.Set("200", &openapi3.ResponseRef{
			Value: openapi3.NewResponse().
				WithDescription("Success").
				WithContent(responseContent),
		})

		if route.Method == "GET" || route.Method == "DELETE" {
			operation.Parameters = builder.createParameters(reqType)
		} else {
			// 创建带 schema 引用的请求体
			requestContent := openapi3.NewContent()
			requestContent["application/json"] = &openapi3.MediaType{
				Schema: builder.typeToSchema(reqType),
			}
			operation.RequestBody = &openapi3.RequestBodyRef{
				Value: openapi3.NewRequestBody().
					WithRequired(true).
					WithContent(requestContent),
			}
		}

		pathItem := spec.Paths.Find(route.Path)
		if pathItem == nil {
			pathItem = &openapi3.PathItem{}
		}

		switch strings.ToUpper(route.Method) {
		case "GET":
			pathItem.Get = operation
		case "POST":
			pathItem.Post = operation
		case "PUT":
			pathItem.Put = operation
		case "DELETE":
			pathItem.Delete = operation
		case "PATCH":
			pathItem.Patch = operation
		case "HEAD":
			pathItem.Head = operation
		}
		spec.Paths.Set(route.Path, pathItem)
	}

	s.openapi = spec
}

func (b *schemaBuilder) createParameters(reqType reflect.Type) openapi3.Parameters {
	params := openapi3.NewParameters()
	if reqType.Kind() != reflect.Struct {
		return params
	}
	for i := 0; i < reqType.NumField(); i++ {
		field := reqType.Field(i)
		if field.Anonymous { // 跳过 m.Meta 之类的嵌入结构体
			continue
		}

		schema := b.typeToSchema(field.Type)
		if schema.Value == nil {
			continue
		}

		paramName := field.Tag.Get("form")
		if paramName == "" {
			paramName = field.Name
		}

		param := openapi3.NewQueryParameter(paramName).
			WithSchema(schema.Value).
			WithDescription(field.Tag.Get("dc"))

		if strings.Contains(field.Tag.Get("binding"), "required") {
			param.Required = true
		}

		params = append(params, &openapi3.ParameterRef{Value: param})
	}
	return params
}

func (b *schemaBuilder) typeToSchema(p reflect.Type) *openapi3.SchemaRef {
	if p == nil {
		return &openapi3.SchemaRef{Value: openapi3.NewObjectSchema()}
	}
	// 处理指针
	if p.Kind() == reflect.Pointer {
		ref := b.typeToSchema(p.Elem())
		if ref.Value != nil {
			ref.Value.Nullable = true
		}
		return ref
	}

	// 处理切片/数组
	if p.Kind() == reflect.Slice || p.Kind() == reflect.Array {
		itemsRef := b.typeToSchema(p.Elem())
		schema := openapi3.NewArraySchema()
		schema.Items = itemsRef
		return &openapi3.SchemaRef{Value: schema}
	}
	// 处理基础类型
	switch p.Kind() {
	case reflect.String:
		return &openapi3.SchemaRef{Value: openapi3.NewStringSchema()}
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64,
		reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
		return &openapi3.SchemaRef{Value: openapi3.NewIntegerSchema()}
	case reflect.Float32, reflect.Float64:
		return &openapi3.SchemaRef{Value: openapi3.NewFloat64Schema()}
	case reflect.Bool:
		return &openapi3.SchemaRef{Value: openapi3.NewBoolSchema()}
	case reflect.Interface:
		return &openapi3.SchemaRef{Value: &openapi3.Schema{Type: &openapi3.Types{openapi3.TypeObject}, AdditionalProperties: openapi3.AdditionalProperties{Has: openapi3.BoolPtr(true)}}}
	}
	if p.Kind() == reflect.Struct {
		// 处理自定义结构体类型：为其创建组件 schema
		cleanTypeName := p.Name()
		if cleanTypeName == "" {
			// 匿名结构体则创建内联 schema
			schema := openapi3.NewObjectSchema()
			for i := 0; i < p.NumField(); i++ {
				field := p.Field(i)
				if field.Anonymous { // 跳过 m.Meta 之类的嵌入结构体
					continue
				}

				jsonTag := field.Tag.Get("json")
				if jsonTag == "" || jsonTag == "-" {
					continue
				}
				jsonName := strings.Split(jsonTag, ",")[0]

				fieldSchemaRef := b.typeToSchema(field.Type)
				if field.Tag.Get("dc") != "" && fieldSchemaRef.Value != nil {
					fieldSchemaRef.Value.Description = field.Tag.Get("dc")
				}
				schema.Properties[jsonName] = fieldSchemaRef
			}
			return &openapi3.SchemaRef{Value: schema}
		}

		// 若组件中尚不存在该 schema，则创建它。
		if _, ok := b.spec.Components.Schemas[cleanTypeName]; !ok {
			// 先在组件中放入占位 schema，避免自引用结构体导致无限递归。
			b.spec.Components.Schemas[cleanTypeName] = &openapi3.SchemaRef{Value: openapi3.NewObjectSchema()}
			// 构建结构体的完整 schema。
			schema := openapi3.NewObjectSchema()
			for i := 0; i < p.NumField(); i++ {
				field := p.Field(i)
				if field.Anonymous { // 跳过 m.Meta 之类的嵌入结构体
					continue
				}

				jsonTag := field.Tag.Get("json")
				if jsonTag == "" || jsonTag == "-" {
					continue
				}
				jsonName := strings.Split(jsonTag, ",")[0]

				fieldSchemaRef := b.typeToSchema(field.Type)
				if field.Tag.Get("dc") != "" && fieldSchemaRef.Value != nil {
					fieldSchemaRef.Value.Description = field.Tag.Get("dc")
				}
				schema.Properties[jsonName] = fieldSchemaRef
			}

			// 用构建完成的 schema 替换占位。
			b.spec.Components.Schemas[cleanTypeName] = &openapi3.SchemaRef{Value: schema}
		}
		// 返回指向该组件 schema 的引用。
		return &openapi3.SchemaRef{Ref: "#/components/schemas/" + cleanTypeName}
	}

	return &openapi3.SchemaRef{Value: openapi3.NewObjectSchema()}
}

// openapiHandler 处理 OpenAPI 请求。
func (s *Server) openapiHandler(r *Request) {
	if s.openapi == nil {
		r.String(500, "OpenAPI specification is not properly initialized")
		return
	}
	r.JSON(200, s.openapi)
}

// swaggerHandler 处理 Swagger 请求。
func (s *Server) swaggerHandler(r *Request) {
	template := defaultSwaggerTemplate
	if s.config.SwaggerTemplate != "" {
		template = s.config.SwaggerTemplate
	}
	r.Header("Content-Type", "text/html")
	if s.config.OpenapiPath == "" {
		r.String(200, "swagger path is empty")
		r.Abort()
	}
	r.String(200, template, s.config.OpenapiPath)
}

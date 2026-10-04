# Maltose Quickstart

`maltose-quickstart` 是 Maltose 的官方项目模板，提供一个无需外部服务、克隆后即可运行的 HTTP API 示例。

## 环境要求

- Go 1.25 或更高版本
- Maltose CLI（通过 CLI 创建项目时需要）

```bash
go install github.com/graingo/maltose/cmd/maltose@latest
```

## 创建项目

推荐通过 CLI 创建项目，并显式设置正式 Module Path：

```bash
maltose new hello-maltose --module github.com/acme/hello-maltose
cd hello-maltose
go run .
```

也可以直接克隆本仓库：

```bash
git clone https://github.com/graingo/maltose-quickstart.git
cd maltose-quickstart
go run .
```

服务默认监听 `http://127.0.0.1:8081`。

## 调用示例

```bash
curl 'http://127.0.0.1:8081/api/v1/hello?name=Maltose'
```

响应使用 Maltose 标准响应结构：

```json
{
  "code": 0,
  "message": "OK",
  "data": {
    "name": "Hello, Maltose!"
  }
}
```

模板提供以下入口：

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/health` | 健康检查 |
| GET | `/api/v1/hello?name=Maltose` | 查询参数绑定与业务调用 |
| POST | `/api/v1/bye` | JSON 请求绑定 |
| POST | `/api/v2/bye` | API 版本路由 |
| GET | `/swagger` | Swagger UI |
| GET | `/api.json` | OpenAPI 文档 |

POST 请求示例：

```bash
curl -X POST 'http://127.0.0.1:8081/api/v2/bye' \
  -H 'Content-Type: application/json' \
  -d '{"name":"Maltose"}'
```

## 项目结构

```text
.
├── api/hello/              # API 契约，按业务模块与版本组织
│   ├── v1/
│   └── v2/
├── cmd/                    # Server 装配与路由注册
├── config/config.yaml      # 应用配置
├── internal/
│   ├── controller/         # HTTP 请求适配
│   ├── logic/              # Service 接口实现与业务编排
│   ├── model/              # 内部输入输出模型
│   ├── service/            # 业务能力接口
│   ├── dao/                # 可选：数据库访问
│   └── provider/           # 可选：外部服务封装
├── utility/                # 可选：项目通用工具
└── main.go                 # 应用生命周期入口
```

请求处理流程为：

```text
Router → Controller → Service/Logic → DAO 或 Provider
```

`main.go` 使用 `m.App` 管理 HTTP Server 的生命周期，并注入同一个 Logger 记录启动和关闭过程。业务项目增加数据库、Redis、文件 Logger 或可观测性 Provider 后，应通过 `m.WithCloser` 注册这些资源。

## 开发与验证

```bash
go test -race ./...
go vet ./...
go build ./...
```

修改 `api/` 下的接口定义后，可以使用 Maltose CLI 生成对应骨架：

```bash
maltose gen service
```

模板依赖固定在 `go.mod` 中。升级 Maltose 后应执行完整验证：

```bash
go get github.com/graingo/maltose@latest
go mod tidy
go test -race ./...
```

完整文档见 [Maltose Documentation](https://graingo.github.io/maltose-docs/)。

# monawms-backend

MonaWMS 的 Go 重写后端，基于 [Maltose](https://github.com/graingo/maltose) 框架，沿用原 PHP 后端的 `monawms` 数据库 schema。

## 技术栈

- 框架：Maltose（`mhttp` / `mdb` / `mcfg` / `mlog` / `merror`+`mcode`）
- 数据库：MySQL 5.7（`monawms` 库，schema 与原系统一致）
- 认证：JWT（HS256）+ bcrypt

## 快速开始

```bash
# 1. 安装 CLI（仅首次）
go install github.com/graingo/maltose/cmd/maltose@latest

# 2. 配置数据库：编辑 .env（供 maltose gen 使用）与 config/config.yaml（运行时使用）
#    两处的数据库连接必须保持一致

# 3. 启动
go run main.go          # 默认监听 :8080

# 4. 验证
curl http://127.0.0.1:8080/health
```

## 目录结构

```text
.
├── api/auth/v1/            # API 契约（请求/响应结构体与路由元数据）
├── cmd/server.go           # 路由注册与中间件装配
├── config/config.yaml      # 运行时配置（server / database / jwt）
├── internal/
│   ├── controller/auth/    # 请求解析，转调 service
│   ├── service/            # 业务接口定义与实现注册
│   ├── logic/auth/         # 业务逻辑实现
│   ├── middleware/         # 路由层中间件（认证等）
│   ├── pkg/token/          # JWT 签发/解析与身份传递
│   ├── dao/                # 数据访问（maltose gen dao 生成）
│   └── model/              # 数据模型（maltose gen model 生成）
└── main.go                 # 应用生命周期入口
```

请求链路：`Router → Middleware → Controller → Service/Logic → DAO`。
开发规则见 [`AGENTS.md`](./AGENTS.md)。

## 已实现接口

统一响应结构：`{ "code": 0, "message": "OK", "data": ... }`，错误码非 0，HTTP 状态码与错误码语义一致。

| 方法 | 路径 | 认证 | 说明 |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | 否 | 登录，返回 token / refreshToken / user |
| POST | `/api/auth/register` | 否 | 注册，默认角色 viewer |
| POST | `/api/auth/refresh` | 否 | 用 refreshToken 换取新令牌对 |
| GET | `/api/auth/profile` | 是 | 查询当前用户信息 |
| PUT | `/api/auth/profile` | 是 | 更新资料或密码（需校验原密码） |
| POST | `/api/auth/logout` | 是 | 退出登录（JWT 无状态，服务端不维护黑名单） |
| GET | `/health` | 否 | 健康检查 |
| GET | `/api.json` | 否 | OpenAPI 文档 |
| GET | `/swagger` | 否 | Swagger UI |

调用示例：

```bash
TOKEN=$(curl -s -X POST http://127.0.0.1:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"password"}' | jq -r '.data.token')

curl http://127.0.0.1:8080/api/auth/profile -H "Authorization: Bearer $TOKEN"
```

## 认证约定

- 请求头：`Authorization: Bearer <token>`
- 业务 claims 统一放在 JWT 的 `data` 子对象中，与原 PHP 后端一致，**存量 token 可直接复用**
- 密码使用 bcrypt（与存量 `users.password_hash` 兼容）
- 刷新令牌不能充当访问令牌；白名单路由为 login / register / refresh
- 仓库维度的二维授权（`user_warehouse_grant`）将在后续阶段接入 `middleware`

## 代码生成与验证

```bash
maltose gen model     # 依据库表生成 internal/model
maltose gen dao       # 生成 internal/dao
maltose gen service   # 依据 api/ 生成 controller 与 service 骨架
maltose gen logic     # 依据 service 接口生成 logic 实现骨架

go build ./... && go vet ./... && go test ./...
```

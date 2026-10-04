# MonaWms 后端开发规则

本文件是项目级 AI/开发约定，所有代码改动必须遵循以下规则。
技术栈：Go + Maltose 框架（`mhttp` / `mdb` / `mcfg` / `mlog`），数据库沿用原 MonaWMS 的 `monawms` 库（schema 不变）。

## 一、分层职责

请求链路固定为：`Router → Controller → Service/Logic → DAO/Provider`。

| 层 | 目录 | 允许做的事 | 禁止做的事 |
| --- | --- | --- | --- |
| API 契约 | `api/v1/` | 定义请求/响应结构与 `m.Meta` 路由元数据 | 写业务逻辑 |
| Controller | `internal/controller/` | 参数绑定、响应封装、调用 service | 开事务、直接写 SQL |
| Service | `internal/service/` | 定义窄接口 + 注册/获取实现 | 写具体实现 |
| Logic | `internal/logic/` | 业务编排、**唯一允许开事务的层** | 直接操作 HTTP 对象（作为业务输入） |
| DAO | `internal/dao/` | 表级数据访问（`maltose gen dao` 生成） | 开事务、跨表业务判断 |
| 工具 | `internal/pkg/` | 无框架依赖的纯函数 + 少量上下文读写 | 反向依赖 logic/service |
| Model | `internal/model/entity`、`internal/model/do` | 表实体与 DO（`maltose gen model` 生成） | 手写修改生成文件 |

## 二、库存约束（最高优先级）

1. `inventory` 是快照，`inventory_transactions` 是流水，**快照必须等于流水汇总**。
2. 任何库存变更（入库、出库、盘点调整、报废、预留）都必须在**同一个事务**内：先写流水，再更新快照。
3. 出库扣减必须使用 `SELECT ... FOR UPDATE` 行锁，禁止用乐观锁或「先查后写」替代。
4. 库存变更的入口统一走 `internal/logic` 中的事务辅助函数（如 `withInventoryTx`），禁止各处自行开事务。

## 三、事务规则

- 事务**只在 logic 层**开启，controller 与 dao 层禁止出现 `Transaction`、`Begin`。
- 事务内禁止调用外部 HTTP、发送通知等耗时操作。
- 事务最短化：所有数据准备与校验在开事务前完成。

## 四、授权与审计

- 授权是**账号 × 仓库**的二维矩阵（`user_warehouse_grant`），每个仓库级接口都要校验。
- 权限校验通过 `mhttp` 中间件挂在路由层：`Auth` 校验 JWT→`WarehouseScope` 解析 `X-Warehouse-Id` 并校验二维授权。
- 所有写操作必须写 `operation_log` 审计日志，并用 `mlog` 双写关键节点；统一入口为 `internal/pkg/oplog`。
- 审计写入失败**不得**阻断主流程，只记录 warn。
- 权限矩阵集中在 `internal/pkg/permission`（移植自原 PHP `config/permission.php`）：
  - 系统级动作（`product:write`、`warehouse:write` 等）只看全局角色 `admin`；
  - 仓库级动作（`inbound:post`、`inventory:adjust` 等）必须命中该仓库的 `grant_role`；
  - 默认**严格模式**（`permission.admin_bypass_warehouse: false`），管理员也要先被授权才能访问某仓库。

## 五、配置约定

- `maltose gen model/dao` 从项目根目录 `.env` 读取数据库（键：`DB_TYPE/DB_HOST/DB_PORT/DB_USER/DB_PASS/DB_NAME`）。
- 应用运行时从 `config/config.yaml` 读取（`database.default`、`server.default`、`jwt`）。
- **两处数据库配置必须保持一致**；生产密码通过部署环境的配置文件覆盖，不提交真实密钥。

## 六、代码生成与命令

```bash
maltose gen model    # 依据库表生成 internal/model/entity 与 internal/model/do
maltose gen dao      # 生成 internal/dao
maltose gen service  # 依据 api/ 定义生成 controller/logic/service 骨架
go build ./... && go vet ./... && go test ./...
go run main.go       # 本地启动，默认 :8080，健康检查 /health
```

修改 `api/` 后优先用 `maltose gen service` 生成骨架，再在 `internal/logic` 中补业务实现。

## 七、命名与风格

- 注释与日志使用简体中文；标识符保持英文。
- 时间字段统一 `time.Time`；对外响应的金额/数量用字符串透传 `decimal`，内部计算用 `decimal` 或 `int64` 分，**禁止用 float 表示金额**。
- 错误统一用 `errors/merror` 与 `mcode` 错误码返回，禁止在 controller 里直接 `panic`。
- 对外接口保持与原 PHP 后端一致：RESTful 路径不变、响应字段用 snake_case，前端无需改动。

## 八、数据库约定（MySQL 严格模式）

1. **可空的时间列必须落成 NULL**：`monawms` 库大量 datetime/date 列为可空且无默认值，MySQL 严格模式拒绝 `'0000-00-00'`。
   实体里可空时间列统一用 `*time.Time`（如 `products.production_date`、`users.last_login_time`），零值字段不得进入 INSERT。
2. **软删除列统一用 `gorm.DeletedAt`**：写入时落 NULL、查询时自动过滤已删除行，禁止用 `time.Time` 模拟（会写入零值时间导致插入失败）。
3. 列表/树等场景必须避免 N+1：批量统计走 `internal/dao/master_query.go` 的 `SumStockByProducts`、`StatsBatch` 这类方法。

# AGENTS.md — MonaWMS-Lite 项目宪法

> opencode 在本仓库的常驻指令，所有阶段任务自动遵守。
> 业务背景与技术选型勿随意改动；确需调整请在本文件顶部注明变更原因与日期。

## 项目背景

面向小仓库（SKU 数百~数千、库存件数十万级）的轻量仓储管理系统，定位替代 Excel、比商用 WMS 更轻更快上线。

参考系统（WMS-Lite）要保留的优点：**单界面聚合操作、模糊搜索 + 多字段组合筛选、库存即时回显、全量操作日志、需求边界克制**。
必须补齐的短板：**金额字段、库存流水对账、事务行锁、批次 FIFO/FEFO、盘点调平、单据状态机与红冲、操作日志审计、报表导出**。

MVP 闭环：`商品主数据 → 入库 → 出库 → 库存查询/筛选 → 操作日志 → 报表导出`，且库存永远等于流水汇总。

## 技术栈（已确认，勿擅自更换）

- 后端：**ThinkPHP 6（PHP）** + think-orm + think-migration（phinx）+ think-queue + think-cache
- 数据库：**MySQL 5.7** + Redis
- 前端：**React 18 + TypeScript + Vite 4 + Ant Design 5 + @tanstack/react-query + Zustand + react-router-dom v7 + react-hook-form + zod + recharts**（已确认，勿改用 Vue / Element Plus）
- 认证：firebase/php-jwt + password_hash(bcrypt)
- 导出：phpoffice/phpspreadsheet（xlsx）+ 原生 CSV 流式
- 测试：PHPUnit/Pest（后端）+ Vitest（前端）

## 架构铁律

1. **严格分层**：`app/controller` 只接收参数与返回响应；`app/service` 承载全部业务规则与事务；`app/model` 只做数据访问与关联。Controller 与前端禁止写业务判断。
2. **库存不可直接 UPDATE**：库存由 `stock_movement` 流水驱动，`inventory` 是流水汇总的物化快照，二者必须在同一 `Db::transaction` 内更新。
3. **全量操作日志**：所有写操作落 `operation_log`（operator / action / target / before / after JSON diff / ip / created_at）。日志表只读，任何角色不可修改或删除。
4. **审计字段**：所有业务表含 `created_at`、`updated_at`、`deleted_at`（软删除）、`created_by`、`updated_by`。
5. **单据状态机**：`draft → confirmed → receiving/quality_check → posted`。已 posted 单据不可修改，只能红冲（生成反向单据）。
6. **软删除**：业务数据一律软删除，禁止物理 DELETE；外键一律 RESTRICT，禁止 CASCADE。

## 业务规则

- **出库校验**：可用库存（`qty - reserved_qty`）>= 出库数量，否则抛 `BizException('STOCK_INSUFFICIENT')` 并返回缺料明细。
- **并发控制**：扣减库存必须 `->lock(true)` 行锁（`SELECT ... FOR UPDATE`）+ 事务，**禁止"先查后改"**。
- **批次策略**：默认 FIFO（按生产日期/入库时间升序）；商品配置 `shelf_life_days` 时走 FEFO（按到期日升序）。策略可配置。
- **数值精度**：数量与金额一律 `DECIMAL(18,4)`；PHP 侧当 **string** 处理，运算用 **bcmath**（bcadd/bcsub/bcmul），**禁止 float 累加**。
- **唯一性与幂等**：`product.sku`、`inventory(product_id, location_id, batch_no)`、单据号全局唯一；过账接口支持 `idempotency_key` 唯一键，重复提交只生效一次。
- **权限**：只有**两个角色** —— `admin`（管理员）与 `operator`（录入员），权限矩阵见下方专门章节；越权返回 403。
- **报表口径**：金额 = 数量 × 流水固化的 `unit_cost`；加权平均单价 = (期初金额 + 本期入库金额) / (期初数量 + 本期入库数量)，分母为 0 返回 null；统计时间字段统一用 `occurred_at`（业务发生时间），不用 `created_at`。
- **导出**：统一走导出服务，>1 万行用 think-queue 异步任务 + 分批流式写出，禁止全量加载进内存；每次导出落 `operation_log`。

## 授权模型（角色 × 仓库 二维授权，覆盖默认角色权限）

> 场景：移动代维方等多方协作，每个账号在每个仓库上独立授权。
> **核心原则：默认无权限。只有被显式授权的 (账号, 仓库) 组合才可访问该仓库数据。**

### 模型定义

- 全局角色（`users.role`）：`admin` 管理员 / `operator` 录入员 —— 决定"能做什么动作"
- 仓库授权（`user_warehouse_grant`）：`(user_id, warehouse_id, grant_role)` —— 决定"在哪个仓库能做"
- **有效权限 = 全局角色 ∩ 仓库授权**。两者缺一不可；未授权仓库一律不可见、不可操作

### 授权表 `user_warehouse_grant`

| 字段 | 说明 |
|---|---|
| id | 主键 |
| user_id | 被授权账号 |
| warehouse_id | 授权仓库 |
| grant_role | `manager`（仓库管理员）/ `operator`（仓库录入员） |
| status | `active` / `revoked`，撤销用 revoked，不物理删 |
| granted_by | 授权人（系统管理员） |
| granted_at / revoked_at / revoked_by | 授权与撤销留痕 |
| created_at / updated_at / deleted_at | 审计字段 |

唯一键 `uk_user_warehouse (user_id, warehouse_id)`；索引 `idx_warehouse (warehouse_id)`。

### 权限判定规则

1. **动作权限**取全局角色：管理员可做写/审核类动作，录入员只能录单到 `confirmed`
2. **仓库权限**取授权表：目标仓库必须有 `status=active` 的授权记录，否则 403 `WAREHOUSE_NOT_GRANTED`
3. **仓库级 grant_role 可覆盖动作上限**：某仓库上授予 `manager` 的账号，在该仓库内等同管理员（可过账/调整/盘点过账/红冲）；授予 `operator` 的只能录入。**grant_role 只能收紧或等同全局角色，不能放大** —— 全局 `operator` 在仓库上被授予 `manager` 时，仍不可做用户管理、主数据全局修改等系统级动作
4. **系统级动作不受仓库授权约束**：用户管理、角色分配、仓库本身的 CRUD、全局报表，仅 `users.role = admin` 可用
5. **无仓库上下文的接口**（如商品主数据、分类）仅系统管理员可写；录入员只读
6. 前端仓库切换器只展示当前账号被授权的仓库；切换后所有请求带 `warehouse_id`

### 落地要点

- 所有带 `warehouse_id` 的业务接口，进入 Service 前统一过 `WarehouseScope` 校验（中间件 + Service 二次校验）
- 列表查询默认按授权仓库集合过滤（`WHERE warehouse_id IN (已授权集合)`），不靠前端传参
- 授权变更必须写 `operation_log`（谁授权、授给谁、哪个仓库、什么角色）
- 代维方账号建议同时记录 `department` 或 `vendor` 归属，便于按方统计与批量撤销
- 撤销授权后，该账号已创建的草稿单据保留但不可继续操作，由管理员接管

## 角色与权限（只有两个角色，勿自行新增）

系统只有 `admin`（管理员）和 `operator`（录入员）两种角色，`users.role` 用 `ENUM('admin','operator')`，默认 `operator`。
设计原则是**录审分离**：录入员负责把单据和系统数据录进来，管理员负责审核生效与改主数据。

### 权限矩阵

| 能力 | admin 管理员 | operator 录入员 |
|---|---|---|
| 登录、查看库存 / 报表 / 看板 / 操作日志 | ✅ | ✅ |
| 商品 / 分类 / 仓库 / 库区 / 库位 / 供应商 / 客户 CRUD | ✅ | ❌ |
| 创建、编辑入库单 / 出库单（draft、confirmed） | ✅ | ✅ |
| **过账入库 / 出库（posted，库存真正变动）** | ✅ | ❌ |
| 创建盘点单、录入实盘数量 | ✅ | ✅ |
| **盘点过账（生成 adjust 流水调平库存）** | ✅ | ❌ |
| 库存调整 / 移库（adjust、transfer 流水） | ✅ | ❌ |
| **红冲已过账单据** | ✅ | ❌ |
| 导出报表 | ✅ | ✅（记录 operation_log） |
| 用户管理、角色分配 | ✅ | ❌ |
| 修改 / 删除 operation_log | ❌ 任何人都不行 | ❌ |

### 落地要点

- 单据状态与角色绑定：`operator` 只能把单据推进到 `confirmed`；`posted` 只能由 `admin` 触发。Controller 层用 `app/middleware/Rbac.php` + Service 内二次校验（双重保险，接口被直连也拦得住）。
- 单据列表对 `operator` 默认只展示本人创建的（`created_by = 当前用户`），`admin` 看全部；如需看他人的，走管理员授权，不做数据越权放行。
- **仓库维度授权见上节「授权模型」**：每个账号在每个仓库独立授权，未授权仓库一律不可见。
- 前端：菜单级 + 按钮级双重控制。`<Permission action="...">` 组件控制按钮显隐；路由 meta 控制菜单。**前端隐藏只是体验，后端必须鉴权**。
- 顶栏仓库切换器只展示已授权仓库（数据来自 `GET /api/grants/user/:id`），切换后写入 `useWarehouseStore`，由 axios 拦截器自动注入 `warehouse_id`。
- `viewer` 只读角色不实现；如将来需要，再扩展 ENUM，不要现在预留。

## MySQL 5.7 硬约束（违反即为错误）

1. **不支持 CHECK 约束**（8.0.16 才生效）→ 用 `DECIMAL(18,4) UNSIGNED` 兜底负数，应用层再校验一次。
2. **无 CTE（WITH）、无窗口函数** → 报表用 `SUM(CASE WHEN ...)` + LEFT JOIN 子查询。
3. **默认开启 ONLY_FULL_GROUP_BY** → 非聚合列必须进 `GROUP BY` 或用 `ANY_VALUE()`。
4. **无函数索引** → 时间条件一律半开区间 `occurred_at >= :start AND occurred_at < :end`，禁止 `DATE(occurred_at) = ?`。
5. **utf8mb4 索引键长限制** → 长字符串唯一索引控制在 191 字符内。
6. **batch_no 必须 `NOT NULL DEFAULT ''`** → 唯一索引中 NULL 可重复，会导致非批次商品产生多行库存。
7. 引擎 InnoDB，字符集 utf8mb4；建表时一次性把索引想全（5.7 大表 DDL 会锁表）。
8. JSON 类型可用（5.7.8+），但 JSON 字段查询不走索引，只做展示。

## 目录结构

```
app/{controller,service,model,middleware,validate,job,common}
config/  route/api.php  database/{migrations,seed}
public/  tests/  docs/
frontend/src/{api,components,composables,layouts,pages,router,stores,types,utils}
```

## TP6 编码约定

- Service 方法带 PHPDoc 说明业务规则；关键分支注释写"为什么"而不是"做了什么"。
- 事务统一 `Db::transaction(fn)`；需要行锁用 `->lock(true)`。
- 统一响应 `Result::{success,error}`，结构 `{code, message, data, trace_id}`；业务错误走 HTTP 200 + 业务码。
- 校验用 `app/validate` 下的 Validate 类，不在 Controller 里手写 if 判断。
- 新增接口同步更新 `docs/` 接口清单与 README。
- 每个 Service 方法至少 1 个单测；出入库必须有并发测试；提供库存对账测试（流水汇总 == inventory）。

## 前端约定（React 18 + AntD 5）

- 页面目录：`src/pages/{dashboard,warehouse,inventory,inbound,outbound,shipping,reports,grant}`。
- 所有请求走 `src/api` 统一封装（axios 实例 + 拦截器），统一错误处理与 loading 态；数据获取用 `@tanstack/react-query`，**不要到处手写 useEffect + useState**。
- 全局状态用 Zustand：`useAuthStore`（用户/角色/token）、`useWarehouseStore`（当前仓库 + 已授权仓库列表，persist 持久化）。
- 表单用 `react-hook-form` + `zod` 校验，AntD `Form` 只做布局与控件。
- 组件 PascalCase，函数组件 + hooks，样式用 CSS Module 或 AntD `theme` token，禁止内联魔法数字。
- 权限控制用 `<Permission action="inbound:post">` 组件包裹按钮（前端隐藏只是体验，后端必须鉴权），路由级守卫写在 `src/router/PermissionRoute.tsx`。
- 图表用 `recharts`，图标用 `@ant-design/icons`。
- **所有业务请求必须带 `warehouse_id`**：在 axios 请求拦截器里从 `useWarehouseStore` 注入，业务代码不要手动拼。

## 交互规范（参考系统的体验精髓）

- 搜索与筛选**输入即触发**（防抖 300ms），不要求用户点"查询"按钮。
- 操作完成后**列表原地刷新**，不跳页。
- 出入库表单中数量/库存校验**即时反馈**（红字提示缺多少）。
- 主界面聚合 90% 高频操作，减少页面跳转。

## 工作纪律

- 开始每个任务前先读取相关现有文件，禁止凭空假设表结构或接口签名。
- 一次只做当前阶段范围内的改动，不越界重构。
- 完成后逐条对照该阶段"验收标准"自检并输出结果；不通过则说明原因并修复，不许带病进入下一阶段。
- 每阶段结束执行 `git add -A && git commit -m "feat(Px): ..."`。
- 不确定业务口径时，停下来向用户提问，不要自行猜测。

## 错误码约定

| code | HTTP | 含义 |
|---|---|---|
| STOCK_INSUFFICIENT | 200 | 库存不足（data 含缺料明细） |
| DOC_STATUS_INVALID | 200 | 单据当前状态不允许该操作 |
| MATERIAL_HAS_STOCK | 200 | 商品存在库存，禁止删除 |
| PERMISSION_DENIED | 403 | 权限不足或数据越权 |
| WAREHOUSE_NOT_GRANTED | 403 | 该账号未被授权访问此仓库 |
| DUPLICATE_CODE | 200 | 编码/SKU 重复 |
| IDEMPOTENT_HIT | 200 | 幂等命中，已忽略重复提交 |
| SYSTEM_ERROR | 500 | 未捕获异常，返回 trace_id |

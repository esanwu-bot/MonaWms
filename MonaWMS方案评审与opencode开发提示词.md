# MonaWMS 方案评审 + opencode 开发提示词（TP6 + MySQL 5.7 + Vue3）

> 已按真实栈重写：后端 ThinkPHP 6 + MySQL 5.7，前端 Vue 3 + TS + Vite + Element Plus。
> 第 1~2 章是方案评审与栈约束（人看）；第 3 章是可直接复制给 opencode 的分阶段提示词；第 4 章是 MySQL 5.7 专属写法附录。

---

## 1. 现有方案评审

### 1.1 两套方案文档与真实栈的差异（先对齐）

| 项 | 方案文档写的 | 实际 | 处理 |
|---|---|---|---|
| 后端框架 | Express.js + TypeScript | **ThinkPHP 6（PHP 7.4/8.x）** | 本文档全部按 TP6 重写 |
| ORM | Prisma | **think-orm（Db / Model）** | Prisma 相关内容作废 |
| 数据库 | MySQL 8.0 | **MySQL 5.7** | 见第 2 章约束，影响很大 |
| 前端 | Vue 3 + Element Plus + Pinia | 一致 | 保留 |

### 1.2 现有方案做得对的地方 ✅

1. **分层清晰**：controller / service / model / middleware 分离，TP6 天然适配，这条别动
2. **`inventory_transactions` 有 quantity_before / after**：这已经是"流水账本"的雏形，是做对账和报表的基础，比参考视频里的纯操作日志强
3. **`inventory` 有唯一键 `(product_id, location_id, batch_no)`**：批次维度库存，方向正确
4. **有 `available_quantity` 生成列**：预留/可用分离，MySQL 5.7.6+ 支持生成列，可用
5. **入库有质检环节、出库有拣货/打包/发货**：流程比小仓库标准需求更完整
6. **前端模块划分完整**：dashboard/warehouse/inventory/inbound/outbound/shipping/reports，覆盖到位

### 1.3 必须补的 12 个缺口 ⚠️（按严重度排序）

| # | 缺口 | 后果 | 修复 |
|---|---|---|---|
| 1 | **无金额字段**（inventory/transaction 都没 unit_cost、amount） | 进出存月报算不出金额，报表直接废掉 | inventory 加 `unit_cost DECIMAL(18,4)`；流水加 `unit_cost` + `amount` |
| 2 | **量纲用 INT** | 公斤/米/升类物料无法入库 | 全部改 `DECIMAL(18,4)`；整数物料靠 unit 控制输入 |
| 3 | **无负数防护** | MySQL 5.7 不执行 CHECK 约束，INT 可存 -999 | 改 `DECIMAL(18,4) UNSIGNED`，让 DB 层直接报错兜底 |
| 4 | **无操作日志表** | 物料被谁改了查不到，只有库存流水不算审计 | 新增 `operation_log`（JSON 存 before/after，5.7 支持 JSON） |
| 5 | **无软删除** | 删了物料，历史单据外键断裂 | 所有业务表加 `deleted_at` |
| 6 | **无单据过账态 / 红冲** | 录错了只能直接改库，审计过不了 | 状态机加 `posted`，已 posted 禁改，只能红冲生成反向单 |
| 7 | **无批次出库策略** | 有 batch_no 但不知道先出哪批 | 实现 FIFO / FEFO 挑批 service |
| 8 | **无盘点表** | 账实不符无法修正 | 新增 `stocktake` / `stocktake_item` |
| 9 | **`batch_no` 可空导致唯一键失效** | MySQL 唯一索引中 NULL 可重复，非批次物料会产生多行 | `batch_no VARCHAR(50) NOT NULL DEFAULT ''` |
| 10 | **库位层级过深**（warehouse→zone→shelf→location） | 小仓库用不上，录入成本高 | 保留 zone 但可选；location 直接挂 warehouse，shelf 降级为字段 |
| 11 | **supplier/customer 表缺失** | `supplier_id`/`customer_id` 外键无目标表 | 补 `supplier`、`customer`、`department`、`vendor` |
| 12 | **无幂等与并发锁** | 重复提交/并发出库 → 超发负库存 | 单据加 `idempotency_key` 唯一键；扣库存 `lock(true)` 行锁 |
| 13 | **无仓库维度授权**（原方案只有角色，不分区仓库） | 移动代维方场景下，一个账号能看到并操作所有仓库，多方共库必然互相干扰 | 新增 `user_warehouse_grant` 账号×仓库授权表，默认无权限 |

### 1.4 建议精简的地方（避免过度设计）

- **配送模块（shipping）**：小仓库场景优先级最低，MVP 可先只留一个 `tracking_no` + 状态字段，不做运输任务分配
- **效率分析报表**：依赖作业时长埋点，MVP 阶段砍掉，先做"进出存 + 库存现状 + 明细"
- **读写分离 / K8s / Redis 集群**：MVP 单机 + Redis 单实例即可，架构文档里保留但代码不实现
- **四角色 RBAC（admin/manager/operator/viewer）+ permission 表**：小仓库用不上，改为**两个角色** —— `admin` 管理员 / `operator` 录入员，遵循"录审分离"。不建 role / user_role / permission 三张表，权限写死在配置常量里，省掉整套权限后台维护成本
- **Prisma / Bull / passport.js**：PHP 栈下对应替换为 think-orm / think-queue / firebase-php-jwt

### 1.5 目标形态

> **MonaWMS-Lite**：保留原方案的完整流程骨架，把"库存准确性"和"报表可信"补上。
> 铁律：**库存只有一个真相 = `inventory_transactions` 流水；`inventory` 只是快照；报表由流水聚合，且必须与快照对账一致。**

---

## 2. MySQL 5.7 硬约束（写错就翻车）

| 约束 | 影响 | 应对 |
|---|---|---|
| **不支持 CHECK 约束**（8.0.16 才生效） | 写了 `CHECK (qty >= 0)` 会被静默忽略 | 用 `DECIMAL(18,4) UNSIGNED` 让负数直接报错 + 应用层校验 |
| **无 CTE（WITH）、无窗口函数** | 进出存月报不能写优雅的 CTE | 用 `SUM(CASE WHEN ...)` + LEFT JOIN 子查询（见 4.2） |
| **默认开启 `ONLY_FULL_GROUP_BY`** | `SELECT name, SUM(qty) GROUP BY id` 直接报 1055 | 非聚合列全部进 GROUP BY，或用 `ANY_VALUE()` |
| **无函数索引** | `WHERE DATE(occurred_at) = ?` 走不了索引 | 用范围查询 `>= start AND < end`；必要时加冗余列 `stat_date` |
| **utf8mb4 索引键长 767 字节限制**（未开 large_prefix 时） | 长字符串唯一索引建不上 | 编码/名称类唯一索引控制在 191 字符内，或只索引前缀 |
| **JSON 类型支持**（5.7.8+） | operation_log 的 before/after 可用 JSON | ✅ 可用，但查询 JSON 字段不走索引，只做展示 |
| **生成列支持**（5.7.6+） | `available_quantity` 生成列可用 | ✅ 但不能引用其他生成列 |
| **DDL 在线能力弱** | 大表加索引会锁表 | 建表时一次性把索引想全 |
| **已 EOL（2023-10 停止官方支持）** | 安全补丁风险 | 代码里避开 8.0 语法，为将来升级留余地 |

**PHP 侧还要注意**：金额/数量一律当 **string** 处理，运算走 `bcmath`（`bcadd`/`bcsub`/`bcmul`），**禁止用 float 累加**，否则对账差几分钱。

---

## 3. opencode 提示词（分阶段执行）

### 使用方式

1. 先把 `AGENTS.md` 放到项目根目录（与 `composer.json` 同级），opencode 每次启动自动读取
2. 交互模式逐条粘贴 P0~P8；非交互 `opencode run "<提示词>"`
3. 每阶段结束 `git commit -m "feat(P1): ..."`，方便回滚
4. 每个阶段末尾有验收标准，要求 opencode 自检并输出，不通过不许进下一阶段

---

### 3.0 阶段 P0：TP6 项目骨架与开发规范

```
【阶段 P0 - ThinkPHP 6 项目骨架】

目标：把 backend_tp6 工程规范化，建立可运行的 API 骨架与统一响应/异常处理。

任务：
1. composer 安装并确认版本：topthink/framework ^6.0、topthink/think-orm、topthink/think-migration、
   topthink/think-queue、topthink/think-cache、firebase/php-jwt、phpoffice/phpspreadsheet、ramsey/uuid。
   如已存在 composer.json 则先读取，不要覆盖已有依赖。
2. 目录规范化（app/ 下）：
   app/controller   —— 只做参数接收与响应，禁止写业务判断
   app/service      —— 全部业务规则与事务，核心
   app/model        —— think-orm 模型，只做数据访问与关联
   app/middleware   —— auth / rbac / operationLog / cors
   app/validate     —— think\Validate 校验器
   app/job          —— 异步任务（报表导出）
   app/common       —— 响应封装、异常类、枚举常量
3. 统一响应：app/common/Result.php，格式 {code, message, data, trace_id}，
   HTTP 200 承载业务错误码，禁止把业务错误塞进 HTTP 状态码。
4. 统一异常：BizException(code, message, data)，全局异常接管返回统一格式；
   未捕获异常记录 trace_id 并写日志，生产环境不暴露堆栈。
5. 配置：config/database.php 走 env，MySQL 5.7 连接 charset=utf8mb4；
   .env.example 补齐 DB_HOST/DB_NAME/DB_USER/DB_PASS/REDIS_HOST/JWT_SECRET。
6. 健康检查：GET /api/health 返回 {db: ok, redis: ok, time}。
7. 路由：route/api.php 按模块分组（auth/product/inventory/inbound/outbound/report），全部加 api 中间件组。

约束：本阶段不写任何业务表与业务接口。

验收标准（自检逐条输出）：
- [ ] composer install 成功，php think run 可启动
- [ ] /api/health 返回 200 且 db/redis 状态正确
- [ ] 主动抛 BizException 返回体符合统一格式
- [ ] 数据库连接使用 utf8mb4，MySQL 5.7 下无语法报错
- [ ] README 补充：依赖安装、启动、目录职责、环境变量
```

---

### 3.1 阶段 P1：数据库建模（MySQL 5.7 适配）

```
【阶段 P1 - 数据库建模与迁移】

目标：用 think-migration（phinx）建全部核心表，严格适配 MySQL 5.7。这是地基，宁可慢。

任务：
1. composer require topthink/think-migration，配置 database/migrations 路径。
2. 按下面的规格建表（每个表都必须含 created_at / updated_at / deleted_at / created_by / updated_by）：

   supplier 供应商：id、code(唯一)、name、contact、phone、status
   customer 客户：id、code(唯一)、name、contact、phone、status
   department 部门：id、name、parent_id
   category 商品分类：id、parent_id、code(唯一)、name、sort_order
   product 商品：id、sku(唯一)、name、category_id、spec 规格型号、unit 计量单位、barcode、
       batch_flag 是否批次管理(tinyint)、shelf_life_days 保质期(可空)、min_stock 安全库存、
       max_stock、default_location_id、status
   warehouse 仓库：id、code(唯一)、name、address、manager_id、status
   zone 库区：id、warehouse_id、code、name、zone_type(storage/picking/packing/staging)
   location 库位：id、warehouse_id、zone_id(可空)、code(仓库内唯一)、barcode、shelf 货架号(可空)、status
   inventory 库存（批次维度）：id、product_id、location_id、batch_no、qty DECIMAL(18,4) UNSIGNED、
       reserved_qty DECIMAL(18,4) UNSIGNED、unit_cost DECIMAL(18,4)、production_date、expiry_date
       唯一键 (product_id, location_id, batch_no)
   stock_movement 库存流水（唯一真相）：id、movement_no(唯一)、product_id、location_id、batch_no、
       direction(in/out)、qty DECIMAL(18,4)、balance_after DECIMAL(18,4)、unit_cost、amount、
       biz_type(purchase_in/sale_out/return_in/scrap_out/adjust_in/adjust_out/transfer)、
       biz_doc_type、biz_doc_id、operator_id、occurred_at
   inbound_order / inbound_order_item：order_no(唯一)、supplier_id、warehouse_id、
       status(draft/confirmed/receiving/quality_check/posted/cancelled)、idempotency_key(唯一,可空)、
       expected_date、received_date、posted_at、operator_id；
       明细含 product_id、location_id、batch_no、expected_qty、received_qty、qc_qty、rejected_qty、unit_cost
   outbound_order / outbound_order_item：order_no(唯一)、customer_id、department_id、warehouse_id、
       status(draft/confirmed/picking/packing/shipped/posted/cancelled)、priority、idempotency_key(唯一,可空)、
       required_date、shipped_date、posted_at、operator_id；
       明细含 product_id、batch_no、required_qty、picked_qty、shipped_qty
   stocktake / stocktake_item 盘点：stocktake_no(唯一)、warehouse_id、scope(分类/库位范围)、
       status(draft/counting/posted)；明细含 product_id、location_id、batch_no、book_qty、counted_qty、diff_qty
   operation_log 操作日志：id、operator_id、action、target_type、target_id、before(JSON)、after(JSON)、ip、created_at（只读表）
   user：沿用现有 users 表，role 改为 ENUM('admin','operator') DEFAULT 'operator'，补 deleted_at、
      department_id、vendor 代维方归属（可空）
      —— 只有两个全局角色：admin 管理员 / operator 录入员。不建 role、user_role、permission 三张表，
         权限规则写死在 config/permission.php 常量与 app/middleware/Rbac.php 里
   user_warehouse_grant 账号仓库授权表（★ 移动代维方多方协作的核心）：
      id、user_id、warehouse_id、grant_role ENUM('manager','operator')、
      status ENUM('active','revoked') DEFAULT 'active'、
      granted_by、granted_at、revoked_by、revoked_at、created_at、updated_at、deleted_at
      唯一键 uk_user_warehouse (user_id, warehouse_id)；索引 idx_warehouse (warehouse_id)
      —— 默认无权限，只有被显式授权的 (账号, 仓库) 组合才能访问该仓库

3. MySQL 5.7 适配硬要求：
   - 数量金额一律 DECIMAL(18,4)，库存数量加 UNSIGNED（替代不支持的 CHECK 约束）
   - batch_no 一律 NOT NULL DEFAULT ''，避免唯一键被 NULL 绕过
   - 禁用 CHECK 约束、禁用 CTE、禁用窗口函数，迁移文件里出现即为错误
   - 索引：product.sku/name、stock_movement(product_id, occurred_at)、stock_movement(biz_doc_type, biz_doc_id)、
     inventory(product_id)、operation_log(target_type, target_id)、inbound_order(status, created_at)
   - 引擎 InnoDB，字符集 utf8mb4
   - 外键：业务数据用 RESTRICT，禁止 CASCADE 删除

4. 种子数据：database/seed 生成 50 分类 / 500 商品 / 3 仓库 / 60 库位 / 1 年内的 2000 条流水，供报表与压测。

验收标准：
- [ ] php think migrate:run 成功，migrate:rollback 可完整回滚
- [ ] SHOW CREATE TABLE 确认所有数量字段为 DECIMAL(18,4) UNSIGNED
- [ ] 所有表含审计字段与 deleted_at
- [ ] 向 inventory 插入 -1 数量，数据库报错（验证 UNSIGNED 兜底生效）
- [ ] 种子数据可一键执行
- [ ] 在 MySQL 5.7 实例上实测通过（不是 8.0）
```

---

### 3.2 阶段 P2：商品 / 仓库 / 库位基础数据

```
【阶段 P2 - 基础数据模块】

目标：打通商品、分类、仓库、库位 CRUD 与管理页面，并接入操作日志。

后端（TP6）：
1. CategoryService：树形 CRUD + tree 接口（递归一次查全表，内存构树，避免 5.7 递归查询）
2. ProductService：CRUD + 分页列表 + 多条件筛选（name 模糊、category_id、unit、spec、batch_flag、status）
   + sku 精确查询 + 软删除（有库存则拒绝删除，抛 MATERIAL_HAS_STOCK）
3. WarehouseService / ZoneService / LocationService：CRUD，location 支持按 warehouse/zone 过滤，
   location.code 在仓库内唯一
4. 写操作统一经过 app/middleware/OperationLog.php 或在 Service 基类切面记录 operation_log，
   before/after 用 JSON 存变更字段 diff

前端（Vue3 + Element Plus）：
5. 商品管理页：左侧分类树 + 右侧表格（SKU/名称/分类/规格/单位/批次管理/安全库存/状态），
   顶部搜索框名称模糊搜索，筛选区支持分类/单位/规格/状态组合
6. 商品新增/编辑抽屉表单，校验 SKU 必填唯一、名称必填
7. 仓库管理页 + 库位管理页（表格 + 抽屉表单）

交互要求（来自参考系统的精髓）：
- 搜索与筛选输入即触发（防抖 300ms），不点"查询"按钮
- 操作完成后列表原地刷新，不跳页

验收标准：
- [ ] 商品列表支持名称模糊 + 4 个以上字段组合筛选，结果正确
- [ ] 新建后立即可查，修改后 operation_log 有 before/after 记录
- [ ] 删除有库存商品被拒绝并返回明确提示
- [ ] 分类树正确渲染层级
- [ ] Service 层有 PHPUnit/Vitest 单测（后端用 phpunit 或 pest）
```

---

### 3.3 阶段 P3：入库与出库（核心事务）

```
【阶段 P3 - 出入库核心事务】

目标：单据化入库/出库，库存由流水驱动，并发安全。全系统最关键阶段。

后端（TP6，注意事务与行锁写法）：
1. InboundService 状态机：draft → confirmed → receiving → quality_check → posted
   过账（posted）时：
   - Db::transaction 包裹全部操作
   - 校验明细非空、数量 > 0、库位存在且状态可用
   - 行锁：Db::name('inventory')->where($uniq)->lock(true)->find()
   - 不存在则插入，存在则 UPDATE（禁止直接裸 UPDATE，必须走流水）
   - 写 stock_movement（direction=in, balance_after=变动后数量, unit_cost, amount）
   - 单据置 posted，写 posted_at / operator_id
   - 任一失败整体 rollBack
2. OutboundService 同状态机，过账时按批次策略挑批：
   - FIFO：按 production_date、入库时间升序
   - FEFO：按 expiry_date 升序（product.shelf_life_days 非空时优先）
   - 可用库存 = qty - reserved_qty；不足抛 BizException(STOCK_INSUFFICIENT)，
     返回缺料明细（哪个 SKU、缺多少）
3. TransferService 移库：单事务内写两条 movement（out + in）
4. 幂等：过账接口读 idempotency_key 唯一键，命中则直接返回首次结果，不重复扣减
5. 所有过账写 operation_log

前端：
6. 入库单页：表头（供应商/单号/仓库/预计到货日）+ 明细表格（选商品自动带单位规格 → 填库位/批次/数量/单价）
   + 保存/确认收货/质检/过账按钮，按钮按状态置灰
7. 出库单页：选商品后自动带出可用库存并展示，超量即时红字提示；支持领用部门
8. 单据列表页：按单号/状态/日期区间筛选；已 posted 单据只读，只能红冲

并发要求（必须写测试证明）：
- 同一库存行 10 个并发出库（总量超库存），最终只允许成功到库存为 0，绝不出现负库存
- 用 Db::startTrans + lock(true) 实现，禁止"先查后改"

验收标准：
- [ ] 入库过账后 inventory.qty == 该维度流水汇总（写对账脚本验证）
- [ ] 出库严格 FIFO/FEFO，测试可验证挑批顺序
- [ ] 库存不足返回明确错误码与缺料明细，无负库存
- [ ] 并发测试通过且可复现
- [ ] 已 posted 单据修改被拒绝
- [ ] 幂等键重复提交只生效一次
```

---

### 3.4 阶段 P4：库存查询与筛选

```
【阶段 P4 - 库存查询与筛选】

目标：做出"库存实时可视 + 多维筛选"的核心体验，并向 Excel 交付靠拢。

后端：
1. InventoryService.query：按 product_id / location_id / batch_no / warehouse_id 过滤；
   支持 name 模糊、分类、规格、单位、批次、库位筛选；
   快捷标签：低于安全库存 / 临期（expiry_date N 天内）/ 零库存
2. 返回字段：SKU、名称、分类、规格、单位、仓库、库位、批次、数量、可用量、单价、金额、生产日期、到期日、状态
3. 分页 + 多列排序 + 汇总行（总数量、总金额）
4. 库存明细账：按商品/批次查 stock_movement 时间线，含每笔变动前后余额
5. 金额一律 DECIMAL 转 string 输出，PHP 侧禁止 float 运算

前端：
5. 库存查询页：可折叠筛选区（名称搜索 + 分类/单位/规格/批次/库位下拉 + 状态快捷标签），输入即筛选（防抖 300ms）
6. 表格底部汇总行：总数量、总金额
7. 点击行 → 抽屉展示该批次的库存流水时间线
8. 导出当前筛选结果为 Excel（见 P6）

性能要求：
- 造 10 万条库存记录，列表接口响应 < 1s；用 EXPLAIN 验证走了索引

验收标准：
- [ ] 6 个以上筛选维度可组合且结果正确
- [ ] 库存数字与流水汇总一致（对账测试：随机 100 次出入库后校验）
- [ ] 列表查询 EXPLAIN 命中索引，无全表扫描
- [ ] 金额在 PHP 侧无 float 精度丢失（0.1+0.2 场景验证）
```

---

### 3.5 阶段 P5：盘点与库存预警

```
【阶段 P5 - 盘点与预警】

目标：解决"系统账 vs 实物账"漂移，这是仓库系统能否长期可信的关键。

后端：
1. StocktakeService：
   - 创建盘点单（draft）：按仓库/库区/分类范围生成明细，book_qty 取当前 inventory 快照
   - 录入实盘 counted_qty，自动算 diff_qty = counted - book
   - 过账（posted）：对差异行生成 adjust_in / adjust_out 类型 stock_movement，把库存调平；
     同时更新 inventory 快照，同事务完成
   - 盘点单冻结：创建后如库存发生变动，需提示"账面数已变更"，提供刷新账面数按钮
2. AlertService：
   - 低于安全库存清单：inventory 汇总 qty < product.min_stock
   - 临期清单：expiry_date 在 N 天内；已过期单独列出
   - 返回结构统一 {type, product, qty, threshold}
3. 预警可配置为定时任务（think-cron 或 think-queue 延时任务），结果缓存到 Redis

前端：
4. 盘点页：盘点单列表 + 盘点录入表格（账面数/实盘数/差异，差异行标红）+ 过账按钮
5. 预警页 / 首页预警卡片：低库存、临期、已过期三个 Tab，点击可跳转库存查询并带上筛选条件

验收标准：
- [ ] 盘点过账后 inventory 与实盘数完全一致，且生成对应 adjust 流水
- [ ] 边界正确：qty 恰好等于 min_stock 时不报警，小于才报警
- [ ] 盘点过账是幂等的（重复过账不重复调平）
- [ ] 已过期与临期分类正确（过期 = expiry_date < 今天）
```

---

### 3.6 阶段 P6：报表与导出（重点 ⭐）

```
【阶段 P6 - 报表与导出】

目标：把库存与流水变成能直接交付的报表文件。本轮最高优先级。

后端：
1. 导出基础设施：
   - 封装 app/common/Export.php，支持 xlsx（PhpSpreadsheet）与 csv 两种
   - 超过 1 万行走 think-queue 异步任务：提交生成任务 → 轮询状态 → 完成后下载
   - 大数据用分批查询（chunk by id）+ 流式写出，禁止一次性 select 全量进内存
   - 导出文件名 UTF-8 编码，Content-Disposition 需兼容中文
2. 五类报表：
   a. 库存现状表：当前筛选下的库存明细 + 汇总行 + 导出时间水印
   b. 进出存月报（核心）：按商品（可选按分类）汇总某月份
      期初数量/金额 → 本期入库数量/金额 → 本期出库数量/金额 → 期末数量/金额 → 加权平均单价
   c. 出入库明细表：时间区间内每笔 movement（单号/业务类型/SKU/批次/库位/方向/数量/变动后余额/操作人/时间）
   d. 部门领用汇总：出库按 department 分组统计（数量、金额、占比）
   e. 批次追溯报表：给定批次号，导出该批次从入库到出库完整流水
3. MySQL 5.7 写法硬约束（详见 AGENTS.md 附录）：
   - 禁止 CTE 与窗口函数，用 SUM(CASE WHEN direction='in' THEN qty ELSE 0 END) + LEFT JOIN 子查询
   - sql_mode 含 ONLY_FULL_GROUP_BY：非聚合列必须进 GROUP BY 或用 ANY_VALUE()
   - 时间范围一律 occurred_at >= :start AND < :end，禁止 DATE(occurred_at)= 函数包裹
4. 报表页口径必须写进代码注释与 README：
   - 金额 = 数量 × 批次 unit_cost
   - 加权平均单价 = (期初金额 + 本期入库金额) / (期初数量 + 本期入库数量)，分母为 0 返回 null
   - 期末数量必须等于当前 inventory 快照，且通过流水对账测试
   - 统计时间用 occurred_at（业务发生时间），不用 created_at
5. 每次导出写 operation_log（谁、什么条件、导出了什么）

前端：
6. 报表中心页：Tab 切换（库存现状 / 进出存月报 / 出入库明细 / 部门领用 / 批次追溯），
   每 Tab 独立筛选区（月份、日期区间、仓库、分类、部门、商品），"导出 Excel"触发下载
7. 进出存月报先页面预览表格（期初/入/出/期末四列组），确认无误再导出
8. 异步导出显示"生成中"状态 + 进度，完成后提供下载
9. 首页看板加"常用报表"快捷入口
10. 图表（ECharts）：出入库趋势、分类库存占比、TOP10 领用部门

验收标准：
- [ ] 进出存月报期末数量与库存查询页数字完全一致（对账测试：随机 200 次出入库后按月汇总校验）
- [ ] 5 类报表均可导出且能正常打开，数值列为数值型而非文本
- [ ] 导出 10 万行不超时、不 OOM（压测记录内存峰值与耗时）
- [ ] 同一筛选条件下，页面预览与导出文件内容一致
- [ ] MySQL 5.7 下无 ONLY_FULL_GROUP_BY 报错，SQL 通过 EXPLAIN 索引校验
- [ ] 每次导出有 operation_log 记录
```

---

### 3.7 阶段 P7：权限与操作日志（两角色：管理员 / 录入员）

```
【阶段 P7 - 权限与审计】

目标：两角色权限落地 + 审计可追溯。系统只有 admin（管理员）和 operator（录入员）两种角色，
遵循"录审分离"：录入员把数据录进来，管理员审核生效。

角色权限矩阵（必须严格实现，勿自行扩展角色）：
| 能力 | admin 管理员 | operator 录入员 |
|---|---|---|
| 查看库存/报表/看板/操作日志 | ✅ | ✅ |
| 商品/分类/仓库/库区/库位/供应商/客户 CRUD | ✅ | ❌ |
| 创建、编辑入库单/出库单（draft、confirmed） | ✅ | ✅ |
| 过账入库/出库（posted，库存真正变动） | ✅ | ❌ |
| 创建盘点单、录入实盘数量 | ✅ | ✅ |
| 盘点过账（生成 adjust 流水调平） | ✅ | ❌ |
| 库存调整/移库（adjust、transfer） | ✅ | ❌ |
| 红冲已过账单据 | ✅ | ❌ |
| 导出报表 | ✅ | ✅（记 operation_log） |
| 用户管理、角色分配 | ✅ | ❌ |
| 修改/删除 operation_log | ❌ 任何人都不行 | ❌ |

后端：
1. JWT：firebase/php-jwt 签发 access_token（2h）+ refresh_token（7d）；
   app/middleware/Auth.php 解析并注入当前用户；登出将 token 加入 Redis 黑名单
2. 不建 role/user_role/permission 表。权限规则写成 config/permission.php 常量：
   PERMISSION = ['product:write' => ['admin'], 'inbound:post' => ['admin'], 'outbound:post' => ['admin'],
                 'stocktake:post' => ['admin'], 'inventory:adjust' => ['admin'], 'doc:reverse' => ['admin'],
                 'user:manage' => ['admin'], 'inbound:write' => ['admin','operator'], ...]
   app/middleware/Rbac.php 读常量鉴权；同时在每个 Service 方法入口二次校验角色（接口被直连也拦得住）
3. 单据状态与角色绑定：operator 只能推进到 confirmed；posted 只能由 admin 触发
4. 单据列表：operator 默认只看到 created_by = 自己的单据，admin 看全部
5. operation_log：中间件统一记录 POST/PUT/DELETE（operator_id、action、target、before/after JSON diff、ip）；
   日志表只读，任何角色不可修改删除
6. 密码用 password_hash（bcrypt），日志中不出现明文密码与 token

【★ 账号仓库授权（移动代维方场景，本阶段重点）】

业务背景：仓库由移动代维方等多方维护，每个账号在每个仓库上独立授权。
核心原则：**默认无权限，只有被显式授权的 (账号, 仓库) 组合才能管理和录入该仓库。**

7. 建表 user_warehouse_grant：user_id、warehouse_id、grant_role ENUM('manager','operator')、
   status ENUM('active','revoked')、granted_by、granted_at、revoked_by、revoked_at + 审计字段；
   唯一键 (user_id, warehouse_id)，索引 (warehouse_id)
8. 有效权限 = 全局角色 ∩ 仓库授权，两者缺一不可：
   - 动作权限看 users.role（管理员可审核过账，录入员只能录到 confirmed）
   - 仓库权限看 grant 表：目标仓库必须有 status=active 的记录，否则 403 WAREHOUSE_NOT_GRANTED
   - 仓库级 grant_role=manager 的账号，在该仓库内可过账/调整/盘点过账/红冲；
     grant_role=operator 的只能录入
   - grant_role 只能收紧或等同全局角色，不能放大：全局 operator 即使被授予仓库 manager，
     仍不可做用户管理、全局主数据修改等系统级动作
9. 系统级动作（用户管理、授权管理、仓库 CRUD、全局报表）仅 users.role=admin，不受仓库授权约束
10. WarehouseScope 校验：所有带 warehouse_id 的业务接口，中间件 + Service 入口双重校验；
    列表查询默认按"已授权仓库集合"过滤（WHERE warehouse_id IN ...），不依赖前端传参
11. 授权变更（授予/撤销/改角色）必须写 operation_log，记录谁授权、授给谁、哪个仓库、什么角色
12. 撤销授权：status 置 revoked 并留痕，不物理删除；该账号已创建的草稿单据保留但冻结，由管理员接管
13. 批量授权：支持按代维方（vendor）批量授予多个仓库，便于新增/更换代维方时一次性配置

前端：
14. 登录页、路由守卫（未登录跳登录）、按角色动态隐藏菜单与按钮（v-permission 指令）
15. 顶栏：当前用户 + 角色 + **仓库切换器**（只展示被授权的仓库），切换后所有请求带 warehouse_id
16. 授权管理页（仅系统管理员可见）：
    - 按仓库查看已授权账号列表，支持授予、改角色、撤销
    - 按账号查看其被授权的仓库列表（矩阵视图：行=账号，列=仓库，交叉点=角色）
    - 支持按代维方筛选与批量操作
17. 录入员看到的单据页：过账/红冲/调整按钮置灰并 tooltip 提示"需管理员操作"
18. 未授权仓库在切换器中不出现；若前端被绕过直连未授权仓库接口，后端返回 403
19. 操作日志页：按人/动作/时间区间/目标 ID 筛选；详情以 diff 形式高亮变更字段
20. 批次追溯页：输入 SKU + 批次号，展示时间线（入库/出库/调整节点串联）

验收标准：
- [ ] operator 调商品删除接口返回 403
- [ ] operator 调入库/出库过账接口返回 403，且库存不发生任何变动
- [ ] operator 调盘点过账、库存调整、红冲接口均返回 403
- [ ] operator 调单据创建接口成功，且状态只能到 confirmed
- [ ] operator 单据列表看不到他人创建的单据
- [ ] admin 全部接口可用
- [ ] **账号 A 未授权仓库 W 时，调 W 的任何业务接口返回 403 WAREHOUSE_NOT_GRANTED**
- [ ] **账号 A 授权仓库 W 后，可正常录入；再撤销后立刻不可访问（含列表查不到 W 的数据）**
- [ ] **同一账号授权多仓库时，仓库切换器只显示已授权仓库，列表数据按当前仓库隔离**
- [ ] **全局 operator 被授予仓库 manager 后，仍不能做用户管理/授权管理**
- [ ] 授予/撤销/改角色全部有 operation_log 记录
- [ ] 列表接口不传 warehouse_id 时，自动收敛到已授权仓库集合，不会越权看到未授权数据
- [ ] 前端菜单与按钮按角色正确隐藏；前端隐藏仅为体验，后端绕过前端直连接口仍被拦截
- [ ] 出入库、主数据增删改、盘点调整全部有日志，无遗漏（写测试遍历主要接口）
- [ ] 日志接口无删除/修改入口
```

---

### 3.8 阶段 P8：测试、看板与部署收尾

```
【阶段 P8 - 测试、看板与部署】

目标：补齐质量保障与交付文档。

任务：
1. 首页看板：今日入库单数/出库单数、库存总量与总金额、低于安全库存数、临期批次数、近 10 条操作日志、常用报表入口
2. 测试：
   - PHPUnit/Pest：所有 Service 核心方法单测
   - 出入库并发测试（并行进程或多次循环 + 事务锁验证）
   - 库存对账测试：随机 500 次出入库后，inventory 快照 == 流水汇总
   - 报表对账测试：月报期末 == 库存快照
3. 部署：
   - Dockerfile（php:8.1-fpm + nginx）+ docker-compose（php / nginx / mysql:5.7 / redis）
   - MySQL 5.7 配置：utf8mb4、innodb_lock_wait_timeout、max_allowed_packet、慢查询日志
   - 数据库定时备份脚本（mysqldump + 保留 7 天）
   - 生产关闭 debug、日志轮转
4. 文档：README 补接口清单、报表口径说明、环境变量说明、常见问题

验收标准：
- [ ] 随机 500 次出入库后库存与流水完全一致
- [ ] 并发出库不出现负库存
- [ ] 每一笔库存变动都能在日志里找到人和时间
- [ ] 盘点后账实一致
- [ ] 权限越权测试全过
- [ ] docker compose up 在 MySQL 5.7 环境一键启动成功
- [ ] 数据库有自动备份
```

---

### 3.9 一次性执行版（不想分阶段时用这条）

```
按 AGENTS.md 项目宪法，在 ThinkPHP 6 + MySQL 5.7 后端（backend_tp6）与 Vue3+Element Plus 前端上实现 MonaWMS-Lite。
依次完成：1) TP6 骨架：统一响应/异常/中间件/路由分组/健康检查；2) think-migration 建全部表（supplier/customer/
department/category/product/warehouse/zone/location/inventory/stock_movement/inbound_order+item/outbound_order+item/
stocktake+item/operation_log/user/role/permission），含审计与软删除字段，MySQL 5.7 适配；3) 商品/分类/仓库/库位
CRUD + 管理页 + operation_log；4) 入库/出库单据状态机，库存由流水驱动、lock(true) 行锁保证并发、FIFO/FEFO 挑批、
幂等键；5) 库存多维筛选查询页（名称模糊 + 分类/单位/规格/批次/库位 + 低库存与临期快捷标签、汇总行、批次流水时间线）；
6) 报表与导出（重点）：进出存月报（期初/入/出/期末 + 加权平均单价）、库存现状表、出入库明细表、部门领用汇总、
批次追溯报表，统一 xlsx/csv 导出框架，1 万行以上走 think-queue 异步导出，月报期末数必须等于库存快照；
7) 盘点调平、库存预警；8) JWT + 两角色权限（admin 管理员 / operator 录入员，录审分离：录入员只能录单到 confirmed，
   过账/调整/盘点过账/红冲/主数据增删改仅限管理员，单据列表按创建人隔离）
   + **账号×仓库独立授权**（user_warehouse_grant 表，默认无权限，只有显式授权的 (账号,仓库) 才能管理和录入，
     支持移动代维方按账号按仓库授予/改角色/撤销，列表按已授权仓库集合过滤）+ 操作日志审计；9) 首页看板、PHPUnit 单测、
并发测试、对账测试、Docker(MySQL 5.7) 部署与备份脚本。每模块完成后输出自检结果并 git commit，最后更新 README。
```

---

## 4. 附录：MySQL 5.7 关键写法

### 4.1 安全建表片段（替代 CHECK）

```sql
CREATE TABLE inventory (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id INT UNSIGNED NOT NULL,
  location_id INT UNSIGNED NOT NULL,
  batch_no VARCHAR(50) NOT NULL DEFAULT '',
  qty DECIMAL(18,4) UNSIGNED NOT NULL DEFAULT 0,          -- UNSIGNED 替代 CHECK(qty>=0)
  reserved_qty DECIMAL(18,4) UNSIGNED NOT NULL DEFAULT 0,
  unit_cost DECIMAL(18,4) NOT NULL DEFAULT 0,
  production_date DATE NULL,
  expiry_date DATE NULL,
  deleted_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_prod_loc_batch (product_id, location_id, batch_no),
  KEY idx_product (product_id),
  KEY idx_expiry (expiry_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 4.2 进出存月报（无 CTE / 无窗口函数写法）

```sql
SELECT p.sku, p.name,
       IFNULL(o.open_qty,0)  AS open_qty,
       IFNULL(m.in_qty,0)    AS in_qty,
       IFNULL(m.out_qty,0)   AS out_qty,
       IFNULL(o.open_qty,0) + IFNULL(m.in_qty,0) - IFNULL(m.out_qty,0) AS close_qty,
       CASE WHEN IFNULL(o.open_qty,0) + IFNULL(m.in_qty,0) = 0 THEN NULL
            ELSE ROUND((IFNULL(o.open_amt,0) + IFNULL(m.in_amt,0))
                       / (IFNULL(o.open_qty,0) + IFNULL(m.in_qty,0)), 4) END AS avg_cost
FROM products p
LEFT JOIN (
  SELECT product_id,
         SUM(CASE WHEN direction='in'  THEN qty ELSE -qty END) AS open_qty,
         SUM(CASE WHEN direction='in'  THEN amount ELSE -amount END) AS open_amt
  FROM stock_movement
  WHERE occurred_at < :month_start AND deleted_at IS NULL
  GROUP BY product_id
) o ON o.product_id = p.id
LEFT JOIN (
  SELECT product_id,
         SUM(CASE WHEN direction='in'  THEN qty    ELSE 0 END) AS in_qty,
         SUM(CASE WHEN direction='out' THEN qty    ELSE 0 END) AS out_qty,
         SUM(CASE WHEN direction='in'  THEN amount ELSE 0 END) AS in_amt,
         SUM(CASE WHEN direction='out' THEN amount ELSE 0 END) AS out_amt
  FROM stock_movement
  WHERE occurred_at >= :month_start AND occurred_at < :month_end AND deleted_at IS NULL
  GROUP BY product_id
) m ON m.product_id = p.id
WHERE p.deleted_at IS NULL;
```

要点：子查询各自 `GROUP BY product_id`（满足 ONLY_FULL_GROUP_BY）；时间用半开区间保证走索引；金额与数量都在流水里落库，避免报表期反查单价。

### 4.3 TP6 行锁与事务写法

```php
Db::transaction(function () use ($item) {
    $inv = Db::name('inventory')
        ->where(['product_id' => $item['product_id'],
                 'location_id' => $item['location_id'],
                 'batch_no'    => $item['batch_no']])
        ->lock(true)              // SELECT ... FOR UPDATE
        ->find();

    if (!$inv || bccomp($inv['qty'], $item['qty'], 4) < 0) {
        throw new BizException('STOCK_INSUFFICIENT', '库存不足', [...]);
    }
    $after = bcsub($inv['qty'], $item['qty'], 4);   // 用 bcmath，禁止 float

    Db::name('inventory')->where('id', $inv['id'])->update(['qty' => $after]);
    Db::name('stock_movement')->insert([... 'balance_after' => $after ...]);
});
```

### 4.4 常见坑速查

| 坑 | 表现 | 规避 |
|---|---|---|
| 写了 CHECK 约束 | MySQL 5.7 静默忽略，负库存照样进 | UNSIGNED + 应用层校验 |
| `DATE(occurred_at) = ?` | 索引失效，全表扫描 | 半开区间范围查询 |
| GROUP BY 漏列 | 报错 1055 ONLY_FULL_GROUP_BY | 子查询只按主键分组，外层 JOIN 取名称 |
| PHP float 累加金额 | 对账差几分 | bcmath，DECIMAL 当 string |
| 报表反查当前单价 | 历史月份金额被改价污染 | 流水落库时固化 unit_cost 与 amount |
| 一次让 agent 写完全部 | 代码失控 | 严格分阶段 + 每阶段 commit |

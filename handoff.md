# P10 库存对账+盘点模块 — 任务交接文档

> 交接时间：2026-09-29 18:15 | 项目：MonaWMS_TX | 遵循根目录 AGENTS.md 项目宪法

## 一、任务背景

P10 = 库存对账 + 库存盘点模块，独立菜单归档在「库存管理」下。用户设计原话精髓：

> 盘点单系统自动生成，支持"快照"功能（盘点期间冻结账面数）。执行页分两种：普件只扫 SN 码（盲盘，不显示账面），扫到就勾销，扫不到就是盘亏，多出来的 SN 就是盘盈；散料扫批次/卷号后手动输入实盘米数（明盘，显示账面），系统自动算差异。盘点完必须走【差异审核】，审核通过后自动生成盘盈/盘亏调整单（PD-ADJ- 前缀），同一事务更新 inventory 总账 + SN 台账 + 散料批次台账 + 流水。禁止人工改库。

## 二、当前状态总览

| 阶段 | 状态 | 说明 |
|---|---|---|
| p10-1 勘察 | ✅ 完成 | 复用点已摸清 |
| p10-2 建表 | ✅ 完成 | p10_stocktake.sql 已执行 |
| p10-3 模型+Service | ✅ 完成 | 快照/扫码/录盘/审核全链路 |
| p10-4 Controller+路由+冻结+修 bug+重测 | ✅ 完成 | Phase A/B 全部验证通过 |
| **p10-5 前端 API 封装+盘点列表页** | ⏳ **待做（下一步）** | |
| **p10-6 前端 盘点执行页** | ⏳ 待做 | 盲盘扫 SN + 明盘录余量 |
| **p10-7 前端 差异审核弹窗 + 对账页** | ⏳ 待做 | |
| **p10-8 全链路验证 + 汇报** | ⏳ 待做 | tsc --noEmit + 浏览器实测 |

**当前 DB 干净**：所有 P10 测试数据已清理（products 39-42、测试 SN、批次、check_order 流水、盘点单 1/2/3 全删），误伤的真实 SN（P9TEST-155925-A/B）已恢复 in_stock 并补 history 留痕。reconcile 剩 15 处差异全部是 P9 前存量（product 1-17 历史虚账），留给真实盘点消化。

## 三、后端已完成内容（文件清单）

### 建表 `backend_tp6/database/migrations/p10_stocktake.sql`（已执行）
- `stocktake_orders`：order_number(uk, PD+Ymd+4位)、warehouse_id、type(full/partial/dynamic)、scope_type(all/category/location)+scope_value、status(draft/counting/pending_review/completed/cancelled)、keeper_id、snapshot_at、reviewer_id/reviewed_at/review_notes、adjustment_number、total_snapshot_qty/total_counted_qty/total_diff_qty、item_total/item_counted/item_diff、审计字段
- `stocktake_items`：stocktake_order_id(FK)、product_id、location_id、warehouse_id、is_piece(1普件/0散料)、serial_number(普件SN散料'')、batch_no(散料批次普件'')、snapshot_qty、counted_qty(NULL=未盘)、diff_qty、reason、status(pending/counted)、is_surplus(盘盈新发现行)、counted_by/counted_at

### 模型
- `app/model/StocktakeOrder.php`：STATUS_* 常量（FREEZING_STATUSES=[counting,pending_review]）、generateOrderNumber()（withTrashed+like前缀+order desc+value，禁 count/max）、generateAdjustmentNumber()（'PD-ADJ-'.date('Ymd').'-'.$this->id）、SoftDelete、搜索器 order_number/warehouse_id/status/type
- `app/model/StocktakeItem.php`：STATUS_PENDING/COUNTED、getDiffTypeAttr(surplus/deficit/even)、搜索器含 diff_only
- `app/model/SerialNumber.php`：已加 `const STATUS_LOST='lost'`，statusTransitions 允许 in_stock→lost，lost 为终态

### 服务 `app/service/StocktakeService.php`（~1030 行，核心）
- `getList/getDetail/getItems`：明细综合搜索（SN/批次/商品名/SKU），formatItem 返回 row_type（sn/piece_remainder/batch）
- `create()`：仓库校验 + 同仓不并存进行中盘点单 → buildSnapshot（范围展开：分类含二级、库位按 inventory/SN/batch 三源并集圈商品；**普件=每在库SN一行(snapshot 1)+余数行(总账-SN数)**；**散料=每批次一行+无批次余数行**；分批 insertAll 500/批）→ recalcSummary
- `startCounting()`：draft→counting（开始冻结）
- `scanSn($orderId,$sn,$operatorId,$productId,$locationId)`：命中快照→matched；已盘→duplicate；**台账在库但快照没有→抛 SN_OUT_OF_SCOPE（范围外拒绝）**；完全陌生→需 product_id（SN_UNKNOWN+need_product:true），范围校验后记 is_surplus=1 盘盈行
- `recordCounted($itemId,$countedQty,$operatorId,$reason)`：散料/余数行录实盘，计件须整数
- `submitCounting()`：counting→pending_review；**普件SN行未扫→counted=0盘亏**；**普件余数行(is_piece=1,serial_number='')未录→counted=0（盲盘语义，能消化P9遗留虚账）**；**散料/散料余数行(is_piece=0)未录→counted=snapshot账面一致（明盘语义）**
- `review($id,$operatorId,$notes,$reasons[])`：事务内：①按 product|location|batch 分组，countedTotal vs 总账调整（行锁，缺行盘盈新建，**实盘0有库存行→清零**）+ 流水 TYPE_ADJUST_IN/OUT + REFERENCE_CHECK('check_order')；②SN：未扫快照行→lost、盘盈行→find-or-create（lost→in_stock 恢复）；③批次：批次行 remaining=counted（0→exhausted）、无批次余数行 counted>0 一律补建批次（batch_no='PD-{orderId}-{itemId}'）；④收尾 completed+adjustment_number。返回 {adjustment_number, adjusted_groups, sn_lost, sn_gain, batch_touched}
- `cancel()`：draft/counting/pending_review→cancelled（解冻）
- `static assertNotStocktaking(int $warehouseId)`：冻结断言，status in freezing 拦截，业务码 WAREHOUSE_STOCKTAKING

### Controller + 路由
- `app/controller/StocktakeController.php`：index/read/items/save/start/scan/record/submit/review/cancel；写操作前 `Grant::assert('stocktake:write', $wid)`，review 用 `stocktake:post`（仅 manager）；操作人 `Current::id()`
- `route/app.php` L141-152：stocktakes 路由组 10 条，`->middleware(['warehouse_scope'])`，注意 `:id/items` 必须在 `:id` 之前

### 冻结接入（出入库 4 处已加 `StocktakeService::assertNotStocktaking()`）
- `InboundOrderService::receive()`、`OutboundOrderService::pick()`
- `InventoryController`：adjust / adjustment / transfer（from+to 两仓）
- `config/permission.php`：stocktake:write / stocktake:post 已注册

### 本轮修复的 2 个 bug（重要，勿回退）
1. **review() 整组盘亏清零**：原 `if (bccomp($countedTotal,'0',4)===0){continue;}` 会跳过"实盘0但有库存行"的组（库存不清零但SN已lost→总账明细背离），已删除该 continue（"无库存行+实盘0"由后面 `!$inventory` 分支的 `<=0 continue` 兜住）
2. **submitCounting() 普件余数行语义**：原"未录=账面一致"会让 P9 遗留的无SN虚账永远消不掉，已拆为 is_piece=1 未录→0（盲盘）、is_piece=0 未录→snapshot（明盘）

## 四、Phase B 重测结论（修复后全通过，可作回归基准）

测试场景（库位7，已清理）：普件总账3（SN A/B+余数1）、散料批次100+无批次20。
操作：扫A（matched）、扫陌生C带product_id（surplus盘盈）、批次行录0（整组盘亏）、B不扫、两余数行不录、submit、review。

结果全部符合预期：
- 普件组 counted=2（A+C），总账 3→2；SN：B→lost、C 新建 in_stock → **SN在库2=总账2 对齐**
- 批次组 counted=0，总账 100→**0 清零**（bug#1 修复验证）；批次 remaining 0→exhausted
- 无批次组 counted=20=snapshot 无差异；review 补建批次 PD-3-31(20,active)
- 流水 2 条 adjust_out(1+100) reference check_order/3
- reconcile：测试产品不在差异列表（对平）；15 处差异全为 P9 前存量

## 五、前端待办（p10-5/6/7/8）实施指引

### API 契约（⚠️ 所有 POST 必须 form-urlencoded，$request->post() 不解析 JSON）

BaseURL `/api`，需 `Authorization: Bearer {token}`：

| 方法 | 路径 | 参数 | 说明 |
|---|---|---|---|
| GET | /stocktakes | page,limit,order_number,warehouse_id,status,type | 列表（标准 paginate 结构） |
| POST | /stocktakes | **form**: warehouse_id*, scope_type(all/category/location), scope_value, type, keeper_id, notes | 创建（即生成快照） |
| GET | /stocktakes/:id | — | 详情（含 summary:{total_rows,counted_rows,diff_rows,pending_rows,snapshot_qty,counted_qty,diff_qty}、status_text、warehouse_name、keeper_name） |
| GET | /stocktakes/:id/items | page,limit,search,status,diff_only | 明细 list+summary；item 关键字段：row_type(sn/piece_remainder/batch)、product_name、product_sku、unit、measure_type、location_code、snapshot_qty、counted_qty、diff_qty、is_surplus、reason |
| POST | /stocktakes/:id/start | — | draft→counting（冻结） |
| POST | /stocktakes/:id/scan | **form**: sn*, product_id?, location_id? | 返回 {result: matched/duplicate/surplus, message, item}；SN_UNKNOWN 时 data.need_product=true 要求带 product_id 重扫 |
| POST | /stocktakes/:id/record | **form**: item_id*, counted_qty*, reason? | 录实盘（散料/余数行） |
| POST | /stocktakes/:id/submit | — | →pending_review |
| POST | /stocktakes/:id/review | **form**: notes?, reasons[{item_id}]=原因 | 仅 manager；返回 {adjustment_number, adjusted_groups, sn_lost, sn_gain, batch_touched} |
| POST | /stocktakes/:id/cancel | **form**: reason? | 解冻 |
| GET | /inventory/reconcile | warehouse_id | {checked,diff_count,is_balanced,orphan_sn,diffs:[{product_id,product_name,sku,ledger_type,inventory_qty,detail_qty,diff}]} |

状态机：`draft → counting → pending_review → completed`，任意非 completed 可 `cancelled`。
列表操作按钮：draft[开始盘点/取消] counting[继续盘点/提交/取消] pending_review[差异审核/取消] completed[查看明细]。

### 页面结构（参考现有页面模式）

1. **services/stocktakeService.ts**：参考 `frontend/src/services/scrapService.ts` 的 `import { api } from './api'` 模式。POST 注意 form 序列化（看 services/api.ts 现有封装，login 是 form 先例）
2. **盘点列表页** `frontend/src/pages/StocktakePage.tsx`（参考 ScrapPage.tsx）：筛选（单号/仓库/状态）+ 新建弹窗（仓库必填下拉 + 范围三选一：全仓/按分类/按库位，分类用 Cascader、库位用 Select）+ 状态 Tag + 操作按钮（按状态机）+ 跳执行页/审核
3. **盘点执行页** `/stocktake/:id/execute`（PDA 友好，参考布局）：
   - 普件 Tab：顶部扫码输入框（autoFocus + 回车提交，盲盘**不显示账面**），已扫列表（SN+时间），扫到绿提示/重复黄提示/陌生SN弹选择商品后盘盈
   - 散料 Tab：明盘列表（显示账面 snapshot_qty），行内 InputNumber 录实盘，即时算差异红/绿
   - 底部固定统计条：已盘/未盘/差异数（来自 items 接口 summary）+ 提交按钮（Modal.confirm 提示未盘行将按规则处理）
4. **差异审核弹窗/页**：diff_only=1 拉差异明细 + 原因下拉（录入错误/遗失/损坏/自然损耗/借出未还）→ reasons[item_id] 提交 review，成功展示调整单号结果
5. **对账页** `/reconcile`：调 GET /inventory/reconcile?warehouse_id，表格展示 diffs（商品/SKU/账面/明细/差异），顶部统计 checked/diff_count/is_balanced
6. **路由** `frontend/src/App.tsx`：Routes > ProtectedRoute > MainLayout 下加 stocktake、stocktake/:id/execute、reconcile（看现有 Route 写法）
7. **菜单** `frontend/src/layouts/MainLayout.tsx`：NAV_GROUPS「库存管理」组（现有 /inventory /inbound /outbound /scrap /serial-numbers /wireless-spare-parts）加"库存盘点"和"库存对账"；同步 PAGE_NAME 映射

### 前端约定（AGENTS.md 摘要）
- 数据获取用 @tanstack/react-query（勿手写 useEffect+useState 拉数据）；表单 react-hook-form+zod（简单弹窗可跟随现有页面用 AntD Form）
- 组件 PascalCase；业务请求由 axios 拦截器自动注入 warehouse_id（useWarehouseStore），前端代码不手动拼
- 操作完成后列表原地刷新（invalidateQueries）

### p10-8 验证清单
1. `cd frontend && pnpm tsc --noEmit` 无新增错误
2. 浏览器实测：新建（三范围各一次）→ 开始 → 扫码（matched/duplicate/surplus/SN_OUT_OF_SCOPE）→ 录盘 → 提交 → 审核 → 调整单号展示 → reconcile 页展示
3. 后端在跑：端口 8000（后台 job-095512af4c634659a7ca0a5e98738873，php think run --host 0.0.0.0 --port 8000）；前端 dev 看 package.json（pnpm dev）
4. 验证后清理测试数据（模式见下）

## 六、环境与测试速查

- **DB**：本地 phpstudy MySQL5.7，`mysql --host=127.0.0.1 --user=root --password=root --default-character-set=utf8mb4 monawms`；PowerShell 不支持 `<` 重定向，SQL 写临时文件后 `-e "source C:/Users/.../xx.sql"`（路径用正斜杠）
- **登录**：`curl -X POST http://127.0.0.1:8000/api/auth/login -d "username=admin&password=password"`（必须 form-urlencoded，JSON 报 422）
- **curl 中文会 GBK 乱码**：测试数据全用 ASCII
- **造测试数据模板**（库位 7 是空的）：products 加 T-P10-P(count/tai)/T-P10-B(length/mi) → inventory(普件 3+SN 2 in_stock；散料批次 100+无批次 20) → inventory_batches(B-P10-1,100) → 走 API 全流程 → 验证 inventory/serial_numbers/inventory_batches/inventory_transactions 四表 → 清理（DELETE 测试行 + check_order 流水 + stocktake_items/orders）
- **think-orm 陷阱**：聚合别名用 find() 取属性禁 value()；搜索器用 withSearch 触发；单号生成禁 count()+1/max()

## 七、Git 状态

P9 已提交推送（commit 6f64169）。**P10 后端改动尚未提交**（用户未要求），变更文件：
```
backend_tp6/database/migrations/p10_stocktake.sql（新）
backend_tp6/app/model/StocktakeOrder.php（新）
backend_tp6/app/model/StocktakeItem.php（新）
backend_tp6/app/model/SerialNumber.php（改：+STATUS_LOST）
backend_tp6/app/service/StocktakeService.php（新，~1030行）
backend_tp6/app/service/InboundOrderService.php（改：receive 冻结）
backend_tp6/app/service/OutboundOrderService.php（改：pick 冻结）
backend_tp6/app/controller/StocktakeController.php（新）
backend_tp6/app/controller/InventoryController.php（改：3处冻结）
backend_tp6/route/app.php（改：stocktakes 路由组）
backend_tp6/config/permission.php（改：stocktake 权限项）
```
提交时用 git-safe-commit-push 技能流程（白名单暂存，排除临时文件）。handoff.md 本身不提交。

## 八、下一步行动（新账号从这里开始）

1. 读本文件 + AGENTS.md → 2. 做 p10-5（services/stocktakeService.ts + StocktakePage.tsx 列表页）→ 3. p10-6 执行页 → 4. p10-7 审核弹窗+对账页+路由菜单 → 5. p10-8 验证（tsc + 浏览器全链路，造数模板见第六节）→ 6. 汇报用户、等指示是否提交 git

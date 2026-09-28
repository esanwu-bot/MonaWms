# MonaWMS 后台种子数据

面向「通信设备（移动代维）仓储」演示场景的一批**幂等**种子数据，按后台菜单逐项铺满：
仪表板看板、仓库/库区/货架/库位、主数据、入库、出库、库存、序列号、项目、BOM、报废、无线备件、数据字典、仓库授权、操作日志。

## 执行方式

在 `backend_tp6` 目录下（需已配置 `.env` 的数据库连接）：

```bash
# 执行全部种子（顺序执行 database/seed/*.sql）
php database/seed/run.php

# 仅执行某个文件（按文件名前缀匹配）
php database/seed/run.php 08

# 数据自检（数据量 + 库存对账 + 引用完整性）
php database/seed/check.php
```

所有 SQL 均为**幂等设计**（唯一键 upsert / `NOT EXISTS` 守卫），可重复执行，不会重复灌数据。
每个 SQL 文件在单个事务内执行，失败回滚并打印出错语句。

## 文件清单（菜单 ↔ 数据）

| 文件 | 对应菜单 | 内容 |
|---|---|---|
| `01_master_data.sql` | 产品管理 / 分类管理 | 5 个分类、14 个通信设备 SKU（BBU/RRU/OLT/ONU/光模块/交换机/防火墙/路由器/AP/天线/电源/电池/线缆）、5 家供应商（华为/中兴/烽火/思科/普联）、5 家客户（移动/电信/联通/铁塔/工程部） |
| `02_warehouses_locations.sql` | 仓库管理 | 3 个仓库（主仓/分仓/备件仓）、10 个库区（A 核心网络、B 传输接入、C 无线终端、D 备件耗材、维修区、暂存区…）、13 个货架、42 个库位 |
| `03_users_grants.sql` | 用户管理 / 仓库授权 | 5 个账号（admin、operator、华为代维 vendor_hw、仓库主管 wh_manager、盘点员 inventor）+ **角色 × 仓库二维授权**（全局 operator 在某仓可被授予 manager 以过账/盘点/红冲） |
| `04_projects.sql` | 项目管理 | 4 个工程/代维项目（planning/executing/completed）+ 3 条项目库存预留 |
| `05_bom.sql` | BOM 管理 | 3 套 BOM（5G 宏站、OLT 节点、AP 套件）+ 10 条 BOM 明细 |
| `06_inbound_orders.sql` | 入库管理 | 8 张入库单 + 16 条明细，覆盖 pending / receiving / completed 全状态，含部分到货场景 |
| `07_outbound_orders.sql` | 出库管理 | 8 张出库单 + 10 条明细，覆盖 pending / picking / shipped / completed，含 project_id、tracking_number、优先级 |
| `08_inventory.sql` | 库存查询 | 16 条库存行 + 期初/入库/出库/盘点调平四类流水；**末尾统一重算 balance_quantity 与 quantity，保证「库存 == 流水汇总」** |
| `09_devices_serials.sql` | 设备登记 / 序列号管理 | 18 台设备台账（active/maintenance/inactive/scrapped）+ 22 个序列号 + 11 条流转历史（inbound/install/repair/scrap） |
| `10_wireless_spare_parts.sql` | 无线备件登记表 | 10 条备件登记（5G/4G/3G/2G/other × inbound/outbound/returned） |
| `11_scrap_applications.sql` | 报废管理 | 5 张报废申请，覆盖 pending / approved / rejected / completed 全审批流 |
| `12_dictionary.sql` | 数据字典 | 6 个字典类型 + 43 个字典项（单位、存放区域、优先级、报废原因、项目状态、无线制式） |
| `13_operation_log.sql` | 操作日志 | 8 条审计日志（含操作前后 JSON diff、接口路径、IP） |
| `14_backfill_legacy.sql` | — | 历史遗留数据补填：给缺库位的入库明细补默认库位（仅处理 NULL 行） |

## 演示账号

密码统一为 **`password`**（bcrypt 与系统默认种子哈希一致）。

| 账号 | 全局角色 | 仓库授权 | 说明 |
|---|---|---|---|
| `admin` | admin | WH001/WH002/WH003 · manager | 系统管理员，可过账、盘点、红冲、改主数据 |
| `operator` | operator | WH001 · operator | 录入员，仅录单 |
| `wh_manager` | operator | WH001 · manager | 代维方现场主管，在主仓等同管理员（**不可**做系统级动作） |
| `vendor_hw` | operator | WH002 · operator | 华为代维方账号 |
| `inventor` | operator | WH003 · operator | 盘点员 |

## 自检与口径说明

执行 `php database/seed/check.php` 会校验：

- `inventory.quantity` == 该行流水净汇总（`in/check` 加、`out` 减，`reserve/release/transfer` 不动在库）
- `available_quantity == quantity - reserved_quantity`
- `balance_quantity` 余额链按时间顺序自洽
- 无负库存、无负数量流水、单据引用字段完整

口径注意：`inventory_transactions.quantity` **恒为正数**，增减方向由 `type` 决定，
与 `app/model/Inventory::increaseQuantity/decreaseQuantity` 保持一致。

> 检查项「孤儿流水（库存行已删除）净数量」为系统早期遗留：历史流水指向已被删除的库存行。
> 种子不删除历史数据，仅在自检中提示，如为全新环境该值为 0。

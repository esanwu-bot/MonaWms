# MonaWMS 账号 × 仓库 授权模块

移动代维方多方协作场景下的授权骨架：**每个账号、每个仓库独立授权，默认无权限**。

## 一、文件清单

| 文件 | 作用 |
|---|---|
| `database/migrations/20260928120000_create_user_warehouse_grant.php` | 授权表迁移（phinx） |
| `config/permission.php` | 权限常量：系统级动作 / 仓库级动作 / 状态机 |
| `app/common/BizException.php` | 业务异常（业务码 + HTTP 状态分离） |
| `app/common/Current.php` | 请求级上下文：当前用户、当前仓库、授权态 |
| `app/common/Grant.php` | 授权判定核心：can / assert / grantsOf / flush |
| `app/middleware/WarehouseScope.php` | 中间件：解析 warehouse_id 并校验授权 |
| `app/service/traits/WarehouseScoped.php` | Service trait：断言 + 列表查询收敛 |
| `app/service/GrantService.php` | 授予 / 撤销 / 改角色 / 批量 / 矩阵 / 留痕 |
| `app/controller/Grant.php` | 授权管理接口 |
| `route/grant.php` | 路由定义 |

## 二、安装步骤

```bash
# 1. 复制文件到项目对应目录
cp -r database/migrations/*  <project>/database/migrations/
cp config/permission.php     <project>/config/permission.php
cp -r app/*                  <project>/app/
cat route/grant.php       >> <project>/route/api.php   # 或按实际路由文件合并

# 2. 执行迁移
php think migrate:run

# 3. 确认表结构
mysql> SHOW CREATE TABLE user_warehouse_grant\G
```

前置依赖（需已存在）：
- `users` 表：含 `role ENUM('admin','operator')`、`vendor_id`（代维方归属，可空）、`department_id`、`deleted_at`
- `warehouses` 表：含 `deleted_at`
- `operation_log` 表：`operator_id / action / target_type / target_id / before / after / ip / created_at`
- `app\middleware\Auth`：负责 JWT 解析并调用 `Current::setUser($id, $role, $username)`

若 `users` 表还没有 `vendor_id`：

```sql
ALTER TABLE users ADD COLUMN vendor_id INT UNSIGNED NULL COMMENT '代维方归属' AFTER department_id,
                  ADD INDEX idx_vendor (vendor_id);
```

## 三、核心规则

**有效权限 = 全局角色 ∩ 仓库授权，两者缺一不可**

```
系统级动作（user:manage / grant:manage / warehouse:write / product:write ...）
  → 只看 users.role = admin，与仓库授权无关

仓库级动作（inbound:post / stocktake:post / inventory:adjust / doc:reverse ...）
  → 先查 user_warehouse_grant 有没有该仓库的 active 记录（没有 → 403 WAREHOUSE_NOT_GRANTED）
  → 再看 grant_role 够不够（manager 才行）
```

**grant_role 只能收紧，不能放大**：全局 `operator` 被授予某仓库 `manager` 后，依然做不了 `user:manage`、`grant:manage` 等系统级动作。这由 `system_actions` 只认 admin 保证，不靠配置。

## 四、Service 里怎么用

```php
namespace app\service;

use app\service\traits\WarehouseScoped;

class InboundService
{
    use WarehouseScoped;

    public function create(array $data): int
    {
        $warehouseId = (int) $data['warehouse_id'];

        // 1) 权限：录入员和仓库管理员都可录单
        $this->assertCan('inbound:write', $warehouseId);

        // ... 落库
    }

    public function post(int $orderId): void
    {
        $order = Db::name('inbound_order')->find($orderId);
        $warehouseId = (int) $order['warehouse_id'];

        // 2) 过账：只有仓库 manager 能做（中间件之外再兜一层）
        $this->assertCan('inbound:post', $warehouseId);

        // 3) 状态机：录入员到这里会被拦（doc_status_flow 只允许 confirmed）
        $this->assertStatusFlow('posted');

        // ... 事务 + 行锁 + 流水
    }

    public function list(array $filter): array
    {
        $query = Db::name('inbound_order')->whereNull('deleted_at');

        // 4) 列表自动收敛到已授权仓库，不依赖前端传参
        $this->applyWarehouseScope($query);

        // 5) 录入员只看自己的单据
        $this->applyCreatorScope($query);

        return $query->paginate(...)->toArray();
    }
}
```

## 五、关键实现说明

### 1. 双重校验，不能只靠中间件

`WarehouseScope` 中间件只能拦住"带了 warehouse_id 的请求"。Service 可能被命令行脚本、队列任务、内部入口调用，所以权限判定必须落在离数据最近的地方。两层都要有。

### 2. 列表查询不依赖前端传参

`applyWarehouseScope()` 在没有任何授权时返回 `WHERE warehouse_id = 0`（空结果），在有授权时按 `WHERE IN (已授权集合)` 过滤。前端漏传 warehouse_id 也不会越权。

### 3. 授权缓存与失效

`Grant::grantsOf()` 带 Redis 缓存（默认 300s）。任何授权变更（授予/撤销/改角色/批量）都在事务提交后 `Grant::flush($userId)`。**遗漏 flush 会导致撤销后最长 5 分钟内仍能访问** —— 这是最容易出线上事故的点。

### 4. 撤销留痕

`status = revoked`，不物理删除。`revoked_by / revoked_at / remark` 全部记录，并写 `operation_log`。该账号已创建的草稿单据保留但冻结，由管理员接管。

### 5. 幂等

`grant()` 对已存在记录走 UPDATE（含 revoked → active 重新授权）；`revoke()` 对本来就没授权的调用直接返回，不报错。批量接口可重复执行。

## 六、验收测试清单

```php
// 1. 未授权仓库一律 403
$user = 未授权仓库W的账号;
$this->assert403(fn() => $service->create(['warehouse_id' => $W, ...]));

// 2. 授权后立即可用，撤销后立刻失效
$grantService->grant($user, $W, 'operator');
$this->assertTrue(Grant::can('inbound:write', $W));
$grantService->revoke($user, $W);   // 必须 flush 缓存
$this->assertFalse(Grant::hasWarehouse($user, $W));

// 3. 录入员不能过账
$grantService->grant($user, $W, 'operator');
$this->assertFalse(Grant::can('inbound:post', $W));
$this->assertTrue(Grant::can('inbound:write', $W));

// 4. 仓库 manager 能过账
$grantService->changeRole($user, $W, 'manager');
$this->assertTrue(Grant::can('inbound:post', $W));

// 5. ★ 放大攻击：全局 operator 被授予仓库 manager，仍不能做系统级动作
$this->assertFalse(Grant::can('grant:manage'));
$this->assertFalse(Grant::can('user:manage'));

// 6. 列表收敛：不传 warehouse_id 也看不到未授权仓库数据
$this->assertEmpty($service->list([])['data'] 中的未授权仓库记录);

// 7. 授权变更有日志
$this->assertDatabaseHas('operation_log', ['action' => 'grant:grant', 'target_id' => $user]);
```

## 七、严格模式 vs 宽松模式

`config/permission.php` 里的 `admin_bypass_warehouse`：

- `false`（**默认，推荐**）：系统管理员也必须先被授权才能访问某仓库，最贴合"默认无权限"原则
- `true`：系统管理员天然通行所有仓库，grant_role 视为 manager —— 仓库数量多、管理员需要全局巡视时可打开

## 八、还没做的（按需补）

- `vendor` 代维方主数据表（当前仅用 `users.vendor_id` 字段）
- 授权有效期（`valid_from` / `valid_until`），适合临时代维
- 授权审批流（申请 → 管理员审批 → 生效）
- 前端授权矩阵页与仓库切换器（Vue3 + Element Plus，可用 `el-table` 动态列渲染 matrix 接口返回）

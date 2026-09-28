<?php
declare(strict_types=1);

namespace app\service\traits;

use app\common\BizException;
use app\common\Current;
use app\common\Grant;
use think\db\BaseQuery;

/**
 * 仓库数据作用域 trait
 *
 * 用法：在需要仓库隔离的 Service 里 use WarehouseScoped;
 * 然后每个方法入口调 $this->assertCan('inbound:write', $warehouseId)，
 * 列表查询调 $this->applyWarehouseScope($query)。
 *
 * 为什么 Service 层还要再校验一次：
 * 中间件只能拦住"带了 warehouse_id 的请求"，而 Service 可能被命令行、队列任务、
 * 其他内部入口调用。权限判定必须落在离数据最近的地方，不能只靠中间件。
 */
trait WarehouseScoped
{
    /**
     * 校验：当前账号已授权该仓库
     */
    protected function assertWarehouse(int $warehouseId): void
    {
        if (!Grant::hasWarehouse(Current::id(), $warehouseId)) {
            throw new BizException(
                'WAREHOUSE_NOT_GRANTED',
                '该账号未被授权访问此仓库',
                ['warehouse_id' => $warehouseId],
                403
            );
        }
    }

    /**
     * 校验：当前账号在该仓库可以做某动作
     *
     * @param string $action      见 config/permission.php
     * @param int    $warehouseId
     */
    protected function assertCan(string $action, int $warehouseId): void
    {
        Grant::assert($action, $warehouseId);
    }

    /**
     * 校验：系统级动作（仅全局 admin）
     */
    protected function assertSystem(string $action): void
    {
        if (!Grant::can($action)) {
            throw new BizException('PERMISSION_DENIED', '权限不足', ['action' => $action], 403);
        }
    }

    /**
     * 给列表查询加仓库过滤：收敛到已授权仓库集合
     *
     * 不依赖前端传参 —— 不传 warehouse_id 时自动用全部已授权仓库，
     * 这样即使前端漏传也不会越权看到未授权仓库的数据。
     *
     * @param BaseQuery $query
     * @param string    $field 库存表可能是 location 反查，按需换字段
     */
    protected function applyWarehouseScope(BaseQuery $query, string $field = 'warehouse_id'): BaseQuery
    {
        $ids = Current::grantedWarehouseIds();

        if (empty($ids)) {
            // 无任何授权：返回空结果集，而不是放行全表
            return $query->where($field, '=', 0);
        }

        $current = Current::warehouseIdOrNull();

        // 已切换仓库就按当前仓库查；未切换就按授权集合查
        if (null !== $current && in_array($current, $ids, true)) {
            return $query->where($field, '=', $current);
        }

        return $query->whereIn($field, $ids);
    }

    /**
     * 给"按创建人隔离"的查询加过滤（录入员只看自己的单据）
     */
    protected function applyCreatorScope(BaseQuery $query, string $field = 'created_by'): BaseQuery
    {
        if ('admin' !== Current::role() && 'manager' !== Current::grantRole()) {
            $query->where($field, '=', Current::id());
        }

        return $query;
    }

    /**
     * 单据状态推进校验：录入员只能推到 confirmed，过账必须仓库管理员
     */
    protected function assertStatusFlow(string $targetStatus): void
    {
        $flow = config('permission.doc_status_flow', []);

        $grantRole = Current::grantRole();
        $allowed   = $flow[$grantRole] ?? $flow['operator'] ?? ['draft'];

        if (!in_array($targetStatus, $allowed, true)) {
            throw new BizException(
                'PERMISSION_DENIED',
                '当前角色不可将单据推进到该状态',
                ['target_status' => $targetStatus, 'grant_role' => $grantRole],
                403
            );
        }
    }
}

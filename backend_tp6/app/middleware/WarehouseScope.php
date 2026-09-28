<?php
declare(strict_types=1);

namespace app\middleware;

use app\common\BizException;
use app\common\Current;
use app\common\Grant;
use Closure;
use think\Request;

/**
 * 仓库授权作用域中间件
 *
 * 职责：
 * 1. 解析请求中的 warehouse_id（优先级：路由参数 > 请求体 > 查询串 > 请求头 X-Warehouse-Id）
 * 2. 校验当前账号是否被授权该仓库，未授权直接 403 WAREHOUSE_NOT_GRANTED
 * 3. 把授权态（当前仓库、仓库角色、已授权仓库集合）写入 Current，供 Service 使用
 *
 * 挂在所有需要仓库上下文的业务路由上；必须在 Auth 中间件之后执行。
 */
class WarehouseScope
{
    public function handle(Request $request, Closure $next)
    {
        $userId = Current::id(); // 未登录会抛 401

        // 该账号的全部有效授权
        $grants = Grant::grantsOf($userId);
        Current::setGrants($grants);

        $warehouseId = $this->resolveWarehouseId($request);

        if (null !== $warehouseId) {
            $grantRole = $grants[$warehouseId] ?? null;

            if (null === $grantRole) {
                // 系统管理员豁免开关（默认关闭 = 严格模式，admin 也要先授权）
                $bypass = (bool) config('permission.admin_bypass_warehouse', false);
                if (!(Current::isAdmin() && $bypass)) {
                    throw new BizException(
                        'WAREHOUSE_NOT_GRANTED',
                        '该账号未被授权访问此仓库',
                        ['warehouse_id' => $warehouseId],
                        403
                    );
                }
                $grantRole = 'manager';
            }

            Current::setWarehouse($warehouseId, $grantRole);
        }

        return $next($request);
    }

    /**
     * 从请求各位置解析 warehouse_id
     *
     * 约定：前端顶栏仓库切换器选中后，所有请求统一带 warehouse_id。
     */
    private function resolveWarehouseId(Request $request): ?int
    {
        $raw = $request->param('warehouse_id')
            ?? $request->header('X-Warehouse-Id')
            ?? null;

        if (null === $raw || '' === $raw) {
            return null;
        }

        $id = (int) $raw;

        return $id > 0 ? $id : null;
    }
}

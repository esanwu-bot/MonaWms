<?php
declare(strict_types=1);

namespace app\common;

use think\facade\Cache;
use think\facade\Db;

/**
 * 仓库授权判定核心
 *
 * 权限公式：有效权限 = 全局角色(users.role) ∩ 仓库授权(user_warehouse_grant.grant_role)
 *
 * - 系统级动作（system_actions）只看全局角色，且必须是 admin
 * - 仓库级动作（warehouse_actions）先看有没有该仓库授权，再看 grant_role 够不够
 * - 默认无权限：没有授权记录 = 该仓库对当前账号不存在
 */
class Grant
{
    private const CACHE_KEY_PREFIX = 'wms:grants:';

    /**
     * 取账号的全部有效授权：[warehouse_id => grant_role]
     *
     * 带 Redis 缓存，授权变更时由 GrantService 主动 flush。
     *
     * @return array<int, string>
     */
    public static function grantsOf(int $userId): array
    {
        $ttl  = (int) config('permission.cache_ttl', 300);
        $data = Cache::remember(
            self::CACHE_KEY_PREFIX . $userId,
            function () use ($userId) {
                return Db::name('user_warehouse_grant')
                    ->where('user_id', $userId)
                    ->where('status', 'active')
                    ->whereNull('deleted_at')
                    ->column('grant_role', 'warehouse_id');
            },
            $ttl
        );

        return is_array($data) ? $data : [];
    }

    /** 某账号在某仓库的授权角色，未授权返回 null */
    public static function roleIn(int $userId, int $warehouseId): ?string
    {
        return self::grantsOf($userId)[$warehouseId] ?? null;
    }

    /** 是否已被授权访问该仓库 */
    public static function hasWarehouse(int $userId, int $warehouseId): bool
    {
        return null !== self::roleIn($userId, $warehouseId);
    }

    /**
     * 动作权限判定
     *
     * @param string   $action      见 config/permission.php
     * @param int|null $warehouseId 仓库级动作必传
     */
    public static function can(string $action, ?int $warehouseId = null): bool
    {
        $cfg  = config('permission');
        $role = Current::role();

        // 1) 系统级动作：仅全局 admin，与仓库授权无关
        //    这保证"全局 operator 被授予仓库 manager 后仍不能做用户管理/授权管理"
        if (in_array($action, $cfg['system_actions'], true)) {
            return 'admin' === $role;
        }

        // 2) 仓库级动作必须有仓库上下文
        if (null === $warehouseId) {
            return false;
        }

        $allowedGrantRoles = $cfg['warehouse_actions'][$action] ?? null;
        if (null === $allowedGrantRoles) {
            return false; // 未登记的动作一律拒绝，避免配置漏项变成放行
        }

        // 3) 系统管理员豁免开关（默认关闭 = 严格模式）
        if ('admin' === $role && (bool) ($cfg['admin_bypass_warehouse'] ?? false)) {
            return true;
        }

        $grantRole = self::roleIn(Current::id(), $warehouseId);

        return null !== $grantRole && in_array($grantRole, $allowedGrantRoles, true);
    }

    /**
     * 断言式校验，失败直接抛异常
     *
     * 注意顺序：先判仓库授权，再判动作权限。
     * 这样未授权仓库返回 WAREHOUSE_NOT_GRANTED，已授权但角色不够返回 PERMISSION_DENIED，
     * 前端能给出更准确的提示。
     */
    public static function assert(string $action, ?int $warehouseId = null): void
    {
        $cfg = config('permission');

        if (null !== $warehouseId && !self::hasWarehouse(Current::id(), $warehouseId)) {
            // 系统管理员豁免开关打开时放行
            if (!(Current::isAdmin() && (bool) ($cfg['admin_bypass_warehouse'] ?? false))) {
                throw new BizException(
                    'WAREHOUSE_NOT_GRANTED',
                    '该账号未被授权访问此仓库',
                    ['warehouse_id' => $warehouseId],
                    403
                );
            }
        }

        if (!self::can($action, $warehouseId)) {
            throw new BizException(
                'PERMISSION_DENIED',
                '权限不足',
                ['action' => $action, 'warehouse_id' => $warehouseId],
                403
            );
        }
    }

    /** 清除授权缓存（授权变更后必须调用） */
    public static function flush(int $userId): void
    {
        Cache::delete(self::CACHE_KEY_PREFIX . $userId);
    }

    /** 批量清除（批量授权、批量撤销场景） */
    public static function flushMany(array $userIds): void
    {
        foreach ($userIds as $uid) {
            self::flush((int) $uid);
        }
    }
}

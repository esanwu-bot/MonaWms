<?php
declare(strict_types=1);

namespace app\common;

/**
 * 请求级上下文：当前登录账号 + 仓库授权态
 *
 * 由 app\middleware\Auth 写入身份，app\middleware\WarehouseScope 写入授权态，
 * Service / Controller 只读。
 *
 * FPM 模式每次请求结束自动释放；若跑常驻内存（swoole / workerman），
 * 需在请求结束时调用 self::reset()，避免跨请求污染。
 */
class Current
{
    private static ?int $userId = null;
    private static string $role = 'operator';
    private static ?string $username = null;

    /** 当前操作的仓库（从请求解析，且已通过授权校验） */
    private static ?int $warehouseId = null;

    /** 当前账号在当前仓库的授权角色：manager / operator */
    private static ?string $grantRole = null;

    /** 当前账号全部已授权仓库：[warehouse_id => grant_role] */
    private static array $warehouseIds = [];

    public static function setUser(int $userId, string $role, ?string $username = null): void
    {
        self::$userId   = $userId;
        self::$role     = $role;
        self::$username = $username;
    }

    public static function setWarehouse(?int $warehouseId, ?string $grantRole = null): void
    {
        self::$warehouseId = $warehouseId;
        self::$grantRole   = $grantRole;
    }

    /** @param array<int, string> $grants [warehouse_id => grant_role] */
    public static function setGrants(array $grants): void
    {
        self::$warehouseIds = $grants;
    }

    public static function id(): int
    {
        if (null === self::$userId) {
            throw new BizException('UNAUTHORIZED', '未登录', [], 401);
        }
        return self::$userId;
    }

    public static function idOrNull(): ?int
    {
        return self::$userId;
    }

    public static function role(): string
    {
        return self::$role;
    }

    public static function username(): ?string
    {
        return self::$username;
    }

    public static function isAdmin(): bool
    {
        return 'admin' === self::$role;
    }

    /** 当前仓库ID（未指定时抛错，强制业务代码显式处理仓库上下文） */
    public static function warehouseId(): int
    {
        if (null === self::$warehouseId) {
            throw new BizException('WAREHOUSE_REQUIRED', '缺少仓库上下文', [], 400);
        }
        return self::$warehouseId;
    }

    public static function warehouseIdOrNull(): ?int
    {
        return self::$warehouseId;
    }

    public static function grantRole(): ?string
    {
        return self::$grantRole;
    }

    /**
     * 已授权仓库ID集合
     *
     * @return array<int>
     */
    public static function grantedWarehouseIds(): array
    {
        return array_map('intval', array_keys(self::$warehouseIds));
    }

    /** @return array<int, string> [warehouse_id => grant_role] */
    public static function grants(): array
    {
        return self::$warehouseIds;
    }

    public static function reset(): void
    {
        self::$userId      = null;
        self::$role        = 'operator';
        self::$username    = null;
        self::$warehouseId = null;
        self::$grantRole   = null;
        self::$warehouseIds = [];
    }
}

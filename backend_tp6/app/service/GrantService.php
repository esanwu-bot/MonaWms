<?php
declare(strict_types=1);

namespace app\service;

use app\common\BizException;
use app\common\Current;
use app\common\Grant;
use think\facade\Db;

/**
 * 账号 × 仓库 授权服务
 *
 * 全部方法仅系统管理员可调用（system_actions.grant:manage）。
 * 任何授权变更都必须：事务内完成 + 写 operation_log + 清缓存。
 */
class GrantService
{
    /**
     * 授予 / 重新授予
     *
     * 幂等：已存在记录则更新（含 revoked → active 的重新授权），不存在则插入。
     */
    public function grant(int $userId, int $warehouseId, string $grantRole, string $remark = ''): array
    {
        Grant::assert('grant:manage');
        $this->assertGrantRole($grantRole);
        $this->assertUserExists($userId);
        $this->assertWarehouseExists($warehouseId);

        $operatorId = Current::id();
        $now        = date('Y-m-d H:i:s');
        $before     = $this->findRow($userId, $warehouseId);

        Db::transaction(function () use ($userId, $warehouseId, $grantRole, $remark, $operatorId, $now, $before) {
            $data = [
                'grant_role'  => $grantRole,
                'status'      => 'active',
                'granted_by'  => $operatorId,
                'granted_at'  => $now,
                'revoked_by'  => null,
                'revoked_at'  => null,
                'remark'      => $remark,
                'updated_at'  => $now,
                'deleted_at'  => null,
            ];

            if ($before) {
                // 行锁：防止并发重复授权导致状态错乱
                Db::name('user_warehouse_grant')->where('id', $before['id'])->lock(true)->find();
                Db::name('user_warehouse_grant')->where('id', $before['id'])->update($data);
            } else {
                Db::name('user_warehouse_grant')->insert($data + [
                    'user_id'     => $userId,
                    'warehouse_id' => $warehouseId,
                    'created_at'  => $now,
                ]);
            }

            $this->log('grant', $userId, $warehouseId, $before, $data + [
                'user_id' => $userId, 'warehouse_id' => $warehouseId,
            ]);
        });

        Grant::flush($userId);

        return ['user_id' => $userId, 'warehouse_id' => $warehouseId, 'grant_role' => $grantRole];
    }

    /**
     * 撤销授权：置 revoked 留痕，不物理删除
     *
     * 撤销后该账号已创建的草稿单据保留但冻结（状态机层会拦），由管理员接管。
     */
    public function revoke(int $userId, int $warehouseId, string $remark = ''): void
    {
        Grant::assert('grant:manage');

        $before = $this->findRow($userId, $warehouseId);
        if (!$before || 'active' !== $before['status']) {
            return; // 幂等：本就没授权或已撤销
        }

        $operatorId = Current::id();
        $now        = date('Y-m-d H:i:s');

        Db::transaction(function () use ($before, $operatorId, $now, $remark) {
            Db::name('user_warehouse_grant')
                ->where('id', $before['id'])
                ->lock(true)
                ->find();

            $after = [
                'status'     => 'revoked',
                'revoked_by' => $operatorId,
                'revoked_at' => $now,
                'remark'     => $remark,
                'updated_at' => $now,
            ];
            Db::name('user_warehouse_grant')->where('id', $before['id'])->update($after);

            $this->log('revoke', $before['user_id'], $before['warehouse_id'], $before, $after);
        });

        Grant::flush($userId);
    }

    /** 修改仓库级角色 */
    public function changeRole(int $userId, int $warehouseId, string $grantRole): void
    {
        Grant::assert('grant:manage');
        $this->assertGrantRole($grantRole);

        $before = $this->findRow($userId, $warehouseId);
        if (!$before) {
            throw new BizException('GRANT_NOT_FOUND', '该账号未授权此仓库，请先授予', [], 200);
        }
        if ('active' !== $before['status']) {
            throw new BizException('GRANT_REVOKED', '授权已撤销，请重新授予', [], 200);
        }
        if ($before['grant_role'] === $grantRole) {
            return;
        }

        $operatorId = Current::id();
        $now        = date('Y-m-d H:i:s');

        Db::transaction(function () use ($before, $grantRole, $operatorId, $now) {
            Db::name('user_warehouse_grant')->where('id', $before['id'])->lock(true)->find();

            $after = ['grant_role' => $grantRole, 'updated_at' => $now];
            Db::name('user_warehouse_grant')->where('id', $before['id'])->update($after);

            $this->log('change_role', $before['user_id'], $before['warehouse_id'], $before, $after);
        });

        Grant::flush($userId);
    }

    /**
     * 按代维方批量授权：新增/更换代维方时一次性配多个仓库
     *
     * @param array<int> $warehouseIds
     * @param int|null  $vendorId 代维方ID，为空则按 department 归类
     */
    public function batchGrant(
        array $userIds,
        array $warehouseIds,
        string $grantRole,
        ?int $vendorId = null,
        string $remark = ''
    ): int {
        Grant::assert('grant:manage');
        $this->assertGrantRole($grantRole);

        if (empty($userIds) || empty($warehouseIds)) {
            throw new BizException('PARAM_ERROR', '账号与仓库不能为空', [], 200);
        }

        $operatorId = Current::id();
        $now        = date('Y-m-d H:i:s');
        $count      = 0;

        Db::transaction(function () use ($userIds, $warehouseIds, $grantRole, $operatorId, $now, $remark, &$count) {
            foreach ($userIds as $uid) {
                foreach ($warehouseIds as $wid) {
                    $before = $this->findRow($uid, $wid);
                    $data   = [
                        'grant_role'  => $grantRole,
                        'status'      => 'active',
                        'granted_by'  => $operatorId,
                        'granted_at'  => $now,
                        'revoked_by'  => null,
                        'revoked_at'  => null,
                        'remark'      => $remark,
                        'updated_at'  => $now,
                        'deleted_at'  => null,
                    ];

                    if ($before) {
                        Db::name('user_warehouse_grant')->where('id', $before['id'])->update($data);
                    } else {
                        Db::name('user_warehouse_grant')->insert($data + [
                            'user_id'      => $uid,
                            'warehouse_id' => $wid,
                            'created_at'   => $now,
                        ]);
                    }
                    ++$count;
                }
                $this->log('batch_grant', $uid, 0, null, [
                    'warehouse_ids' => $warehouseIds, 'grant_role' => $grantRole, 'remark' => $remark,
                ]);
            }
        });

        Grant::flushMany($userIds);

        return $count;
    }

    /** 按代维方批量撤销（更换代维方时一次性收回） */
    public function revokeByVendor(int $vendorId, string $remark = ''): int
    {
        Grant::assert('grant:manage');

        $operatorId = Current::id();
        $now        = date('Y-m-d H:i:s');

        $rows = Db::name('user_warehouse_grant')
            ->alias('g')
            ->join('users u', 'u.id = g.user_id')
            ->where('u.vendor_id', $vendorId)
            ->where('g.status', 'active')
            ->field('g.id, g.user_id, g.warehouse_id')
            ->select()
            ->toArray();

        if (empty($rows)) {
            return 0;
        }

        Db::transaction(function () use ($rows, $operatorId, $now, $remark) {
            $ids = array_column($rows, 'id');
            Db::name('user_warehouse_grant')->whereIn('id', $ids)->update([
                'status'     => 'revoked',
                'revoked_by' => $operatorId,
                'revoked_at' => $now,
                'remark'     => $remark,
                'updated_at' => $now,
            ]);

            foreach ($rows as $row) {
                $this->log('revoke_by_vendor', $row['user_id'], $row['warehouse_id'], null, ['status' => 'revoked']);
            }
        });

        Grant::flushMany(array_unique(array_column($rows, 'user_id')));

        return count($rows);
    }

    /** 某仓库的已授权账号列表 */
    public function listByWarehouse(int $warehouseId, bool $onlyActive = true): array
    {
        Grant::assert('grant:manage');

        $query = Db::name('user_warehouse_grant')
            ->alias('g')
            ->join('users u', 'u.id = g.user_id')
            ->where('g.warehouse_id', $warehouseId)
            ->whereNull('g.deleted_at');

        if ($onlyActive) {
            $query->where('g.status', 'active');
        }

        return $query->field([
            'g.id', 'g.user_id', 'g.grant_role', 'g.status', 'g.granted_at', 'g.revoked_at', 'g.remark',
            'u.username', 'u.role AS global_role', 'u.vendor_id',
        ])->select()->toArray();
    }

    /** 某账号被授权的仓库列表 */
    public function listByUser(int $userId, bool $onlyActive = true): array
    {
        // 查自己也算合法需求，但跨账号查询需管理员
        if ($userId !== Current::id()) {
            Grant::assert('grant:manage');
        }

        $query = Db::name('user_warehouse_grant')
            ->alias('g')
            ->join('warehouses w', 'w.id = g.warehouse_id')
            ->where('g.user_id', $userId)
            ->whereNull('g.deleted_at');

        if ($onlyActive) {
            $query->where('g.status', 'active');
        }

        return $query->field([
            'g.id', 'g.warehouse_id', 'g.grant_role', 'g.status', 'g.granted_at',
            'w.code AS warehouse_code', 'w.name AS warehouse_name',
        ])->select()->toArray();
    }

    /**
     * 授权矩阵：行 = 账号，列 = 仓库，交叉点 = grant_role
     * 配代维方时一眼看清谁管哪个仓
     */
    public function matrix(?int $vendorId = null): array
    {
        Grant::assert('grant:manage');

        $warehouses = Db::name('warehouses')
            ->whereNull('deleted_at')
            ->field('id, code, name')
            ->order('id')
            ->select()
            ->toArray();

        $userQuery = Db::name('users')->whereNull('deleted_at');
        if (null !== $vendorId) {
            $userQuery->where('vendor_id', $vendorId);
        }
        $users = $userQuery->field('id, username, role, vendor_id')->order('id')->select()->toArray();

        $grants = Db::name('user_warehouse_grant')
            ->where('status', 'active')
            ->whereNull('deleted_at')
            ->field('user_id, warehouse_id, grant_role')
            ->select()
            ->toArray();

        $map = [];
        foreach ($grants as $g) {
            $map[$g['user_id']][$g['warehouse_id']] = $g['grant_role'];
        }

        $rows = [];
        foreach ($users as $u) {
            $cells = [];
            foreach ($warehouses as $w) {
                $cells[] = [
                    'warehouse_id' => $w['id'],
                    'grant_role'   => $map[$u['id']][$w['id']] ?? null, // null = 未授权
                ];
            }
            $rows[] = [
                'user_id'     => $u['id'],
                'username'    => $u['username'],
                'global_role' => $u['role'],
                'vendor_id'   => $u['vendor_id'],
                'cells'       => $cells,
            ];
        }

        return [
            'warehouses' => $warehouses, // 列定义
            'rows'       => $rows,       // 行数据
        ];
    }

    // ---------- 内部方法 ----------

    private function findRow(int $userId, int $warehouseId): ?array
    {
        $row = Db::name('user_warehouse_grant')
            ->where('user_id', $userId)
            ->where('warehouse_id', $warehouseId)
            ->whereNull('deleted_at')
            ->find();

        if (!$row) {
            return null;
        }

        return is_array($row) ? $row : $row->toArray();
    }

    private function assertGrantRole(string $role): void
    {
        if (!in_array($role, config('permission.grant_roles', []), true)) {
            throw new BizException('PARAM_ERROR', '仓库角色非法', ['grant_role' => $role], 200);
        }
    }

    private function assertUserExists(int $userId): void
    {
        if (!Db::name('users')->where('id', $userId)->whereNull('deleted_at')->count()) {
            throw new BizException('USER_NOT_FOUND', '账号不存在', ['user_id' => $userId], 200);
        }
    }

    private function assertWarehouseExists(int $warehouseId): void
    {
        if (!Db::name('warehouses')->where('id', $warehouseId)->whereNull('deleted_at')->count()) {
            throw new BizException('WAREHOUSE_NOT_FOUND', '仓库不存在', ['warehouse_id' => $warehouseId], 200);
        }
    }

    /**
     * 授权变更留痕
     *
     * operation_log 表只读，任何角色不可改删。
     * before/after 用 JSON 存变更字段 diff。
     */
    private function log(string $action, int $userId, int $warehouseId, ?array $before, ?array $after): void
    {
        Db::name('operation_log')->insert([
            'operator_id' => Current::id(),
            'action'      => 'grant:' . $action,
            'target_type' => 'user_warehouse_grant',
            'target_id'   => $userId,
            'before'      => $before ? json_encode($this->diffFields($before), JSON_UNESCAPED_UNICODE) : null,
            'after'       => $after ? json_encode($this->diffFields($after), JSON_UNESCAPED_UNICODE) : null,
            'ip'          => request()->ip(),
            'created_at'  => date('Y-m-d H:i:s'),
        ]);
    }

    /** 只保留关键字段，避免把整个表行塞进日志 */
    private function diffFields(array $row): array
    {
        return array_intersect_key($row, array_flip([
            'user_id', 'warehouse_id', 'grant_role', 'status',
            'granted_by', 'granted_at', 'revoked_by', 'revoked_at', 'remark',
        ]));
    }
}

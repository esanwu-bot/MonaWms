<?php
declare(strict_types=1);

use think\migration\Migrator;
use think\migration\db\Column;

/**
 * 账号 × 仓库 授权表（移动代维方多方协作的核心）
 *
 * 设计原则：默认无权限。只有存在 status=active 的授权记录，账号才能访问该仓库。
 * 有效权限 = 全局角色(users.role) ∩ 仓库授权(本表 grant_role)，两者缺一不可。
 *
 * MySQL 5.7 适配说明：
 * - 无 CHECK 约束能力，业务约束靠 ENUM + 应用层校验
 * - 撤销授权用 status=revoked 留痕，不物理删除（审计要求）
 * - 唯一键 (user_id, warehouse_id) 保证一个账号在一个仓库只有一条授权记录
 */
class CreateUserWarehouseGrant extends Migrator
{
    public function up(): void
    {
        $table = $this->table('user_warehouse_grant', [
            'engine'    => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'comment'   => '账号-仓库授权表',
        ]);

        $table
            ->addColumn('user_id', 'integer', [
                'signed'  => false,
                'null'    => false,
                'comment' => '被授权账号ID',
            ])
            ->addColumn('warehouse_id', 'integer', [
                'signed'  => false,
                'null'    => false,
                'comment' => '授权仓库ID',
            ])
            ->addColumn('grant_role', 'enum', [
                'values'  => ['manager', 'operator'],
                'default' => 'operator',
                'null'    => false,
                'comment' => '仓库级角色：manager=可审核过账，operator=仅录入',
            ])
            ->addColumn('status', 'enum', [
                'values'  => ['active', 'revoked'],
                'default' => 'active',
                'null'    => false,
                'comment' => 'active 生效 / revoked 已撤销（留痕不删）',
            ])
            ->addColumn('granted_by', 'integer', [
                'signed'  => false,
                'null'    => true,
                'comment' => '授权人（系统管理员）',
            ])
            ->addColumn('granted_at', 'datetime', [
                'null'    => true,
                'comment' => '授权时间',
            ])
            ->addColumn('revoked_by', 'integer', [
                'signed'  => false,
                'null'    => true,
                'comment' => '撤销人',
            ])
            ->addColumn('revoked_at', 'datetime', [
                'null'    => true,
                'comment' => '撤销时间',
            ])
            ->addColumn('remark', 'string', [
                'limit'   => 255,
                'null'    => true,
                'comment' => '备注（如代维方名称、授权事由）',
            ])
            ->addColumn('created_at', 'timestamp', [
                'default' => 'CURRENT_TIMESTAMP',
                'comment' => '创建时间',
            ])
            ->addColumn('updated_at', 'timestamp', [
                'default' => 'CURRENT_TIMESTAMP',
                'update'  => 'CURRENT_TIMESTAMP',
                'comment' => '更新时间',
            ])
            ->addColumn('deleted_at', 'datetime', [
                'null'    => true,
                'comment' => '软删除（正常不用，授权变更走 status）',
            ])
            // 一个账号在一个仓库只能有一条授权记录，重复授权走 UPDATE 而非 INSERT
            ->addIndex(['user_id', 'warehouse_id'], [
                'unique' => true,
                'name'   => 'uk_user_warehouse',
            ])
            // 按仓库查已授权账号列表的高频查询
            ->addIndex(['warehouse_id'], ['name' => 'idx_warehouse'])
            ->addIndex(['status'], ['name' => 'idx_status']);

        // 外键：业务数据一律 RESTRICT，禁止级联删除
        // 若 users / warehouses 表尚未建立，可临时注释掉下面两行，待主表建好后单独补
        $table
            ->addForeignKey('user_id', 'users', 'id', [
                'delete' => 'RESTRICT',
                'update' => 'CASCADE',
                'constraint' => 'fk_uwg_user',
            ])
            ->addForeignKey('warehouse_id', 'warehouses', 'id', [
                'delete' => 'RESTRICT',
                'update' => 'CASCADE',
                'constraint' => 'fk_uwg_warehouse',
            ]);

        $table->create();
    }

    public function down(): void
    {
        if ($this->hasTable('user_warehouse_grant')) {
            $this->table('user_warehouse_grant')->drop()->save();
        }
    }
}

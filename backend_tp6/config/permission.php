<?php
declare(strict_types=1);

/**
 * 权限常量配置
 *
 * 权限模型：有效权限 = 全局角色(users.role) ∩ 仓库授权(user_warehouse_grant.grant_role)
 *
 * - system_actions  系统级动作：仅全局 admin 可做，不受仓库授权约束
 *                   （用户管理、授权管理、仓库 CRUD、商品主数据全局写、全局报表）
 * - warehouse_actions 仓库级动作：必须先有该仓库的授权，再看 grant_role 是否够格
 * - read_actions   只读动作：任何已登录且已授权该仓库的账号都可做
 *
 * 关键约束：仓库级 grant_role 只能收紧或等同全局角色，不能放大。
 * 全局 operator 即使在某仓库被授予 manager，也做不了 system_actions（由代码保证，不靠配置）。
 */
return [
    // 全局角色（users.role ENUM）
    'roles' => ['admin', 'operator'],

    // 仓库级授权角色（user_warehouse_grant.grant_role ENUM）
    'grant_roles' => ['manager', 'operator'],

    // 系统管理员是否豁免仓库授权校验（可访问所有仓库）
    // false = 严格模式：admin 也必须先被授权才能访问某仓库（推荐，符合"默认无权限"原则）
    // true  = 宽松模式：系统管理员天然通行所有仓库，grant_role 视为 manager
    'admin_bypass_warehouse' => false,

    // 系统级动作：仅 users.role = admin
    'system_actions' => [
        'user:manage',      // 用户管理、角色分配
        'grant:manage',     // 授权管理（授予/撤销/改角色/批量授权）
        'warehouse:write',  // 仓库本身 CRUD
        'zone:write',       // 库区 CRUD
        'location:write',   // 库位 CRUD
        'product:write',    // 商品主数据写（无仓库上下文）
        'category:write',   // 分类写
        'supplier:write',   // 供应商写
        'customer:write',   // 客户写
        'report:global',    // 跨仓库全局报表
    ],

    // 仓库级动作 => 允许的 grant_role 列表
    'warehouse_actions' => [
        // 录入类：仓库管理员与录入员都可做
        'inbound:write'      => ['manager', 'operator'],
        'outbound:write'     => ['manager', 'operator'],
        'stocktake:write'    => ['manager', 'operator'], // 创建盘点单、录入实盘数
        'inventory:read'     => ['manager', 'operator'],
        'report:export'      => ['manager', 'operator'],

        // 审核类：只有仓库管理员（grant_role=manager）能做
        'inbound:post'       => ['manager'],   // 过账入库，库存真正增加
        'outbound:post'      => ['manager'],   // 过账出库，库存真正减少
        'stocktake:post'     => ['manager'],   // 盘点过账，生成 adjust 流水调平
        'inventory:adjust'   => ['manager'],   // 库存调整
        'inventory:transfer' => ['manager'],   // 移库
        'doc:reverse'        => ['manager'],   // 红冲已过账单据

        // 仓库内主数据维护（挂在该仓库下的库位、分类等）
        'location:write_scoped' => ['manager'],
    ],

    // 只读动作：已授权该仓库即可
    'read_actions' => [
        'inventory:read',
        'report:export',
    ],

    // 单据状态机允许的角色推进
    'doc_status_flow' => [
        'operator' => ['draft', 'confirmed'],          // 录入员只能推到 confirmed
        'manager'  => ['draft', 'confirmed', 'posted'],// 仓库管理员可过账
    ],

    // 缓存
    'cache_ttl' => 300, // 授权缓存秒数，授权变更时主动清除
];

<?php
declare(strict_types=1);

use think\facade\Route;

/**
 * 授权管理路由（仅系统管理员）
 * 需挂在 Auth + WarehouseScope 之后的中间件组里
 */
Route::group('grants', function () {
    Route::get('matrix', 'Grant/matrix');
    Route::get('warehouse/:id', 'Grant/byWarehouse');
    Route::get('user/:id', 'Grant/byUser');

    Route::post('grant', 'Grant/grant');
    Route::post('revoke', 'Grant/revoke');
    Route::post('change-role', 'Grant/changeRole');
    Route::post('batch', 'Grant/batch');
    Route::post('revoke-vendor', 'Grant/revokeVendor');
})->middleware([
    \app\middleware\Auth::class,
]);

/**
 * 需要仓库隔离的业务路由示例
 *
 * 关键：业务路由必须挂 WarehouseScope，
 * 它会在进入 Controller 前完成"该账号是否被授权此仓库"的校验。
 */
Route::group('inbound', function () {
    Route::get('/', 'Inbound/index');           // 列表：Service 内用 applyWarehouseScope 收敛
    Route::post('/', 'Inbound/create');          // 录入：需 warehouse_id + inbound:write
    Route::post(':id/post', 'Inbound/post');     // 过账：需 warehouse_id + inbound:post（仅仓库 manager）
})->middleware([
    \app\middleware\Auth::class,
    \app\middleware\WarehouseScope::class,
]);

Route::group('outbound', function () {
    Route::get('/', 'Outbound/index');
    Route::post('/', 'Outbound/create');
    Route::post(':id/post', 'Outbound/post');
})->middleware([
    \app\middleware\Auth::class,
    \app\middleware\WarehouseScope::class,
]);

Route::group('inventory', function () {
    Route::get('/', 'Inventory/index');          // 库存查询，按已授权仓库集合过滤
    Route::post('adjust', 'Inventory/adjust');   // 仅仓库 manager
    Route::post('transfer', 'Inventory/transfer');
})->middleware([
    \app\middleware\Auth::class,
    \app\middleware\WarehouseScope::class,
]);

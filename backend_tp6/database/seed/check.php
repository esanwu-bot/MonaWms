<?php
/**
 * 种子数据自检：数据量概览 + 库存对账 + 授权与引用完整性
 *
 * 用法（在 backend_tp6 目录）：
 *   php database/seed/check.php
 */
require_once __DIR__ . '/../../vendor/autoload.php';

use think\facade\Db;

$app = new \think\App();
$app->initialize();

function line(string $label, $value): void
{
    echo str_pad($label, 46, '.') . ' ' . var_export($value, true) . "\n";
}

function countOf(string $table, string $where = '1=1'): int
{
    return (int) Db::table($table)->whereRaw($where)->count();
}

echo "=== MonaWMS 种子数据自检 ===\n\n";

echo "[1] 数据量概览\n";
$tables = [
    'categories', 'products', 'suppliers', 'customers', 'warehouses', 'zones', 'shelves', 'locations',
    'users', 'user_warehouse_grant', 'projects', 'project_inventory_reservations', 'bom_headers', 'bom_items',
    'inbound_orders', 'inbound_order_items', 'outbound_orders', 'outbound_order_items',
    'inventory', 'inventory_transactions', 'devices', 'serial_numbers', 'serial_number_history',
    'wireless_spare_parts', 'scrap_applications', 'dictionary_types', 'dictionary_items', 'operation_log',
];
foreach ($tables as $table) {
    line($table, countOf($table));
}

/** 净变动量：in/check 为加，out 为减，reserve/release/transfer 不动在库 */
const SIGNED_EXPR = "
    CASE
      WHEN t.`type` = 'out' THEN -t.`quantity`
      WHEN t.`type` IN ('reserve','release','transfer') THEN 0
      ELSE t.`quantity`
    END";

echo "\n[2] 库存对账（inventory == 流水汇总）\n";
$mismatch = Db::query(
    'SELECT COUNT(*) c FROM inventory i
     WHERE i.quantity <> IFNULL((SELECT SUM(' . SIGNED_EXPR . ')
        FROM inventory_transactions t WHERE t.inventory_id = i.id), 0)'
)[0]['c'];
line('inventory 与流水不一致行数（应为 0）', (int) $mismatch);

$balanceMismatch = Db::query(
    'SELECT COUNT(*) c FROM inventory_transactions t2
     WHERE t2.balance_quantity <> IFNULL((SELECT SUM(' . str_replace('t.', 't3.', SIGNED_EXPR) . ')
        FROM inventory_transactions t3
        WHERE t3.inventory_id = t2.inventory_id
          AND (t3.created_at < t2.created_at OR (t3.created_at = t2.created_at AND t3.id <= t2.id))), 0)'
)[0]['c'];
line('balance_quantity 余额链不一致行数（应为 0）', (int) $balanceMismatch);

$negativeQty = Db::query('SELECT COUNT(*) c FROM inventory_transactions WHERE quantity <= 0')[0]['c'];
line('流水数量为负或为 0 的行数（应为 0）', (int) $negativeQty);

$availMismatch = Db::query(
    'SELECT COUNT(*) c FROM inventory WHERE available_quantity <> quantity - reserved_quantity'
)[0]['c'];
line('available_quantity 计算不一致行数（应为 0）', (int) $availMismatch);

$negative = Db::query('SELECT COUNT(*) c FROM inventory WHERE quantity < 0 OR available_quantity < 0')[0]['c'];
line('负库存行数（应为 0）', (int) $negative);

$orphan = Db::query(
    'SELECT IFNULL(SUM(t.quantity),0) q FROM inventory_transactions t
     LEFT JOIN inventory i ON i.id = t.inventory_id WHERE i.id IS NULL'
)[0]['q'];
line('孤儿流水（库存行已删除）净数量', (float) $orphan);

echo "\n[3] 单据与引用完整性\n";
line('入库单缺 supplier_id 数', countOf('inbound_orders', 'supplier_id IS NULL'));
line('出库单缺 customer_id 数', countOf('outbound_orders', 'customer_id IS NULL'));
line('入库明细缺 location_id 数', countOf('inbound_order_items', 'location_id IS NULL'));
line('出库明细缺 location_id 数', countOf('outbound_order_items', 'location_id IS NULL'));
line('商品缺分类数（应为 0）', countOf('products', 'category_id IS NULL'));

echo "\n[4] 仓库授权\n";
$rows = Db::query(
    "SELECT u.username, w.code wh, g.grant_role, g.status
     FROM user_warehouse_grant g
     JOIN users u ON u.id = g.user_id
     JOIN warehouses w ON w.id = g.warehouse_id
     ORDER BY u.username, w.code"
);
foreach ($rows as $r) {
    echo sprintf("    %-12s %-6s %-8s %s\n", $r['username'], $r['wh'], $r['grant_role'], $r['status']);
}

echo "\n[5] 库存 TOP10（按可用量）\n";
$top = Db::query(
    "SELECT p.sku, p.name, SUM(i.available_quantity) avail, SUM(i.quantity) qty
     FROM inventory i JOIN products p ON p.id = i.product_id
     GROUP BY p.sku, p.name ORDER BY avail DESC LIMIT 10"
);
foreach ($top as $r) {
    echo sprintf("    %-18s %-24s 可用 %8s / 在库 %8s\n", $r['sku'], mb_substr($r['name'], 0, 12), $r['avail'], $r['qty']);
}

echo "\n自检完成\n";

<?php
// 查实际表结构（临时脚本）
$pdo = new PDO('mysql:host=127.0.0.1;port=3306;dbname=monawms;charset=utf8mb4', 'root', 'root');
foreach (['serial_numbers', 'inventory', 'inventory_transactions', 'inbound_order_items', 'outbound_order_items'] as $t) {
    echo "===== {$t} =====\n";
    foreach ($pdo->query("SHOW COLUMNS FROM `{$t}`") as $c) {
        echo str_pad($c['Field'], 24) . str_pad($c['Type'], 20) . ($c['Null'] === 'NO' ? 'NOT NULL ' : '') . ($c['Default'] !== null ? "DEFAULT '{$c['Default']}'" : '') . "\n";
    }
}
echo "===== inventory batch 口径分布 =====\n";
foreach ($pdo->query("SELECT batch_number IS NULL AS is_null, COUNT(*) c FROM inventory GROUP BY 1") as $r) {
    echo ($r['is_null'] ? 'NULL' : '非NULL') . ": {$r['c']}\n";
}
echo "===== 预留残留 =====\n";
foreach ($pdo->query("SELECT id, product_id, location_id, batch_number, quantity, reserved_quantity FROM inventory WHERE reserved_quantity > 0") as $r) {
    echo json_encode($r, JSON_UNESCAPED_UNICODE) . "\n";
}

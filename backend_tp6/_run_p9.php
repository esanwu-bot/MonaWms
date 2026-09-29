<?php
// 执行 P9 迁移（临时脚本）：整段 exec 支持多语句
$pdo = new PDO('mysql:host=127.0.0.1;port=3306;dbname=monawms;charset=utf8mb4', 'root', 'root', [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$sql = file_get_contents(__DIR__ . '/database/migrations/p9_stock_sync.sql');
// PREPARE/EXECUTE 需要单条执行，按分号拆分（本文件无存储过程，安全）
$pdo->exec($sql);
echo "p9_stock_sync.sql 执行完成\n";
foreach ($pdo->query("SHOW COLUMNS FROM serial_numbers LIKE '%_id'") as $r) { echo "serial_numbers.{$r['Field']}\n"; }
foreach ($pdo->query("SHOW TABLES LIKE 'inventory_batches'") as $r) { echo "表存在: {$r[0]}\n"; }

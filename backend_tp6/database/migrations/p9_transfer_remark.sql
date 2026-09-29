-- P9+：调拨说明（无设备编号的设备调拨时，必须注明从哪里调拨到哪里、经手人姓名、电话）
-- 幂等：重复执行不会报错（先查 information_schema 再决定是否 ALTER）
SET @sql1 := IF((SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inbound_orders' AND COLUMN_NAME = 'transfer_from') = 0,
  'ALTER TABLE `inbound_orders` ADD COLUMN `transfer_from` VARCHAR(120) NULL COMMENT ''调出仓库/地点（从哪里调拨）'' AFTER `source`',
  'SELECT 1');
PREPARE s1 FROM @sql1; EXECUTE s1; DEALLOCATE PREPARE s1;

SET @sql2 := IF((SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inbound_orders' AND COLUMN_NAME = 'transfer_remark') = 0,
  'ALTER TABLE `inbound_orders` ADD COLUMN `transfer_remark` VARCHAR(500) NULL COMMENT ''调拨说明（无设备编号调拨须注明从哪到哪、依据）'' AFTER `transfer_from`',
  'SELECT 1');
PREPARE s2 FROM @sql2; EXECUTE s2; DEALLOCATE PREPARE s2;

SET @sql3 := IF((SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inbound_orders' AND COLUMN_NAME = 'handler_name') = 0,
  'ALTER TABLE `inbound_orders` ADD COLUMN `handler_name` VARCHAR(50) NULL COMMENT ''经手人姓名'' AFTER `transfer_remark`',
  'SELECT 1');
PREPARE s3 FROM @sql3; EXECUTE s3; DEALLOCATE PREPARE s3;

SET @sql4 := IF((SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inbound_orders' AND COLUMN_NAME = 'handler_phone') = 0,
  'ALTER TABLE `inbound_orders` ADD COLUMN `handler_phone` VARCHAR(30) NULL COMMENT ''经手人电话'' AFTER `handler_name`',
  'SELECT 1');
PREPARE s4 FROM @sql4; EXECUTE s4; DEALLOCATE PREPARE s4;

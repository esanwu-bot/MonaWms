-- P9+：库存调整/转移增加备注（remark）落库
-- 幂等：重复执行不会报错
SET @sql1 := IF((SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inventory_transactions' AND COLUMN_NAME = 'remark') = 0,
  'ALTER TABLE `inventory_transactions` ADD COLUMN `remark` VARCHAR(500) NULL COMMENT ''备注（调整/转移说明）'' AFTER `reason`',
  'SELECT 1');
PREPARE s1 FROM @sql1; EXECUTE s1; DEALLOCATE PREPARE s1;

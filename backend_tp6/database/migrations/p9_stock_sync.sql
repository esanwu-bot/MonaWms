-- ============================================================
-- P9 普件/散料库存同步：总账(inventory) 与明细账(SN台账/批次台账) 分离
-- 1) serial_numbers 补仓库/库位归属（出库校验"本仓在库"）
-- 2) 新建 inventory_batches 散料批次台账（初始/剩余数量，FIFO 扣减依据）
-- 3) batch_number 口径统一（NULL → ''，MySQL 唯一索引中 NULL 可重复）
-- 幂等：可重复执行
-- ============================================================
SET NAMES utf8mb4;

-- ---------- 1. SN 台账补仓库/库位归属 ----------
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'serial_numbers' AND COLUMN_NAME = 'warehouse_id');
SET @sql := IF(@col = 0,
  'ALTER TABLE `serial_numbers` ADD COLUMN `warehouse_id` INT(11) NULL COMMENT ''所属仓库ID'' AFTER `product_id`, ADD COLUMN `location_id` INT(11) NULL COMMENT ''当前库位ID'' AFTER `warehouse_id`, ADD KEY `idx_warehouse_status` (`warehouse_id`, `status`)',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- ---------- 2. 散料批次台账（线材/耗材按卷/批管理） ----------
CREATE TABLE IF NOT EXISTS `inventory_batches` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `product_id` INT(11) NOT NULL COMMENT '商品ID',
  `warehouse_id` INT(11) NOT NULL COMMENT '仓库ID',
  `location_id` INT(11) NOT NULL COMMENT '库位ID',
  `batch_no` VARCHAR(50) NOT NULL DEFAULT '' COMMENT '批次号/卷号',
  `initial_quantity` DECIMAL(18,4) UNSIGNED NOT NULL DEFAULT '0.0000' COMMENT '初始数量',
  `remaining_quantity` DECIMAL(18,4) UNSIGNED NOT NULL DEFAULT '0.0000' COMMENT '剩余数量',
  `unit` VARCHAR(20) NOT NULL DEFAULT '' COMMENT '单位快照',
  `status` VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT 'active在用/exhausted已用完',
  `inbound_item_id` INT(11) NULL COMMENT '入库明细ID',
  `inbound_order_id` INT(11) NULL COMMENT '入库单ID',
  `inbound_at` DATETIME NULL COMMENT '入库时间（FIFO 排序依据）',
  `notes` VARCHAR(255) DEFAULT '',
  `created_at` DATETIME NULL,
  `updated_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_product_wh_batch` (`product_id`, `warehouse_id`, `batch_no`),
  KEY `idx_fifo` (`product_id`, `warehouse_id`, `status`, `inbound_at`),
  KEY `idx_inbound_order` (`inbound_order_id`),
  CONSTRAINT `fk_ib_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='散料批次台账（余量扣减）';

-- ---------- 3. batch_number 口径统一：NULL → '' ----------
UPDATE `inventory` SET `batch_number` = '' WHERE `batch_number` IS NULL;
UPDATE `inbound_order_items` SET `batch_number` = '' WHERE `batch_number` IS NULL;
UPDATE `outbound_order_items` SET `batch_number` = '' WHERE `batch_number` IS NULL;

-- ---------- 4. 出库明细记录批次扣减轨迹（取消回滚按此精确回退批次余量） ----------
SET @col2 := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'outbound_order_items' AND COLUMN_NAME = 'picked_batches');
SET @sql2 := IF(@col2 = 0,
  'ALTER TABLE `outbound_order_items` ADD COLUMN `picked_batches` TEXT NULL COMMENT ''P9: 批次扣减轨迹 JSON [{batch_id,batch_no,location_id,quantity}]''',
  'SELECT 1');
PREPARE s2 FROM @sql2; EXECUTE s2; DEALLOCATE PREPARE s2;

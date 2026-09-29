-- ============================================================
-- P10 库存盘点模块：盘点单主表 + 快照明细表
-- 1) stocktake_orders  盘点单（PD 前缀单号、范围、状态机、审核留痕）
-- 2) stocktake_items   账面快照明细（普件每 SN 一行 / 散料每批次一行，含实盘与差异）
-- 3) serial_numbers.status 新增 lost（盘亏/遗失）口径（varchar，无 DDL 需求，仅约定）
-- 幂等：可重复执行
-- 状态机：draft草稿 → counting盘点中 → pending_review待审核 → completed已完成
--         （draft/counting/pending_review 均可 cancel；counting+pending_review 冻结出入库）
-- ============================================================
SET NAMES utf8mb4;

-- ---------- 1. 盘点单主表 ----------
CREATE TABLE IF NOT EXISTS `stocktake_orders` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `order_number` VARCHAR(32) NOT NULL COMMENT '盘点单号（PD+Ymd+4位序号）',
  `warehouse_id` INT(11) NOT NULL COMMENT '仓库ID',
  `type` VARCHAR(20) NOT NULL DEFAULT 'full' COMMENT 'full全盘/partial抽盘/dynamic动碰盘点',
  `scope_type` VARCHAR(20) NOT NULL DEFAULT 'all' COMMENT 'all全仓/category按分类/location按库区库位',
  `scope_value` VARCHAR(255) NOT NULL DEFAULT '' COMMENT '范围值：分类ID/库位ID，逗号分隔',
  `status` VARCHAR(20) NOT NULL DEFAULT 'draft' COMMENT 'draft/counting/pending_review/completed/cancelled',
  `keeper_id` INT(11) NULL COMMENT '盘点负责人',
  `snapshot_at` DATETIME NULL COMMENT '快照时间（账面冻结时点）',
  `submitted_at` DATETIME NULL COMMENT '提交盘点时间',
  `reviewer_id` INT(11) NULL COMMENT '审核人',
  `reviewed_at` DATETIME NULL COMMENT '审核时间',
  `review_notes` VARCHAR(500) NOT NULL DEFAULT '' COMMENT '审核备注',
  `adjustment_number` VARCHAR(40) NOT NULL DEFAULT '' COMMENT '审核生成的调整单号（PD-ADJ-Ymd-序号）',
  `total_snapshot_qty` DECIMAL(18,4) UNSIGNED NOT NULL DEFAULT '0.0000' COMMENT '账面总数',
  `total_counted_qty` DECIMAL(18,4) NOT NULL DEFAULT '0.0000' COMMENT '已盘总数',
  `total_diff_qty` DECIMAL(18,4) NOT NULL DEFAULT '0.0000' COMMENT '差异总数（正盘盈负盘亏）',
  `item_total` INT(11) NOT NULL DEFAULT 0 COMMENT '快照行数',
  `item_counted` INT(11) NOT NULL DEFAULT 0 COMMENT '已盘行数',
  `item_diff` INT(11) NOT NULL DEFAULT 0 COMMENT '差异行数',
  `notes` VARCHAR(500) NOT NULL DEFAULT '' COMMENT '备注',
  `created_by` INT(11) NULL,
  `updated_by` INT(11) NULL,
  `created_at` DATETIME NULL,
  `updated_at` DATETIME NULL,
  `deleted_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_order_number` (`order_number`),
  KEY `idx_warehouse_status` (`warehouse_id`, `status`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='库存盘点单';

-- ---------- 2. 快照明细表 ----------
CREATE TABLE IF NOT EXISTS `stocktake_items` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `stocktake_order_id` INT(11) NOT NULL COMMENT '盘点单ID',
  `product_id` INT(11) NOT NULL COMMENT '商品ID',
  `location_id` INT(11) NULL COMMENT '库位ID',
  `warehouse_id` INT(11) NOT NULL COMMENT '仓库ID（冗余，便于按仓过滤）',
  `is_piece` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1普件(SN)/0散料(批次)',
  `serial_number` VARCHAR(100) NOT NULL DEFAULT '' COMMENT '普件SN（散料为空串）',
  `batch_no` VARCHAR(50) NOT NULL DEFAULT '' COMMENT '散料批次/卷号（普件为空串）',
  `snapshot_qty` DECIMAL(18,4) UNSIGNED NOT NULL DEFAULT '0.0000' COMMENT '账面数量（普件每行1）',
  `counted_qty` DECIMAL(18,4) NULL COMMENT '实盘数量（NULL=未盘）',
  `diff_qty` DECIMAL(18,4) NOT NULL DEFAULT '0.0000' COMMENT '差异（正盘盈/负盘亏）',
  `reason` VARCHAR(50) NOT NULL DEFAULT '' COMMENT '差异原因（录入错误/遗失/损坏/自然损耗/借出未还）',
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT 'pending未盘/counted已盘',
  `is_surplus` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1盘盈新发现的行（快照中不存在，扫陌生SN生成）',
  `counted_by` INT(11) NULL COMMENT '录盘人',
  `counted_at` DATETIME NULL COMMENT '录盘时间',
  `created_at` DATETIME NULL,
  `updated_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  KEY `idx_order` (`stocktake_order_id`, `status`),
  KEY `idx_order_sn` (`stocktake_order_id`, `serial_number`),
  KEY `idx_order_batch` (`stocktake_order_id`, `batch_no`),
  KEY `idx_product` (`product_id`),
  CONSTRAINT `fk_si_order` FOREIGN KEY (`stocktake_order_id`) REFERENCES `stocktake_orders` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='盘点快照明细（普件每SN一行/散料每批次一行）';

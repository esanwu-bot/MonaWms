-- ==========================================================
-- P8 物资/设备体系改造（对齐 待办清单.md）
-- 覆盖：A 计量单位与数量精度 / B 状态 / C 出入库时间与归档
--       D 领用信息 / E SN 策略底座 / F 类型体系 / G 收敛 devices
--       I 入库来源
-- 幂等：可重复执行；不修改任何历史 migration 文件
-- 执行：mysql -u root -p monawms < p8_material_upgrade.sql
-- ==========================================================

-- ---------- 0. 幂等 DDL 辅助过程（需 mysql 客户端执行，依赖 DELIMITER） ----------
DROP PROCEDURE IF EXISTS mw_add_col;
DROP PROCEDURE IF EXISTS mw_mod_col;
DROP PROCEDURE IF EXISTS mw_add_idx;

DELIMITER $$
CREATE PROCEDURE mw_add_col(IN p_table VARCHAR(64), IN p_col VARCHAR(64), IN p_ddl TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = p_table AND column_name = p_col
  ) THEN
    SET @mw_sql = CONCAT('ALTER TABLE `', p_table, '` ADD COLUMN ', p_ddl);
    PREPARE mw_st FROM @mw_sql; EXECUTE mw_st; DEALLOCATE PREPARE mw_st;
  END IF;
END$$
CREATE PROCEDURE mw_mod_col(IN p_table VARCHAR(64), IN p_col VARCHAR(64), IN p_ddl TEXT)
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = p_table AND column_name = p_col
  ) THEN
    SET @mw_sql = CONCAT('ALTER TABLE `', p_table, '` MODIFY COLUMN ', p_ddl);
    PREPARE mw_st FROM @mw_sql; EXECUTE mw_st; DEALLOCATE PREPARE mw_st;
  END IF;
END$$
CREATE PROCEDURE mw_add_idx(IN p_table VARCHAR(64), IN p_idx VARCHAR(64), IN p_ddl TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.statistics
    WHERE table_schema = DATABASE() AND table_name = p_table AND index_name = p_idx
  ) THEN
    SET @mw_sql = CONCAT('ALTER TABLE `', p_table, '` ADD INDEX ', p_ddl);
    PREPARE mw_st FROM @mw_sql; EXECUTE mw_st; DEALLOCATE PREPARE mw_st;
  END IF;
END$$
DELIMITER ;

-- ---------- A1 计量方式 ----------
CALL mw_add_col('products', 'measure_type',
  "`measure_type` VARCHAR(20) NOT NULL DEFAULT 'count' COMMENT '计量方式 count计件/length长度/weight重量/area面积/volume体积' AFTER `unit`");

-- ---------- A3 数量与金额精度 DECIMAL(18,4) ----------
-- 库存
CALL mw_mod_col('inventory', 'quantity',          "`quantity` DECIMAL(18,4) UNSIGNED NOT NULL DEFAULT 0 COMMENT '库存数量'");
CALL mw_mod_col('inventory', 'reserved_quantity', "`reserved_quantity` DECIMAL(18,4) UNSIGNED NOT NULL DEFAULT 0 COMMENT '预留数量'");
CALL mw_mod_col('inventory', 'available_quantity',"`available_quantity` DECIMAL(18,4) NOT NULL DEFAULT 0 COMMENT '可用数量'");
-- 库存流水（变动量可正可负，不加 UNSIGNED）
CALL mw_mod_col('inventory_transactions', 'quantity',         "`quantity` DECIMAL(18,4) NOT NULL DEFAULT 0 COMMENT '变动数量(正入负出)'");
CALL mw_mod_col('inventory_transactions', 'balance_quantity', "`balance_quantity` DECIMAL(18,4) NOT NULL DEFAULT 0 COMMENT '变动后结存'");
-- 入库明细
CALL mw_mod_col('inbound_order_items', 'quantity',          "`quantity` DECIMAL(18,4) UNSIGNED NOT NULL DEFAULT 0 COMMENT '入库数量'");
CALL mw_mod_col('inbound_order_items', 'received_quantity', "`received_quantity` DECIMAL(18,4) UNSIGNED NOT NULL DEFAULT 0 COMMENT '实收数量'");
CALL mw_mod_col('inbound_order_items', 'unit_price',        "`unit_price` DECIMAL(18,4) UNSIGNED NOT NULL DEFAULT 0 COMMENT '单价'");
-- 出库明细
CALL mw_mod_col('outbound_order_items', 'quantity',        "`quantity` DECIMAL(18,4) UNSIGNED NOT NULL DEFAULT 0 COMMENT '出库数量'");
CALL mw_mod_col('outbound_order_items', 'picked_quantity', "`picked_quantity` DECIMAL(18,4) UNSIGNED NOT NULL DEFAULT 0 COMMENT '已拣数量'");
CALL mw_mod_col('outbound_order_items', 'unit_price',      "`unit_price` DECIMAL(18,4) UNSIGNED NOT NULL DEFAULT 0 COMMENT '单价'");
-- 商品主数据金额
CALL mw_mod_col('products', 'price',      "`price` DECIMAL(18,4) UNSIGNED NOT NULL DEFAULT 0 COMMENT '售价'");
CALL mw_mod_col('products', 'cost_price', "`cost_price` DECIMAL(18,4) UNSIGNED NOT NULL DEFAULT 0 COMMENT '成本价'");

-- ---------- A6 明细单位快照 ----------
CALL mw_add_col('inbound_order_items', 'unit',
  "`unit` VARCHAR(20) NULL COMMENT '单位快照(过账时固化，避免主数据变更导致历史语义漂移)' AFTER `product_id`");
CALL mw_add_col('outbound_order_items', 'unit',
  "`unit` VARCHAR(20) NULL COMMENT '单位快照' AFTER `product_id`");

-- ---------- C1 / C2 出入库业务时间（精确到时分秒） ----------
CALL mw_add_col('inbound_orders', 'received_at', "`received_at` DATETIME NULL COMMENT '入库时间(业务发生时间)' AFTER `received_date`");
CALL mw_add_col('outbound_orders', 'shipped_at', "`shipped_at` DATETIME NULL COMMENT '出库时间(业务发生时间)' AFTER `shipped_date`");

-- 业务时间回填：已有 date 的老数据补 00:00:00，保证报表口径统一
UPDATE `inbound_orders`  SET `received_at` = `received_date` WHERE `received_at` IS NULL AND `received_date` IS NOT NULL;
UPDATE `outbound_orders` SET `shipped_at`  = `shipped_date`  WHERE `shipped_at`  IS NULL AND `shipped_date`  IS NOT NULL;

-- ---------- D2 领用信息 ----------
CALL mw_add_col('outbound_orders', 'receiver_unit',
  "`receiver_unit` VARCHAR(100) NULL COMMENT '领用单位' AFTER `customer_id`");
CALL mw_add_col('outbound_orders', 'receiver_name',
  "`receiver_name` VARCHAR(50) NULL COMMENT '领用人' AFTER `receiver_unit`");
CALL mw_add_col('outbound_orders', 'receiver_phone',
  "`receiver_phone` VARCHAR(20) NULL COMMENT '领用人手机号' AFTER `receiver_name`");
CALL mw_add_idx('outbound_orders', 'idx_receiver_unit', 'idx_receiver_unit (`receiver_unit`)');

-- ---------- I2 入库来源 ----------
CALL mw_add_col('inbound_orders', 'source',
  "`source` VARCHAR(30) NOT NULL DEFAULT 'purchase' COMMENT '入库来源(字典 inbound_source)' AFTER `supplier_id`");
CALL mw_add_idx('inbound_orders', 'idx_source', 'idx_source (`source`)');

-- ---------- E1 SN 策略底座 ----------
CALL mw_add_idx('serial_numbers', 'idx_status', 'idx_status (`status`)');
CALL mw_add_col('products', 'requires_serial',
  "`requires_serial` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否需要序列号(由 measure_type 推导：计件=1，长度/重量/面积/体积=0)' AFTER `measure_type`");
UPDATE `products` SET `requires_serial` = 0 WHERE `measure_type` <> 'count';

-- ---------- G1 devices 收敛（只留 products + serial_numbers） ----------
CALL mw_add_col('devices', 'product_id',  "`product_id` INT(11) NULL COMMENT '迁移后归属物资' AFTER `serial_number`");
CALL mw_add_col('devices', 'migrated_at', "`migrated_at` DATETIME NULL COMMENT '迁移时间' AFTER `product_id`");
CALL mw_add_idx('devices', 'idx_migrated_at', 'idx_migrated_at (`migrated_at`)');

-- 1) 设备 -> 物资主数据（同名同型号复用，否则按设备编码新建 SKU）
INSERT INTO `products` (`sku`, `name`, `device_type`, `model_number`, `unit`, `measure_type`, `requires_serial`, `status`, `created_at`, `updated_at`)
SELECT
  CONCAT('DEV-', d.`device_code`),
  d.`device_name`,
  d.`device_type`,
  d.`model`,
  '台',
  'count',
  1,
  'active',
  NOW(), NOW()
FROM `devices` d
WHERE d.`migrated_at` IS NULL
  AND d.`deleted_at` IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM `products` p
    WHERE p.`name` = d.`device_name`
      AND IFNULL(p.`model_number`, '') = IFNULL(d.`model`, '')
  );

-- 2) 回写 product_id（优先按 型号+名称 精确匹配，其次按迁移生成的 SKU）
UPDATE `devices` d
LEFT JOIN `products` p1
  ON p1.`name` = d.`device_name`
 AND IFNULL(p1.`model_number`, '') = IFNULL(d.`model`, '')
LEFT JOIN `products` p2
  ON p2.`sku` = CONCAT('DEV-', d.`device_code`)
SET d.`product_id` = COALESCE(p1.`id`, p2.`id`)
WHERE d.`migrated_at` IS NULL AND d.`deleted_at` IS NULL;

-- 3) 设备 -> 序列号单件（状态挂单件，B2 口径）
INSERT INTO `serial_numbers` (`serial_number`, `product_id`, `manufacture_date`, `warranty_end_date`, `status`, `location`, `notes`, `created_at`, `updated_at`)
SELECT
  IFNULL(NULLIF(d.`serial_number`, ''), d.`device_code`),
  d.`product_id`,
  d.`purchase_date`,
  d.`warranty_end_date`,
  CASE d.`status`
    WHEN 'active'      THEN 'in_use'
    WHEN 'maintenance' THEN 'repairing'
    WHEN 'scrapped'    THEN 'scrapped'
    ELSE 'in_stock'
  END,
  d.`location`,
  CONCAT('由设备档案迁移 device_id=', d.`id`, ' device_code=', d.`device_code`, IFNULL(CONCAT(' brand=', d.`brand`), '')),
  NOW(), NOW()
FROM `devices` d
WHERE d.`migrated_at` IS NULL
  AND d.`deleted_at` IS NULL
  AND d.`product_id` IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM `serial_numbers` s WHERE s.`serial_number` = IFNULL(NULLIF(d.`serial_number`, ''), d.`device_code`));

UPDATE `devices` SET `migrated_at` = NOW() WHERE `migrated_at` IS NULL AND `product_id` IS NOT NULL;

-- ---------- 字典：类型（幂等插入） ----------
INSERT INTO `dictionary_types` (`code`, `name`, `description`, `status`) VALUES
('inbound_source', '入库来源', '入库单来源字典', 'active'),
('measure_type',   '计量方式', '物资计量方式字典', 'active')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `status` = 'active';

-- ---------- 字典：计量单位（补全件/个/米/吨/kg/平方米/卷/盘/对/箱，规范 code） ----------
INSERT INTO `dictionary_items` (`type_id`, `code`, `name`, `sort_order`, `status`) VALUES
((SELECT id FROM dictionary_types WHERE code='unit'), 'pcs',      '件', 1,  'active'),
((SELECT id FROM dictionary_types WHERE code='unit'), 'ge',       '个', 2,  'active'),
((SELECT id FROM dictionary_types WHERE code='unit'), 'tai',      '台', 3,  'active'),
((SELECT id FROM dictionary_types WHERE code='unit'), 'set',      '套', 4,  'active'),
((SELECT id FROM dictionary_types WHERE code='unit'), 'meter',    '米', 5,  'active'),
((SELECT id FROM dictionary_types WHERE code='unit'), 'ton',      '吨', 6,  'active'),
((SELECT id FROM dictionary_types WHERE code='unit'), 'kg',       '千克', 7, 'active'),
((SELECT id FROM dictionary_types WHERE code='unit'), 'sqm',      '平方米', 8, 'active'),
((SELECT id FROM dictionary_types WHERE code='unit'), 'roll',     '卷', 9,  'active'),
((SELECT id FROM dictionary_types WHERE code='unit'), 'coil',     '盘', 10, 'active'),
((SELECT id FROM dictionary_types WHERE code='unit'), 'pair',     '对', 11, 'active'),
((SELECT id FROM dictionary_types WHERE code='unit'), 'box',      '箱', 12, 'active'),
((SELECT id FROM dictionary_types WHERE code='unit'), 'zhi',      '只', 13, 'active'),
((SELECT id FROM dictionary_types WHERE code='unit'), 'group',    '组', 14, 'active'),
((SELECT id FROM dictionary_types WHERE code='unit'), 'strip',    '条', 15, 'active'),
((SELECT id FROM dictionary_types WHERE code='unit'), 'gen',      '根', 16, 'active'),
((SELECT id FROM dictionary_types WHERE code='unit'), 'fu',       '副', 17, 'active')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `sort_order` = VALUES(`sort_order`), `status` = 'active';

-- 旧的无语义 code（pcs2~pcs6）停用，保留历史引用
UPDATE `dictionary_items`
SET `status` = 'inactive'
WHERE `type_id` = (SELECT id FROM dictionary_types WHERE code='unit')
  AND `code` IN ('pcs2','pcs3','pcs4','pcs5','pcs6');

-- ---------- 字典：计量方式 ----------
INSERT INTO `dictionary_items` (`type_id`, `code`, `name`, `sort_order`, `status`) VALUES
((SELECT id FROM dictionary_types WHERE code='measure_type'), 'count',  '计件', 1, 'active'),
((SELECT id FROM dictionary_types WHERE code='measure_type'), 'length', '长度', 2, 'active'),
((SELECT id FROM dictionary_types WHERE code='measure_type'), 'weight', '重量', 3, 'active'),
((SELECT id FROM dictionary_types WHERE code='measure_type'), 'area',   '面积', 4, 'active'),
((SELECT id FROM dictionary_types WHERE code='measure_type'), 'volume', '体积', 5, 'active')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `status` = 'active';

-- ---------- 字典：入库来源 ----------
INSERT INTO `dictionary_items` (`type_id`, `code`, `name`, `sort_order`, `status`) VALUES
((SELECT id FROM dictionary_types WHERE code='inbound_source'), 'purchase',        '采购入库', 1, 'active'),
((SELECT id FROM dictionary_types WHERE code='inbound_source'), 'transfer_in',     '调拨入库', 2, 'active'),
((SELECT id FROM dictionary_types WHERE code='inbound_source'), 'return_in',       '归还入库', 3, 'active'),
((SELECT id FROM dictionary_types WHERE code='inbound_source'), 'project_return',  '项目退回', 4, 'active'),
((SELECT id FROM dictionary_types WHERE code='inbound_source'), 'borrow_return',   '借用归还', 5, 'active'),
((SELECT id FROM dictionary_types WHERE code='inbound_source'), 'inventory_gain',  '盘盈', 6, 'active'),
((SELECT id FROM dictionary_types WHERE code='inbound_source'), 'other',           '其他', 7, 'active')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `status` = 'active';

-- ---------- 字典：设备/单件状态对齐客户口径 ----------
INSERT INTO `dictionary_items` (`type_id`, `code`, `name`, `sort_order`, `status`) VALUES
((SELECT id FROM dictionary_types WHERE code='device_status'), 'in_use',    '正在用', 1, 'active'),
((SELECT id FROM dictionary_types WHERE code='device_status'), 'repairing', '返修中', 2, 'active'),
((SELECT id FROM dictionary_types WHERE code='device_status'), 'to_scrap',  '待报废', 3, 'active'),
((SELECT id FROM dictionary_types WHERE code='device_status'), 'scrapped',  '已报废', 4, 'active')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `sort_order` = VALUES(`sort_order`), `status` = 'active';

-- 收尾：移除辅助过程
DROP PROCEDURE IF EXISTS mw_add_col;
DROP PROCEDURE IF EXISTS mw_mod_col;
DROP PROCEDURE IF EXISTS mw_add_idx;

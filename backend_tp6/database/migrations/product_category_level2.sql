-- ============================================================
-- 修正迁移：产品分类精确关联到二级分类（F1 数据关联）
-- 背景：products 历史数据挂在一级分类（或为空），分类体系升级为一/二级后，
--       产品应精确挂二级（列表展示完整路径"一级 / 二级"）。
-- 幂等：按 sku 定位 + category code 反查，可重复执行。
-- ============================================================

-- seed 内 13 条 + 测试数据，统一按语义挂二级分类
UPDATE `products` SET `category_id` = (SELECT id FROM `categories` WHERE `code`='COMM-BS') WHERE `sku` IN ('SKU-5G-BBU','SKU-RRU-3971');
UPDATE `products` SET `category_id` = (SELECT id FROM `categories` WHERE `code`='OPT-OLT')  WHERE `sku` = 'SKU-OLT-MA5683T';
UPDATE `products` SET `category_id` = (SELECT id FROM `categories` WHERE `code`='OPT-ONU')  WHERE `sku` IN ('SKU-ONU-HG8245H','DEV-DEV-SCR-001');
UPDATE `products` SET `category_id` = (SELECT id FROM `categories` WHERE `code`='OPT-MOD')  WHERE `sku` IN ('SKU-OPT-SFP28','SKU-OPT-SFP','DEV-DEV-004');
UPDATE `products` SET `category_id` = (SELECT id FROM `categories` WHERE `code`='NET-SW')   WHERE `sku` IN ('SKU-SW-S5720','DEV-DEV-002');
UPDATE `products` SET `category_id` = (SELECT id FROM `categories` WHERE `code`='NET-FW')   WHERE `sku` = 'SKU-FW-USG6525E';
UPDATE `products` SET `category_id` = (SELECT id FROM `categories` WHERE `code`='NET-RTR')  WHERE `sku` IN ('SKU-RTR-NE40E','SKU-RTR-AR','DEV-DEV-003');
UPDATE `products` SET `category_id` = (SELECT id FROM `categories` WHERE `code`='WIRE-AP')  WHERE `sku` = 'SKU-AP-AE5760';
UPDATE `products` SET `category_id` = (SELECT id FROM `categories` WHERE `code`='WIRE-ANT') WHERE `sku` = 'SKU-ANT-700M';
UPDATE `products` SET `category_id` = (SELECT id FROM `categories` WHERE `code`='COMM-BS')   WHERE `sku` IN ('SKU-5G-AAU','DEV-DEV-001','DEV-DEV-005');
UPDATE `products` SET `category_id` = (SELECT id FROM `categories` WHERE `code`='ACC-PWR')  WHERE `sku` = 'SKU-PWR-EPU4840';
UPDATE `products` SET `category_id` = (SELECT id FROM `categories` WHERE `code`='ACC-BAT')  WHERE `sku` = 'SKU-BAT-LI48';
UPDATE `products` SET `category_id` = (SELECT id FROM `categories` WHERE `code`='ACC-CBL')  WHERE `sku` IN ('SKU-CBL-LC','SKU-CBL-PWR');

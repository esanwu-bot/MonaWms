-- ============================================================
-- 05 BOM 种子：bom_headers + bom_items（后台 BOM 管理使用）
-- ============================================================
SET NAMES utf8mb4;

-- ---------- BOM 头 ----------
INSERT INTO `bom_headers` (`bom_code`,`product_id`,`version`,`description`,`status`,`created_at`,`updated_at`) VALUES
('BOM-5G-MACRO',(SELECT id FROM `products` WHERE `sku`='SKU-5G-BBU'),'1.0','5G宏站标准配置（BBU+RRU+天线+电源）','active',NOW(),NOW()),
('BOM-OLT-NODE',(SELECT id FROM `products` WHERE `sku`='SKU-OLT-MA5683T'),'1.0','OLT局端节点标准配置','active',NOW(),NOW()),
('BOM-WLAN-AP',(SELECT id FROM `products` WHERE `sku`='SKU-AP-AE5760'),'1.0','室内AP安装套件','active',NOW(),NOW())
ON DUPLICATE KEY UPDATE `product_id`=VALUES(`product_id`), `version`=VALUES(`version`), `description`=VALUES(`description`), `status`=VALUES(`status`), `updated_at`=NOW();

-- ---------- BOM 明细 ----------
INSERT INTO `bom_items` (`bom_header_id`,`product_id`,`quantity`,`unit`,`notes`,`created_at`,`updated_at`)
SELECT h.id, p.id, x.qty, p.unit, x.note, NOW(), NOW()
FROM `bom_headers` h
JOIN (
  SELECT 'BOM-5G-MACRO' bc,'SKU-RRU-3971' sku,3 qty,'每站3个扇区 RRU' note
  UNION ALL SELECT 'BOM-5G-MACRO','SKU-ANT-700M',6,'每扇区2副天线'
  UNION ALL SELECT 'BOM-5G-MACRO','SKU-PWR-EPU4840',2,'整流模块冗余'
  UNION ALL SELECT 'BOM-5G-MACRO','SKU-CBL-PWR',20,'RRU直流供电线'
  UNION ALL SELECT 'BOM-5G-MACRO','SKU-CBL-LC',6,'BBU-RRU 光纤互联'
  UNION ALL SELECT 'BOM-OLT-NODE','SKU-OPT-SFP28',8,'上联+用户板光模块'
  UNION ALL SELECT 'BOM-OLT-NODE','SKU-CBL-LC',16,'ODF 跳线'
  UNION ALL SELECT 'BOM-OLT-NODE','SKU-PWR-EPU4840',2,'双路供电'
  UNION ALL SELECT 'BOM-WLAN-AP','SKU-CBL-LC',2,'AP上联光纤'
  UNION ALL SELECT 'BOM-WLAN-AP','SKU-CBL-PWR',1,'POE/本地供电线'
) x ON x.bc = h.`bom_code`
JOIN `products` p ON p.`sku` = x.sku
WHERE NOT EXISTS (
  SELECT 1 FROM `bom_items` bi WHERE bi.`bom_header_id` = h.id AND bi.`product_id` = p.id
);

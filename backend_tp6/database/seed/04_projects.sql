-- ============================================================
-- 04 项目种子：工程/代维项目 + 库存预留
-- ============================================================
SET NAMES utf8mb4;

INSERT INTO `projects`
  (`project_code`,`project_name`,`description`,`manager`,`manager_id`,`contact_phone`,`contact_email`,`address`,
   `status`,`budget`,`start_date`,`end_date`,`customer_id`,`created_at`,`updated_at`)
VALUES
('PRJ-2026-5G-001','XX市移动5G三期宏站建设','城区及周边乡镇宏站新建与扩容','刘洋',1,'13900000001','cmcc@example.com','XX市城区','executing',8600000.00,'2026-01-05','2026-12-31',
  (SELECT id FROM `customers` WHERE `code`='CUS-CMCC'),NOW(),NOW()),
('PRJ-2026-BRG-002','农村宽带千兆光网改造','OLT/ONU 端到端替换升级','孙磊',1,'13900000002','ctc@example.com','XX市乡镇','executing',4200000.00,'2026-03-01','2026-10-31',
  (SELECT id FROM `customers` WHERE `code`='CUS-CTC'),NOW(),NOW()),
('PRJ-2026-TWR-003','铁塔机房电源改造','开关电源与备电电池更换','吴迪',1,'13900000004','tower@example.com','XX市铁塔站点','planning',1500000.00,'2026-09-01','2027-03-31',
  (SELECT id FROM `customers` WHERE `code`='CUS-TOWER'),NOW(),NOW()),
('PRJ-2025-WLAN-004','园区WLAN覆盖项目','WiFi6 AP 覆盖一期','郑凯',1,'13900000005','eng@example.com','XX高新区','completed',980000.00,'2025-05-01','2025-12-31',
  (SELECT id FROM `customers` WHERE `code`='CUS-ENG'),NOW(),NOW())
ON DUPLICATE KEY UPDATE
  `project_name`=VALUES(`project_name`), `description`=VALUES(`description`), `manager`=VALUES(`manager`),
  `status`=VALUES(`status`), `budget`=VALUES(`budget`), `start_date`=VALUES(`start_date`),
  `end_date`=VALUES(`end_date`), `customer_id`=VALUES(`customer_id`), `updated_at`=NOW();

-- ---------- 项目库存预留 ----------
INSERT IGNORE INTO `project_inventory_reservations`
  (`project_id`,`product_id`,`quantity`,`status`,`notes`,`created_at`,`updated_at`)
SELECT
  (SELECT id FROM `projects` WHERE `project_code`='PRJ-2026-5G-001'),
  (SELECT id FROM `products` WHERE `sku`='SKU-RRU-3971'),
  40,'active','5G三期首批次保障用量',NOW(),NOW()
FROM DUAL
WHERE EXISTS (SELECT 1 FROM `projects` WHERE `project_code`='PRJ-2026-5G-001')
  AND EXISTS (SELECT 1 FROM `products` WHERE `sku`='SKU-RRU-3971')
  AND NOT EXISTS (
    SELECT 1 FROM `project_inventory_reservations` r
    WHERE r.`project_id` = (SELECT id FROM `projects` WHERE `project_code`='PRJ-2026-5G-001')
      AND r.`product_id` = (SELECT id FROM `products` WHERE `sku`='SKU-RRU-3971')
  );

INSERT IGNORE INTO `project_inventory_reservations`
  (`project_id`,`product_id`,`quantity`,`status`,`notes`,`created_at`,`updated_at`)
SELECT
  (SELECT id FROM `projects` WHERE `project_code`='PRJ-2026-BRG-002'),
  (SELECT id FROM `products` WHERE `sku`='SKU-ONU-HG8245H'),
  1500,'active','农村宽带首月施工用料',NOW(),NOW()
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `project_inventory_reservations` r
  WHERE r.`project_id` = (SELECT id FROM `projects` WHERE `project_code`='PRJ-2026-BRG-002')
    AND r.`product_id` = (SELECT id FROM `products` WHERE `sku`='SKU-ONU-HG8245H')
);

INSERT IGNORE INTO `project_inventory_reservations`
  (`project_id`,`product_id`,`quantity`,`status`,`notes`,`created_at`,`updated_at`)
SELECT
  (SELECT id FROM `projects` WHERE `project_code`='PRJ-2026-TWR-003'),
  (SELECT id FROM `products` WHERE `sku`='SKU-BAT-LI48'),
  60,'active','电源改造备电批次',NOW(),NOW()
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `project_inventory_reservations` r
  WHERE r.`project_id` = (SELECT id FROM `projects` WHERE `project_code`='PRJ-2026-TWR-003')
    AND r.`product_id` = (SELECT id FROM `products` WHERE `sku`='SKU-BAT-LI48')
);

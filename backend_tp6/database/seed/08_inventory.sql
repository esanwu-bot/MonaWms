-- ============================================================
-- 08 库存种子：inventory 快照 + inventory_transactions 流水
--
-- 约定（与 app/model/Inventory 一致）：
--   quantity 永远为正数，方向由 type 决定
--     in / check      → 增加
--     out             → 扣减
--     reserve/release → 不动在库数量，只动占用
--   存量 = Σ(type='in'|'check') − Σ(type='out')
--   available_quantity = quantity − reserved_quantity
--
-- 铁律：inventory.quantity == 该行流水汇总（balance_quantity 末值）
-- ============================================================
SET NAMES utf8mb4;

-- ---------- 1. 建库存行（幂等） ----------
INSERT INTO `inventory`
  (`product_id`,`location_id`,`warehouse_id`,`quantity`,`reserved_quantity`,`available_quantity`,`batch_number`,`created_at`,`updated_at`)
SELECT p.id, l.id, l.warehouse_id, 0, 0, 0, x.batch, NOW(), NOW()
FROM (
  SELECT 'SKU-5G-BBU' sku,'S-A-01-01' loc,'B20260103' batch
  UNION ALL SELECT 'SKU-RRU-3971','S-C-01-01','B20260103'
  UNION ALL SELECT 'SKU-OLT-MA5683T','S-B-01-01','B20260110'
  UNION ALL SELECT 'SKU-ONU-HG8245H','S-B-01-02','B20260110'
  UNION ALL SELECT 'SKU-OPT-SFP28','S-B-02-01','B20260201'
  UNION ALL SELECT 'SKU-FW-USG6525E','S-A-01-02','B20260318'
  UNION ALL SELECT 'SKU-RTR-NE40E','S-A-02-01','B20260318'
  UNION ALL SELECT 'SKU-ANT-700M','S-E-01-01','B20260401'
  UNION ALL SELECT 'SKU-RRU-3971','S-E-01-02','B20260401'
  UNION ALL SELECT 'SKU-AP-AE5760','S-C-01-02','B20251120'
  UNION ALL SELECT 'SKU-CBL-LC','S-D-01-01','B20251015'
  UNION ALL SELECT 'SKU-CBL-PWR','S-D-01-02','B20251015'
  UNION ALL SELECT 'SKU-PWR-EPU4840','S-D-02-01','B20251101'
  UNION ALL SELECT 'SKU-BAT-LI48','S-D-02-02','B20251101'
  UNION ALL SELECT 'SKU-SW-S5720','S-A-02-02','B20251101'
  UNION ALL SELECT 'SKU-OPT-SFP28','S-D-02-03','B20251101'
) x
JOIN `products` p ON p.`sku` = x.sku
JOIN `locations` l ON l.`code` = x.loc
WHERE NOT EXISTS (
  SELECT 1 FROM `inventory` i
  WHERE i.`product_id` = p.id AND i.`location_id` = l.id AND i.`batch_number` = x.batch
);

-- ---------- 2. 期初建账流水（check） ----------
INSERT INTO `inventory_transactions`
  (`product_id`,`location_id`,`inventory_id`,`type`,`quantity`,`balance_quantity`,`operator_id`,`reason`,
   `reference_type`,`reference_id`,`created_at`)
SELECT p.id, l.id, i.id, 'check', x.qty, x.qty, (SELECT id FROM `users` WHERE `username`='admin'), '期初建账盘点',
       'opening', 0, x.created_at
FROM (
  SELECT 'SKU-AP-AE5760' sku,'S-C-01-02' loc,'B20251120' batch,260 qty,'2025-11-20 10:00:00' created_at
  UNION ALL SELECT 'SKU-CBL-LC','S-D-01-01','B20251015',3200,'2025-10-15 10:00:00'
  UNION ALL SELECT 'SKU-CBL-PWR','S-D-01-02','B20251015',900,'2025-10-15 10:00:00'
  UNION ALL SELECT 'SKU-PWR-EPU4840','S-D-02-01','B20251101',60,'2025-11-01 10:00:00'
  UNION ALL SELECT 'SKU-BAT-LI48','S-D-02-02','B20251101',40,'2025-11-01 10:00:00'
  UNION ALL SELECT 'SKU-SW-S5720','S-A-02-02','B20251101',24,'2025-11-01 10:00:00'
  UNION ALL SELECT 'SKU-OPT-SFP28','S-D-02-03','B20251101',150,'2025-11-01 10:00:00'
) x
JOIN `products` p ON p.`sku` = x.sku
JOIN `locations` l ON l.`code` = x.loc
JOIN `inventory` i ON i.`product_id` = p.id AND i.`location_id` = l.id AND i.`batch_number` = x.batch
WHERE NOT EXISTS (
  SELECT 1 FROM `inventory_transactions` t
  WHERE t.`inventory_id` = i.id AND t.`type`='check' AND t.`reference_type`='opening'
);

-- ---------- 3. 入库收货流水（in，正向增加） ----------
INSERT INTO `inventory_transactions`
  (`product_id`,`location_id`,`inventory_id`,`type`,`quantity`,`balance_quantity`,`operator_id`,`reason`,
   `reference_type`,`reference_id`,`created_at`)
SELECT p.id, l.id, i.id, 'in', x.qty, x.qty, (SELECT id FROM `users` WHERE `username`=x.op), '按入库单收货入库',
       'inbound_order', io.id, io.created_at
FROM (
  SELECT 'IN202601050001' ono,'SKU-5G-BBU' sku,'S-A-01-01' loc,'B20260103' batch,10 qty,'wh_manager' op
  UNION ALL SELECT 'IN202601050001','SKU-RRU-3971','S-C-01-01','B20260103',30,'wh_manager'
  UNION ALL SELECT 'IN202601120002','SKU-OLT-MA5683T','S-B-01-01','B20260110',5,'wh_manager'
  UNION ALL SELECT 'IN202601120002','SKU-ONU-HG8245H','S-B-01-02','B20260110',800,'wh_manager'
  UNION ALL SELECT 'IN202602030003','SKU-OPT-SFP28','S-B-02-01','B20260201',120,'operator'
  UNION ALL SELECT 'IN202603200006','SKU-FW-USG6525E','S-A-01-02','B20260318',4,'admin'
  UNION ALL SELECT 'IN202603200006','SKU-RTR-NE40E','S-A-02-01','B20260318',2,'admin'
  UNION ALL SELECT 'IN202604020007','SKU-ANT-700M','S-E-01-01','B20260401',60,'vendor_hw'
  UNION ALL SELECT 'IN202604020007','SKU-RRU-3971','S-E-01-02','B20260401',20,'vendor_hw'
) x
JOIN `inbound_orders` io ON io.`order_number` = x.ono
JOIN `products` p ON p.`sku` = x.sku
JOIN `locations` l ON l.`code` = x.loc
JOIN `inventory` i ON i.`product_id` = p.id AND i.`location_id` = l.id AND i.`batch_number` = x.batch
WHERE NOT EXISTS (
  SELECT 1 FROM `inventory_transactions` t
  WHERE t.`inventory_id` = i.id AND t.`type`='in' AND t.`reference_type`='inbound_order' AND t.`reference_id` = io.id
);

-- ---------- 4. 出库发货流水（out，反向扣减） ----------
INSERT INTO `inventory_transactions`
  (`product_id`,`location_id`,`inventory_id`,`type`,`quantity`,`balance_quantity`,`operator_id`,`reason`,
   `reference_type`,`reference_id`,`created_at`)
SELECT p.id, l.id, i.id, 'out', x.qty, 0, (SELECT id FROM `users` WHERE `username`=x.op), '按出库单拣货下架',
       'outbound_order', oo.id, oo.created_at
FROM (
  SELECT 'OUT202602100001' ono,'SKU-5G-BBU' sku,'S-A-01-01' loc,'B20260103' batch,4 qty,'wh_manager' op
  UNION ALL SELECT 'OUT202602100001','SKU-RRU-3971','S-C-01-01','B20260103',12,'wh_manager'
  UNION ALL SELECT 'OUT202603030002','SKU-OLT-MA5683T','S-B-01-01','B20260110',2,'admin'
  UNION ALL SELECT 'OUT202603030002','SKU-ONU-HG8245H','S-B-01-02','B20260110',300,'admin'
  UNION ALL SELECT 'OUT202604180004','SKU-ANT-700M','S-E-01-01','B20260401',30,'vendor_hw'
  UNION ALL SELECT 'OUT202605060005','SKU-FW-USG6525E','S-A-01-02','B20260318',2,'admin'
  UNION ALL SELECT 'OUT202605200006','SKU-ONU-HG8245H','S-B-01-02','B20260110',200,'operator'
) x
JOIN `outbound_orders` oo ON oo.`order_number` = x.ono
JOIN `products` p ON p.`sku` = x.sku
JOIN `locations` l ON l.`code` = x.loc
JOIN `inventory` i ON i.`product_id` = p.id AND i.`location_id` = l.id AND i.`batch_number` = x.batch
WHERE NOT EXISTS (
  SELECT 1 FROM `inventory_transactions` t
  WHERE t.`inventory_id` = i.id AND t.`type`='out' AND t.`reference_type`='outbound_order' AND t.`reference_id` = oo.id
);

-- ---------- 5. 盘点调平（盘盈 type=in / 盘亏 type=out，quantity 恒为正） ----------
INSERT INTO `inventory_transactions`
  (`product_id`,`location_id`,`inventory_id`,`type`,`quantity`,`balance_quantity`,`operator_id`,`reason`,
   `reference_type`,`reference_id`,`created_at`)
SELECT p.id, l.id, i.id, 'in', x.qty, 0, (SELECT id FROM `users` WHERE `username`='inventor'), x.reason,
       'manual_adjust', 0, x.created_at
FROM (
  SELECT 'SKU-CBL-LC' sku,'S-D-01-01' loc,'B20251015' batch,20 qty,'季度盘点盘盈，登记入库' reason,'2026-06-28 16:00:00' created_at
) x
JOIN `products` p ON p.`sku` = x.sku
JOIN `locations` l ON l.`code` = x.loc
JOIN `inventory` i ON i.`product_id` = p.id AND i.`location_id` = l.id AND i.`batch_number` = x.batch
WHERE NOT EXISTS (
  SELECT 1 FROM `inventory_transactions` t
  WHERE t.`inventory_id` = i.id AND t.`type`='in' AND t.`reference_type`='manual_adjust' AND t.`created_at` = x.created_at
);

INSERT INTO `inventory_transactions`
  (`product_id`,`location_id`,`inventory_id`,`type`,`quantity`,`balance_quantity`,`operator_id`,`reason`,
   `reference_type`,`reference_id`,`created_at`)
SELECT p.id, l.id, i.id, 'out', x.qty, 0, (SELECT id FROM `users` WHERE `username`='inventor'), x.reason,
       'manual_adjust', 0, x.created_at
FROM (
  SELECT 'SKU-CBL-PWR' sku,'S-D-01-02' loc,'B20251015' batch,5 qty,'季度盘点损耗，核减出库' reason,'2026-06-28 16:10:00' created_at
) x
JOIN `products` p ON p.`sku` = x.sku
JOIN `locations` l ON l.`code` = x.loc
JOIN `inventory` i ON i.`product_id` = p.id AND i.`location_id` = l.id AND i.`batch_number` = x.batch
WHERE NOT EXISTS (
  SELECT 1 FROM `inventory_transactions` t
  WHERE t.`inventory_id` = i.id AND t.`type`='out' AND t.`reference_type`='manual_adjust' AND t.`created_at` = x.created_at
);

-- ---------- 6. 修正历史脏数据：负数量的 adjust 行统一改为 out + 正数 ----------
UPDATE `inventory_transactions`
SET `type` = 'out', `quantity` = ABS(`quantity`), `reference_type` = 'manual_adjust'
WHERE `type` = 'adjust' AND `quantity` < 0;

-- ---------- 7. 补记无流水库存行的期初（保证「库存 == 流水汇总」全局成立） ----------
INSERT INTO `inventory_transactions`
  (`product_id`,`location_id`,`inventory_id`,`type`,`quantity`,`balance_quantity`,`operator_id`,`reason`,
   `reference_type`,`reference_id`,`created_at`)
SELECT i.`product_id`, i.`location_id`, i.id, 'check', i.`quantity`, i.`quantity`,
       (SELECT id FROM `users` WHERE `username`='admin'), '历史库存补记账，保证库存与流水一致',
       'opening', 0, NOW()
FROM `inventory` i
WHERE NOT EXISTS (SELECT 1 FROM `inventory_transactions` t WHERE t.`inventory_id` = i.id);

-- ---------- 8. 重算余额：按时间顺序累加，in/check 为加、out 为减 ----------
UPDATE `inventory_transactions` t
JOIN (
  SELECT t2.id,
         (SELECT SUM(
            CASE
              WHEN t3.`type` = 'out' THEN -t3.`quantity`
              WHEN t3.`type` IN ('reserve','release','transfer') THEN 0
              ELSE t3.`quantity`
            END)
          FROM `inventory_transactions` t3
          WHERE t3.`inventory_id` = t2.`inventory_id`
            AND (t3.`created_at` < t2.`created_at`
                 OR (t3.`created_at` = t2.`created_at` AND t3.id <= t2.id))
         ) AS bal
  FROM `inventory_transactions` t2
) x ON x.id = t.id
SET t.`balance_quantity` = IFNULL(x.bal, 0);

-- ---------- 9. 占用：未完成出库单占用的可用量 ----------
UPDATE `inventory` i
SET i.`reserved_quantity` = 50
WHERE i.`product_id` = (SELECT id FROM `products` WHERE `sku`='SKU-OPT-SFP28')
  AND i.`location_id` = (SELECT id FROM `locations` WHERE `code`='S-B-02-01')
  AND i.`batch_number` = 'B20260201';

UPDATE `inventory` i
SET i.`reserved_quantity` = 10
WHERE i.`product_id` = (SELECT id FROM `products` WHERE `sku`='SKU-RRU-3971')
  AND i.`location_id` = (SELECT id FROM `locations` WHERE `code`='S-E-01-02')
  AND i.`batch_number` = 'B20260401';

-- ---------- 10. 回写库存快照：quantity = 流水汇总 ----------
UPDATE `inventory` i
SET i.`quantity` = IFNULL((
      SELECT SUM(
        CASE
          WHEN t.`type` = 'out' THEN -t.`quantity`
          WHEN t.`type` IN ('reserve','release','transfer') THEN 0
          ELSE t.`quantity`
        END)
      FROM `inventory_transactions` t WHERE t.`inventory_id` = i.id), 0),
    i.`updated_at` = NOW();

UPDATE `inventory` SET `available_quantity` = `quantity` - `reserved_quantity`;

-- ---------- 11. 同步商品账面库存 ----------
UPDATE `products` p
SET p.`stock_quantity` = IFNULL((SELECT SUM(i.`quantity`) FROM `inventory` i WHERE i.`product_id` = p.id), 0);

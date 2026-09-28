-- ============================================================
-- 06 入库单种子：入库单 + 明细（覆盖 pending / receiving / completed）
-- 幂等：按 order_number 唯一键 + NOT EXISTS 守卫
-- ============================================================
SET NAMES utf8mb4;

INSERT INTO `inbound_orders`
  (`order_number`,`warehouse_id`,`supplier_id`,`operator_id`,`created_by`,`status`,`type`,
   `expected_date`,`received_date`,`notes`,`created_at`,`updated_at`)
SELECT x.order_number, w.id, s.id, u.id, u.id, x.st, x.tp, x.expected_date, x.received_date, x.notes, x.created_at, x.created_at
FROM (
  SELECT 'IN202601050001' order_number,'WH001' wh,'SUP-HW' supplier,'admin' op,'completed' st,'purchase' tp,
         '2026-01-03' expected_date,'2026-01-05' received_date,'5G三期首批到货，验收通过' notes,'2026-01-05 09:30:00' created_at
  UNION ALL SELECT 'IN202601120002','WH001','SUP-ZTE','wh_manager','completed','purchase','2026-01-10','2026-01-12','宽带光网OLT/ONU到货','2026-01-12 10:15:00'
  UNION ALL SELECT 'IN202602030003','WH001','SUP-HW','operator','receiving','purchase','2026-02-01',NULL,'光模块与AP验收中，待质检','2026-02-03 14:20:00'
  UNION ALL SELECT 'IN202602180004','WH002','SUP-FH','vendor_hw','pending','purchase','2026-02-20',NULL,'线缆类辅材已下单，未到货','2026-02-18 11:00:00'
  UNION ALL SELECT 'IN202603050005','WH003','SUP-TP','inventor','pending','purchase','2026-03-08',NULL,'园区项目备件调拨入库','2026-03-05 16:40:00'
  UNION ALL SELECT 'IN202603200006','WH001','SUP-CISCO','admin','completed','purchase','2026-03-18','2026-03-20','核心路由与防火墙到货','2026-03-20 09:05:00'
  UNION ALL SELECT 'IN202604020007','WH002','SUP-HW','vendor_hw','completed','purchase','2026-04-01','2026-04-02','天线与RRU补货','2026-04-02 15:30:00'
  UNION ALL SELECT 'IN202604160008','WH003','SUP-ZTE','inventor','pending','purchase','2026-04-20',NULL,'电源与电池备电批次','2026-04-16 08:50:00'
) x
JOIN `warehouses` w ON w.`code` = x.wh
LEFT JOIN `suppliers` s ON s.`code` = x.supplier
LEFT JOIN `users` u ON u.`username` = x.op
WHERE NOT EXISTS (SELECT 1 FROM `inbound_orders` io WHERE io.`order_number` = x.order_number);

-- ---------- 入库明细 ----------
INSERT INTO `inbound_order_items`
  (`inbound_order_id`,`product_id`,`location_id`,`quantity`,`received_quantity`,`unit_price`,
   `batch_number`,`expiry_date`,`requires_serial`,`notes`,`created_at`,`updated_at`)
SELECT io.id, p.id, l.id, x.qty, x.received, x.price, x.batch, NULL, x.need_sn, x.note, io.created_at, io.created_at
FROM `inbound_orders` io
JOIN (
  SELECT 'IN202601050001' ono,'SKU-5G-BBU' sku,'S-A-01-01' loc,10 qty,10 received,61200.00 price,'B20260103' batch,1 need_sn,'含主控板本期到货' note
  UNION ALL SELECT 'IN202601050001','SKU-RRU-3971','S-C-01-01',30,30,19600.00,'B20260103',1,'宏站射频单元'
  UNION ALL SELECT 'IN202601120002','SKU-OLT-MA5683T','S-B-01-01',5,5,42000.00,'B20260110',1,'局端OLT'
  UNION ALL SELECT 'IN202601120002','SKU-ONU-HG8245H','S-B-01-02',800,800,245.00,'B20260110',0,'家庭侧终端批量'
  UNION ALL SELECT 'IN202602030003','SKU-OPT-SFP28','S-B-02-01',200,120,880.00,'B20260201',0,'已收120只，其余在途'
  UNION ALL SELECT 'IN202602030003','SKU-AP-AE5760','S-C-01-02',300,0,720.00,'B20260201',1,'待质检'
  UNION ALL SELECT 'IN202602180004','SKU-CBL-LC','S-D-01-01',2000,0,16.00,'B20260220',0,'辅材未到'
  UNION ALL SELECT 'IN202602180004','SKU-CBL-PWR','S-D-01-02',500,0,62.00,'B20260220',0,'辅材未到'
  UNION ALL SELECT 'IN202603050005','SKU-SW-S5720','S-F-01-01',20,0,4300.00,'B20260308',1,'园区项目备件'
  UNION ALL SELECT 'IN202603050005','SKU-AP-AE5760','S-F-01-02',100,0,720.00,'B20260308',1,'无线覆盖一期待发'
  UNION ALL SELECT 'IN202603200006','SKU-FW-USG6525E','S-A-01-02',4,4,15000.00,'B20260318',1,'边界防火墙'
  UNION ALL SELECT 'IN202603200006','SKU-RTR-NE40E','S-A-02-01',2,2,106000.00,'B20260318',1,'城域网汇聚路由'
  UNION ALL SELECT 'IN202604020007','SKU-ANT-700M','S-E-01-01',60,60,1880.00,'B20260401',0,'低频天线'
  UNION ALL SELECT 'IN202604020007','SKU-RRU-3971','S-E-01-02',20,20,19600.00,'B20260401',1,'农网补点 RRU'
  UNION ALL SELECT 'IN202604160008','SKU-PWR-EPU4840','S-F-01-03',40,0,2900.00,'B20260420',1,'电源模块备货'
  UNION ALL SELECT 'IN202604160008','SKU-BAT-LI48','S-F-01-03',30,0,3480.00,'B20260420',0,'备电电池'
) x ON x.ono = io.`order_number`
JOIN `products` p ON p.`sku` = x.sku
LEFT JOIN `locations` l ON l.`code` = x.loc
WHERE NOT EXISTS (
  SELECT 1 FROM `inbound_order_items` ii
  WHERE ii.`inbound_order_id` = io.id AND ii.`product_id` = p.id
);

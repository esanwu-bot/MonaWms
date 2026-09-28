-- ============================================================
-- 07 出库单种子：出库单 + 明细（覆盖 pending / picking / shipped / completed）
-- 注意：仅 shipped / completed 的单据产生库存出库流水（见 08）
-- ============================================================
SET NAMES utf8mb4;

INSERT INTO `outbound_orders`
  (`order_number`,`warehouse_id`,`customer_id`,`operator_id`,`created_by`,`status`,`type`,`priority`,
   `expected_date`,`shipped_date`,`tracking_number`,`project_id`,`notes`,`created_at`,`updated_at`)
SELECT x.order_number, w.id, c.id, u.id, u.id, x.st, x.tp, x.priority, x.expected_date, x.shipped_date,
       x.tracking_number, pr.id, x.notes, x.created_at, x.created_at
FROM (
  SELECT 'OUT202602100001' order_number,'WH001' wh,'CUS-CMCC' cust,'wh_manager' op,'completed' st,'sale' tp,'high' priority,
         '2026-02-08' expected_date,'2026-02-10' shipped_date,'SF202602100001' tracking_number,'PRJ-2026-5G-001' prj,
         '5G三期首批站点发货' notes,'2026-02-10 09:15:00' created_at
  UNION ALL SELECT 'OUT202603030002','WH001','CUS-CTC','admin','completed','sale','normal','2026-03-01','2026-03-03','SF202603030002',NULL,
         '宽带光网首批发货','2026-03-03 10:40:00'
  UNION ALL SELECT 'OUT202604050003','WH001','CUS-CUCC','wh_manager','pending','sale','normal','2026-04-08',NULL,NULL,NULL,
         '光模块申请 50 只，待备货','2026-04-05 14:05:00'
  UNION ALL SELECT 'OUT202604180004','WH002','CUS-TOWER','vendor_hw','shipped','sale','urgent','2026-04-16','2026-04-18','SF202604180004','PRJ-2026-TWR-003',
         '铁塔电源改造配套天线','2026-04-18 15:30:00'
  UNION ALL SELECT 'OUT202605060005','WH001','CUS-ENG','admin','completed','sale','normal','2026-05-04','2026-05-06','SF202605060005','PRJ-2026-WLAN-004',
         '园区项目防火墙领用','2026-05-06 11:20:00'
  UNION ALL SELECT 'OUT202605200006','WH001','CUS-CTC','operator','completed','sale','normal','2026-05-18','2026-05-20','SF202605200006','PRJ-2026-BRG-002',
         '农村宽带二期 ONU 领用','2026-05-20 09:45:00'
  UNION ALL SELECT 'OUT202606020007','WH001','CUS-ENG','inventor','picking','sale','normal','2026-06-05',NULL,NULL,'PRJ-2026-WLAN-004',
         'AP 覆盖扩容，拣货中','2026-06-02 16:00:00'
  UNION ALL SELECT 'OUT202606150008','WH002','CUS-CUCC','vendor_hw','pending','transfer','low','2026-06-20',NULL,NULL,NULL,
         '调拨至备份站点，待审批','2026-06-15 10:10:00'
) x
JOIN `warehouses` w ON w.`code` = x.wh
LEFT JOIN `customers` c ON c.`code` = x.cust
LEFT JOIN `users` u ON u.`username` = x.op
LEFT JOIN `projects` pr ON pr.`project_code` = x.prj
WHERE NOT EXISTS (SELECT 1 FROM `outbound_orders` oo WHERE oo.`order_number` = x.order_number);

-- ---------- 出库明细 ----------
-- picked_quantity 表示实际拣货下架数量，只有已拣货/已发货/已完成才扣减库存
INSERT INTO `outbound_order_items`
  (`outbound_order_id`,`product_id`,`location_id`,`quantity`,`picked_quantity`,`unit_price`,
   `batch_number`,`requires_serial`,`project_id`,`notes`,`created_at`,`updated_at`)
SELECT oo.id, p.id, l.id, x.qty, x.picked, x.price, x.batch, x.need_sn, pr.id, x.note, oo.created_at, oo.created_at
FROM `outbound_orders` oo
JOIN (
  SELECT 'OUT202602100001' ono,'SKU-5G-BBU' sku,'S-A-01-01' loc,4 qty,4 picked,68500.00 price,'B20260103' batch,1 need_sn,'PRJ-2026-5G-001' prj,'宏站BBU 4台' note
  UNION ALL SELECT 'OUT202602100001','SKU-RRU-3971','S-C-01-01',12,12,21800.00,'B20260103',1,'PRJ-2026-5G-001','站点RRU 12台'
  UNION ALL SELECT 'OUT202603030002','SKU-OLT-MA5683T','S-B-01-01',2,2,46800.00,'B20260110',1,NULL,'乡镇OLT 2台'
  UNION ALL SELECT 'OUT202603030002','SKU-ONU-HG8245H','S-B-01-02',300,300,320.00,'B20260110',0,'PRJ-2026-BRG-002','家庭终端300台'
  UNION ALL SELECT 'OUT202604050003','SKU-OPT-SFP28','S-B-02-01',50,0,1180.00,'B20260201',0,NULL,'待备货，未拣配'
  UNION ALL SELECT 'OUT202604180004','SKU-ANT-700M','S-E-01-01',30,30,2400.00,'B20260401',0,'PRJ-2026-TWR-003','天线30副'
  UNION ALL SELECT 'OUT202605060005','SKU-FW-USG6525E','S-A-01-02',2,2,18600.00,'B20260318',1,'PRJ-2026-WLAN-004','边界防火墙2台'
  UNION ALL SELECT 'OUT202605200006','SKU-ONU-HG8245H','S-B-01-02',200,200,320.00,'B20260110',0,'PRJ-2026-BRG-002','二期茨口ONU'
  UNION ALL SELECT 'OUT202606020007','SKU-AP-AE5760','S-C-01-02',120,0,960.00,'B20251120',1,'PRJ-2026-WLAN-004','AP拣货中'
  UNION ALL SELECT 'OUT202606150008','SKU-RRU-3971','S-E-01-02',10,0,21800.00,'B20260401',1,NULL,'调拨待审批'
) x ON x.ono = oo.`order_number`
JOIN `products` p ON p.`sku` = x.sku
LEFT JOIN `locations` l ON l.`code` = x.loc
LEFT JOIN `projects` pr ON pr.`project_code` = x.prj
WHERE NOT EXISTS (
  SELECT 1 FROM `outbound_order_items` oi
  WHERE oi.`outbound_order_id` = oo.id AND oi.`product_id` = p.id
);

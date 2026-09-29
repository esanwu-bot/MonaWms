-- ============================================================
-- 09 设备台账 / 序列号（含流转历史）
-- 幂等：devices(device_code/serial_number)、serial_numbers(serial_number) 均为唯一键
-- ============================================================
SET NAMES utf8mb4;

-- ---------- 设备台账 ----------
INSERT INTO `devices`
  (`device_code`,`device_name`,`device_type`,`model`,`brand`,`serial_number`,`status`,`location`,
   `purchase_date`,`warranty_period`,`warranty_end_date`,`notes`,`created_at`,`updated_at`) VALUES
('DEV-5G-001','5G BBU基带单元','基站设备','BBU5900','华为','SN-BBU-2026-0001','active','A区-01','2026-01-05',36,'2029-01-05','5G三期在网运行','2026-01-05 09:30:00','2026-01-05 09:30:00'),
('DEV-5G-002','5G BBU基带单元','基站设备','BBU5900','华为','SN-BBU-2026-0002','active','A区-01','2026-01-05',36,'2029-01-05','5G三期在网运行','2026-01-05 09:30:00','2026-01-05 09:30:00'),
('DEV-5G-003','RRU射频拉远单元','基站设备','RRU3971','华为','SN-RRU-2026-0011','active','C区-01','2026-01-05',36,'2029-01-05','已交付安装','2026-01-05 09:30:00','2026-01-05 09:30:00'),
('DEV-5G-004','RRU射频拉远单元','基站设备','RRU3971','华为','SN-RRU-2026-0012','maintenance','维修区-R01','2026-01-05',36,'2029-01-05','端口异常，返修中','2026-01-05 09:30:00','2026-03-05 09:30:00'),
('DEV-5G-005','RRU射频拉远单元','基站设备','RRU3971','华为','SN-RRU-2026-0013','inactive','暂苔区-T01','2026-01-05',36,'2029-01-05','暂不用，封存待调拨','2026-01-05 09:30:00','2026-01-05 09:30:00'),
('DEV-OPT-001','OLT光线路终端','光传输设备','MA5683T','华为','SN-OLT-2026-0001','active','B区-01','2026-01-12',36,'2029-01-12','乡镇局端已上线','2026-01-12 10:15:00','2026-01-12 10:15:00'),
('DEV-OPT-002','OLT光线路终端','光传输设备','MA5683T','华为','SN-OLT-2026-0002','active','B区-01','2026-01-12',36,'2029-01-12','备用局端','2026-01-12 10:15:00','2026-01-12 10:15:00'),
('DEV-OPT-003','25G SFP28光模块','光传输设备','SFP28-25G-LR','华为','SN-SFP28-2026-0101','active','B区-02','2026-02-03',12,'2027-02-03','已收120只批次中的代表件','2026-02-03 14:20:00','2026-02-03 14:20:00'),
('DEV-NET-001','千兆接入交换机','网络设备','S5720-28X-SI','华为','SN-SW-2026-0001','active','A区-02','2025-11-01',36,'2028-11-01','园区项目在用','2025-11-01 10:00:00','2025-11-01 10:00:00'),
('DEV-NET-002','下一代防火墙','网络安全设备','USG6525E','华为','SN-FW-2026-0001','active','A区-01','2026-03-20',36,'2029-03-20','边界安全防护网关','2026-03-20 09:05:00','2026-03-20 09:05:00'),
('DEV-NET-003','核心路由器','网络设备','NE40E-M2K','华为','SN-RTR-2026-0001','active','A区-02','2026-03-20',36,'2029-03-20','城域网汇聚节点','2026-03-20 09:05:00','2026-03-20 09:05:00'),
('DEV-NET-004','核心路由器','网络设备','NE40E-M2K','华为','SN-RTR-2026-0002','maintenance','维修区-R01','2026-03-20',36,'2029-03-20','风扇告警待更换','2026-03-20 09:05:00','2026-05-20 09:05:00'),
('DEV-WIR-001','WiFi6无线AP','无线设备','AirEngine5760-10','华为','SN-AP-2026-0001','active','C区-02','2025-11-20',36,'2028-11-20','室内放装型','2025-11-20 10:00:00','2025-11-20 10:00:00'),
('DEV-WIR-002','WiFi6无线AP','无线设备','AirEngine5760-10','华为','SN-AP-2026-0002','active','C区-02','2025-11-20',36,'2028-11-20','室内放装型','2025-11-20 10:00:00','2025-11-20 10:00:00'),
('DEV-WIR-003','700MHz定向天线','无线设备','ANT700M-17','华为','SN-ANT-2026-0001','active','E区-01','2026-04-02',24,'2028-04-02','低频定向天线','2026-04-02 15:30:00','2026-04-02 15:30:00'),
('DEV-PWR-001','通信直流电源模块','配件耗材','EPU4840','中兴','SN-PWR-2026-0001','active','D区-02','2025-11-01',24,'2027-11-01','-48V整流模块','2025-11-01 10:00:00','2025-11-01 10:00:00'),
('DEV-PWR-002','磷酸铁锂备电电池','配件耗材','BAT-48V50AH','中兴','SN-BAT-2026-0001','active','D区-02','2025-11-01',36,'2028-11-01','备电电池组','2025-11-01 10:00:00','2025-11-01 10:00:00'),
('DEV-SCR-001','老旧光猫终端','光传输设备','HG8245C','华为','SN-EOL-2019-0088','scrapped','报废区','2019-06-01',36,'2022-06-01','超期服役已报废','2019-06-01 10:00:00','2026-01-20 10:00:00')
ON DUPLICATE KEY UPDATE
  `device_name`=VALUES(`device_name`), `device_type`=VALUES(`device_type`), `model`=VALUES(`model`),
  `brand`=VALUES(`brand`), `status`=VALUES(`status`), `location`=VALUES(`location`),
  `purchase_date`=VALUES(`purchase_date`), `warranty_period`=VALUES(`warranty_period`),
  `warranty_end_date`=VALUES(`warranty_end_date`), `notes`=VALUES(`notes`), `updated_at`=NOW();

-- ---------- 序列号主档 ----------
INSERT INTO `serial_numbers`
  (`serial_number`,`product_id`,`manufacture_date`,`warranty_period`,`warranty_end_date`,`status`,`location`,`mac_address`,`notes`,`created_at`,`updated_at`) VALUES
('SN-BBU-2026-0001',(SELECT id FROM `products` WHERE `sku`='SKU-5G-BBU'),'2025-12-10',36,'2028-12-10','installed','XX市宏站-001','00:1A:2B:00:01:01','已安装并开通',NOW(),NOW()),
('SN-BBU-2026-0002',(SELECT id FROM `products` WHERE `sku`='SKU-5G-BBU'),'2025-12-10',36,'2028-12-10','in_stock','A区-01','00:1A:2B:00:01:02','库存可用',NOW(),NOW()),
('SN-RRU-2026-0011',(SELECT id FROM `products` WHERE `sku`='SKU-RRU-3971'),'2025-12-15',36,'2028-12-15','installed','XX市宏站-001','00:1A:2B:00:02:01','站点一扇区',NOW(),NOW()),
('SN-RRU-2026-0012',(SELECT id FROM `products` WHERE `sku`='SKU-RRU-3971'),'2025-12-15',36,'2028-12-15','returned','维修区-R01','00:1A:2B:00:02:02','返修召回',NOW(),NOW()),
('SN-RRU-2026-0013',(SELECT id FROM `products` WHERE `sku`='SKU-RRU-3971'),'2025-12-15',36,'2028-12-15','in_stock','暂苔区-T01','00:1A:2B:00:02:03','封存待调拨',NOW(),NOW()),
('SN-OLT-2026-0001',(SELECT id FROM `products` WHERE `sku`='SKU-OLT-MA5683T'),'2025-12-20',36,'2028-12-20','installed','乡镇机房-A','00:1A:2B:00:03:01','乡镇OLT已上线',NOW(),NOW()),
('SN-OLT-2026-0002',(SELECT id FROM `products` WHERE `sku`='SKU-OLT-MA5683T'),'2025-12-20',36,'2028-12-20','in_stock','B区-01','00:1A:2B:00:03:02','备用局端机',NOW(),NOW()),
('SN-ONU-2026-0101',(SELECT id FROM `products` WHERE `sku`='SKU-ONU-HG8245H'),'2025-12-01',24,'2027-12-01','in_stock','B区-02','00:1A:2B:00:04:01','批次 B20260110',NOW(),NOW()),
('SN-ONU-2026-0102',(SELECT id FROM `products` WHERE `sku`='SKU-ONU-HG8245H'),'2025-12-01',24,'2027-12-01','shipped','XX乡镇-王村','00:1A:2B:00:04:02','已发放到户',NOW(),NOW()),
('SN-ONU-2026-0103',(SELECT id FROM `products` WHERE `sku`='SKU-ONU-HG8245H'),'2025-12-01',24,'2027-12-01','to_scrap','报废区','00:1A:2B:00:04:03','雷击损坏待报废',NOW(),NOW()),
('SN-SFP28-2026-0101',(SELECT id FROM `products` WHERE `sku`='SKU-OPT-SFP28'),'2026-01-05',12,'2027-01-05','in_stock','B区-02',NULL,'批次 B20260201',NOW(),NOW()),
('SN-SFP28-2026-0102',(SELECT id FROM `products` WHERE `sku`='SKU-OPT-SFP28'),'2026-01-05',12,'2027-01-05','reserved','B区-02',NULL,'已被出库单占用',NOW(),NOW()),
('SN-SW-2026-0001',(SELECT id FROM `products` WHERE `sku`='SKU-SW-S5720'),'2025-09-10',36,'2028-09-10','installed','XX高新区-厂房A','00:1A:2B:00:05:01','园区项目在用',NOW(),NOW()),
('SN-FW-2026-0001',(SELECT id FROM `products` WHERE `sku`='SKU-FW-USG6525E'),'2026-01-20',36,'2029-01-20','installed','XX核心机房','00:1A:2B:00:06:01','边界入口',NOW(),NOW()),
('SN-RTR-2026-0001',(SELECT id FROM `products` WHERE `sku`='SKU-RTR-NE40E'),'2026-02-10',36,'2029-02-10','installed','XX核心机房','00:1A:2B:00:07:01','汇聚节点主用',NOW(),NOW()),
('SN-RTR-2026-0002',(SELECT id FROM `products` WHERE `sku`='SKU-RTR-NE40E'),'2026-02-10',36,'2029-02-10','returned','维修区-R01','00:1A:2B:00:07:02','风扇告警返修',NOW(),NOW()),
('SN-AP-2026-0001',(SELECT id FROM `products` WHERE `sku`='SKU-AP-AE5760'),'2025-10-05',36,'2028-10-05','in_stock','C区-02','00:1A:2B:00:08:01','批次 B20251120',NOW(),NOW()),
('SN-AP-2026-0002',(SELECT id FROM `products` WHERE `sku`='SKU-AP-AE5760'),'2025-10-05',36,'2028-10-05','in_stock','C区-02','00:1A:2B:00:08:02','批次 B20251120',NOW(),NOW()),
('SN-ANT-2026-0001',(SELECT id FROM `products` WHERE `sku`='SKU-ANT-700M'),'2026-03-01',24,'2028-03-01','shipped','XX市铁塔-XX站','00:1A:2B:00:09:01','铁塔站点交付',NOW(),NOW()),
('SN-PWR-2026-0001',(SELECT id FROM `products` WHERE `sku`='SKU-PWR-EPU4840'),'2025-10-20',24,'2027-10-20','in_stock','D区-02',NULL,'整流模块',NOW(),NOW()),
('SN-BAT-2026-0001',(SELECT id FROM `products` WHERE `sku`='SKU-BAT-LI48'),'2025-10-20',36,'2028-10-20','in_stock','D区-02',NULL,'备电电池组',NOW(),NOW()),
('SN-EOL-2019-0088',(SELECT id FROM `products` WHERE `sku`='SKU-ONU-HG8245H'),'2019-05-01',36,'2022-05-01','to_scrap','报废区','00:1A:2B:00:99:88','超期服役待报废',NOW(),NOW())
ON DUPLICATE KEY UPDATE
  `product_id`=VALUES(`product_id`), `status`=VALUES(`status`), `location`=VALUES(`location`),
  `mac_address`=VALUES(`mac_address`), `notes`=VALUES(`notes`), `updated_at`=NOW();

-- ---------- 序列号流转历史 ----------
INSERT INTO `serial_number_history`
  (`serial_number_id`,`event_type`,`status_before`,`status_after`,`location_before`,`location_after`,
   `reference_type`,`reference_id`,`operator_id`,`notes`,`created_at`)
SELECT s.id, x.event, x.st_before, x.st_after, NULL, NULL, x.ref_type, io.id,
       (SELECT id FROM `users` WHERE `username`=x.op), x.note, x.created_at
FROM `serial_numbers` s
JOIN (
  SELECT 'SN-BBU-2026-0001' sn,'inbound' event,NULL st_before,'in_stock' st_after,'inbound_order' ref_type,'IN202601050001' ono,'wh_manager' op,'到货入库登记' note,'2026-01-05 09:30:00' created_at
  UNION ALL SELECT 'SN-BBU-2026-0001','install','in_stock','installed','outbound_order','OUT202602100001','wh_manager','站点安装开通','2026-02-12 10:00:00'
  UNION ALL SELECT 'SN-RRU-2026-0012','inbound',NULL,'in_stock','inbound_order','IN202601050001','wh_manager','到货入库登记','2026-01-05 09:30:00'
  UNION ALL SELECT 'SN-RRU-2026-0012','repair','in_stock','returned','outbound_order','OUT202602100001','wh_manager','端口异常返修','2026-03-05 09:30:00'
  UNION ALL SELECT 'SN-OLT-2026-0001','inbound',NULL,'in_stock','inbound_order','IN202601120002','wh_manager','OLT到货入库','2026-01-12 10:15:00'
  UNION ALL SELECT 'SN-OLT-2026-0001','install','in_stock','installed','outbound_order','OUT202603030002','admin','乡镇机房上线','2026-03-06 11:00:00'
  UNION ALL SELECT 'SN-SFP28-2026-0101','inbound',NULL,'in_stock','inbound_order','IN202602030003','operator','部分到货入库','2026-02-03 14:20:00'
  UNION ALL SELECT 'SN-SFP28-2026-0102','inbound',NULL,'reserved','inbound_order','IN202602030003','operator','入库后即被占用','2026-02-03 14:20:00'
  UNION ALL SELECT 'SN-FW-2026-0001','inbound',NULL,'in_stock','inbound_order','IN202603200006','admin','防火墙到货入库','2026-03-20 09:05:00'
  UNION ALL SELECT 'SN-RTR-2026-0002','repair','in_stock','returned','outbound_order','OUT202605060005','admin','风扇告警返修','2026-05-20 09:05:00'
  UNION ALL SELECT 'SN-EOL-2019-0088','repair','in_stock','to_scrap','inbound_order','IN202601050001','admin','超期服役待报废','2026-01-20 10:00:00'
) x ON x.sn = s.`serial_number`
LEFT JOIN `inbound_orders` io ON io.`order_number` = x.`ono`
WHERE NOT EXISTS (
  SELECT 1 FROM `serial_number_history` h
  WHERE h.`serial_number_id` = s.id AND h.`event_type` = x.event AND h.`created_at` = x.created_at
);

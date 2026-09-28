-- ============================================================
-- 02 仓储结构种子：仓库 / 库区 / 货架 / 库位
-- 幂等：无唯一键的表用 NOT EXISTS 守卫，可重复执行
-- ============================================================
SET NAMES utf8mb4;

-- ---------- 仓库 ----------
INSERT INTO `warehouses` (`code`,`name`,`address`,`manager_id`,`status`,`total_capacity`) VALUES
('WH003','备件仓','XX市XX区通信设备备件中心',1,'active',2000)
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`), `address`=VALUES(`address`), `status`=VALUES(`status`), `total_capacity`=VALUES(`total_capacity`);

UPDATE `warehouses` SET `manager_id`=1, `status`='active' WHERE `code` IN ('WH001','WH002') AND `manager_id` IS NULL;

-- ---------- 库区 ----------
INSERT INTO `zones` (`warehouse_id`,`code`,`name`,`type`,`description`)
SELECT w.id, x.code, x.name, x.zone_type, x.zdesc
FROM `warehouses` w
JOIN (
  SELECT 'WH001' wh,'Z-A' code,'A区·核心网络' name,'storage' zone_type,'核心路由器、交换机、防火墙' zdesc
  UNION ALL SELECT 'WH001','Z-B','B区·传输接入','storage','OLT/ONU/光模块'
  UNION ALL SELECT 'WH001','Z-C','C区·无线终端','storage','AP、天线、RRU'
  UNION ALL SELECT 'WH001','Z-D','D区·备件耗材','storage','电源、电池、线缆'
  UNION ALL SELECT 'WH001','Z-R','维修区','storage','待修与返修设备'
  UNION ALL SELECT 'WH001','Z-T','暂存区','staging','待检与待发设备'
  UNION ALL SELECT 'WH002','Z-E','E区·分仓存储','storage','分仓通用存储'
  UNION ALL SELECT 'WH003','Z-F','F区·备件仓存储','storage','备件与周转机器'
) x ON x.wh = w.code
WHERE NOT EXISTS (
  SELECT 1 FROM `zones` z WHERE z.`warehouse_id` = w.id AND z.`code` = x.code
);

-- ---------- 货架 ----------
INSERT INTO `shelves` (`zone_id`,`code`,`name`,`description`)
SELECT z.id, x.code, x.name, CONCAT(z.name,' ',x.name)
FROM `zones` z
JOIN (
  SELECT 'Z-A' zc,'S-A-01' code,'货架A-01' name
  UNION ALL SELECT 'Z-A','S-A-02','货架A-02'
  UNION ALL SELECT 'Z-B','S-B-01','货架B-01'
  UNION ALL SELECT 'Z-B','S-B-02','货架B-02'
  UNION ALL SELECT 'Z-C','S-C-01','货架C-01'
  UNION ALL SELECT 'Z-D','S-D-01','货架D-01'
  UNION ALL SELECT 'Z-D','S-D-02','货架D-02'
  UNION ALL SELECT 'Z-R','S-R-01','货架R-01'
  UNION ALL SELECT 'Z-T','S-T-01','货架T-01'
  UNION ALL SELECT 'Z-E','S-E-01','货架E-01'
  UNION ALL SELECT 'Z-F','S-F-01','货架F-01'
) x ON x.zc = z.code
WHERE NOT EXISTS (
  SELECT 1 FROM `shelves` s WHERE s.`zone_id` = z.id AND s.`code` = x.code
);

-- ---------- 库位（每个货架 3 个） ----------
INSERT INTO `locations` (`shelf_id`,`warehouse_id`,`zone_id`,`code`,`name`,`barcode`,`type`,`status`,`capacity`)
SELECT s.id, z.warehouse_id, z.id,
       CONCAT(s.code,'-',LPAD(n.n,2,'0')),
       CONCAT(s.code,'-',LPAD(n.n,2,'0'),' 库位'),
       CONCAT('BC-',s.code,'-',LPAD(n.n,2,'0')),
       'storage','available',200
FROM `shelves` s
JOIN `zones` z ON z.id = s.zone_id
JOIN (SELECT 1 n UNION ALL SELECT 2 UNION ALL SELECT 3) n
WHERE NOT EXISTS (
  SELECT 1 FROM `locations` l WHERE l.`shelf_id` = s.id AND l.`code` = CONCAT(s.code,'-',LPAD(n.n,2,'0'))
);

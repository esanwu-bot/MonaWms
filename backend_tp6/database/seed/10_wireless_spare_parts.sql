-- ============================================================
-- 10 无线备件出入库登记
-- ============================================================
SET NAMES utf8mb4;

INSERT INTO `wireless_spare_parts`
  (`code`,`part_name`,`model`,`serial_number`,`type`,`quantity`,`operator`,`project`,`status`,`created_at`,`updated_at`) VALUES
('WSP-2026-0001','5G AAU整机备件','AAU5613','SN-WSP-AAU-0001','5G',3,'张伟','PRJ-2026-5G-001','inbound','2026-01-06 09:00:00','2026-01-06 09:00:00'),
('WSP-2026-0002','5G RRU整机备件','RRU3971','SN-WSP-RRU-0002','5G',5,'李静','PRJ-2026-5G-001','inbound','2026-01-06 09:10:00','2026-01-06 09:10:00'),
('WSP-2026-0003','BBU主控板','UMPTe3','SN-WSP-BBU-0003','5G',2,'张伟','PRJ-2026-5G-001','outbound','2026-02-11 10:20:00','2026-02-11 10:20:00'),
('WSP-2026-0004','4G LTE基带板','LBBPd4','SN-WSP-LTE-0004','4G',4,'王强',NULL,'inbound','2026-03-02 14:00:00','2026-03-02 14:00:00'),
('WSP-2026-0005','3G WCDMA板卡','WBBP7','SN-WSP-WCDMA-0005','3G',2,'王强',NULL,'returned','2026-03-18 15:30:00','2026-03-18 15:30:00'),
('WSP-2026-0006','2G GSM载频模块','GTMUc','SN-WSP-GSM-0006','2G',6,'张伟',NULL,'inbound','2026-04-08 11:00:00','2026-04-08 11:00:00'),
('WSP-2026-0007','GPS天线备件','ANT-GPS-01','SN-WSP-GPS-0007','other',10,'李静','PRJ-2026-TWR-003','inbound','2026-04-25 09:40:00','2026-04-25 09:40:00'),
('WSP-2026-0008','RRU 光电复合缆','CPRI-10M',NULL,'5G',20,'赵敏',NULL,'outbound','2026-05-10 16:20:00','2026-05-10 16:20:00'),
('WSP-2026-0009','AAU 供电模块','PSU-AAU-48V','SN-WSP-PSU-0009','5G',4,'张伟','PRJ-2026-5G-001','returned','2026-06-02 10:00:00','2026-06-02 10:00:00'),
('WSP-2026-0010','WiFi6 AP 备机','AirEngine5760-10','SN-WSP-AP-0010','other',12,'李静','PRJ-2026-WLAN-004','inbound','2026-06-18 13:15:00','2026-06-18 13:15:00')
ON DUPLICATE KEY UPDATE
  `part_name`=VALUES(`part_name`), `model`=VALUES(`model`), `serial_number`=VALUES(`serial_number`),
  `type`=VALUES(`type`), `quantity`=VALUES(`quantity`), `operator`=VALUES(`operator`),
  `project`=VALUES(`project`), `status`=VALUES(`status`), `updated_at`=NOW();

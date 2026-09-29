-- ============================================================
-- 01 主数据种子：分类 / 供应商 / 客户 / 商品(SKU)
-- 幂等：唯一键冲突时刷新为种子值，可重复执行
-- ============================================================
SET NAMES utf8mb4;

-- ---------- 商品分类 ----------
INSERT INTO `categories` (`code`,`name`,`parent_id`,`description`,`status`,`sort_order`) VALUES
('COMM','通信设备',NULL,'5G/传输/数据通信主设备','active',10),
('WIRE','无线设备',NULL,'天线、AP、射频单元','active',20),
('OPT','光传输设备',NULL,'OLT/ONU/光模块','active',30),
('NET','网络设备',NULL,'路由器、交换机、防火墙','active',40),
('ACC','配件耗材',NULL,'电源、电池、线缆、辅材','active',50)
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`), `description`=VALUES(`description`), `status`=VALUES(`status`), `sort_order`=VALUES(`sort_order`);

-- ---------- 商品二级分类（F1：一级大类 + 二级细分） ----------
-- parent_id 通过一级分类 code 反查，避免依赖自增 ID；code 唯一，可幂等重复执行
INSERT INTO `categories` (`code`,`name`,`parent_id`,`description`,`status`,`sort_order`) VALUES
('COMM-BS','基站设备',(SELECT id FROM (SELECT id FROM `categories` WHERE `code`='COMM') AS t),'5G/4G基站主设备','active',11),
('COMM-TR','传输设备',(SELECT id FROM (SELECT id FROM `categories` WHERE `code`='COMM') AS t),'PTN/OTN/SDH传输设备','active',12),
('WIRE-AP','无线AP',(SELECT id FROM (SELECT id FROM `categories` WHERE `code`='WIRE') AS t),'室内外无线接入点','active',21),
('WIRE-ANT','天线',(SELECT id FROM (SELECT id FROM `categories` WHERE `code`='WIRE') AS t),'全向/定向天线','active',22),
('WIRE-RF','射频单元',(SELECT id FROM (SELECT id FROM `categories` WHERE `code`='WIRE') AS t),'RRU/射频拉远单元','active',23),
('OPT-OLT','OLT设备',(SELECT id FROM (SELECT id FROM `categories` WHERE `code`='OPT') AS t),'光线路终端','active',31),
('OPT-ONU','ONU设备',(SELECT id FROM (SELECT id FROM `categories` WHERE `code`='OPT') AS t),'光网络单元','active',32),
('OPT-MOD','光模块',(SELECT id FROM (SELECT id FROM `categories` WHERE `code`='OPT') AS t),'SFP/SFP28/QSFP光模块','active',33),
('NET-RTR','路由器',(SELECT id FROM (SELECT id FROM `categories` WHERE `code`='NET') AS t),'核心/汇聚/接入路由器','active',41),
('NET-SW','交换机',(SELECT id FROM (SELECT id FROM `categories` WHERE `code`='NET') AS t),'二层/三层交换机','active',42),
('NET-FW','防火墙',(SELECT id FROM (SELECT id FROM `categories` WHERE `code`='NET') AS t),'防火墙/网络安全设备','active',43),
('ACC-PWR','电源',(SELECT id FROM (SELECT id FROM `categories` WHERE `code`='ACC') AS t),'开关电源/整流模块','active',51),
('ACC-BAT','电池',(SELECT id FROM (SELECT id FROM `categories` WHERE `code`='ACC') AS t),'蓄电池/锂电池组','active',52),
('ACC-CBL','线缆',(SELECT id FROM (SELECT id FROM `categories` WHERE `code`='ACC') AS t),'光纤/网线/电源线','active',53),
('ACC-MAT','辅材',(SELECT id FROM (SELECT id FROM `categories` WHERE `code`='ACC') AS t),'接头/法兰盘/标签等','active',54)
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`), `description`=VALUES(`description`), `status`=VALUES(`status`), `sort_order`=VALUES(`sort_order`);

-- ---------- 供应商（通信设备原厂与代供方） ----------
INSERT INTO `suppliers` (`code`,`name`,`contact_person`,`phone`,`email`,`address`,`status`) VALUES
('SUP-HW','华为技术有限公司','张伟','13800000001','hw@example.com','深圳市龙岗区坂田华为基地','active'),
('SUP-ZTE','中兴通讯股份有限公司','李娜','13800000002','zte@example.com','深圳市南山区科技园','active'),
('SUP-FH','烽火通信科技股份有限公司','王强','13800000003','fh@example.com','武汉市东湖高新区','active'),
('SUP-CISCO','思科系统（中国）','赵敏','13800000004','cisco@example.com','上海市浦东新区','active'),
('SUP-TP','普联技术有限公司','陈静','13800000005','tp@example.com','深圳市南山区科技园','active')
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`), `contact_person`=VALUES(`contact_person`), `phone`=VALUES(`phone`), `email`=VALUES(`email`), `address`=VALUES(`address`), `status`=VALUES(`status`);

-- ---------- 客户（运营商分公司与工程部） ----------
INSERT INTO `customers` (`code`,`name`,`contact_person`,`phone`,`email`,`address`,`status`) VALUES
('CUS-CMCC','中国移动XX分公司','刘洋','13900000001','cmcc@example.com','XX市XX区移动大厦','active'),
('CUS-CTC','中国电信XX分公司','孙磊','13900000002','ctc@example.com','XX市XX区电信大楼','active'),
('CUS-CUCC','中国联通XX分公司','周涛','13900000003','cucc@example.com','XX市XX区联通大厦','active'),
('CUS-TOWER','中国铁塔XX分公司','吴迪','13900000004','tower@example.com','XX市XX区铁塔中心','active'),
('CUS-ENG','XX通信工程建设部','郑凯','13900000005','eng@example.com','XX市XX区创业大厦','active')
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`), `contact_person`=VALUES(`contact_person`), `phone`=VALUES(`phone`), `email`=VALUES(`email`), `address`=VALUES(`address`), `status`=VALUES(`status`);

-- ---------- 商品台账（通信设备） ----------
-- category_id 通过分类 code 反查，避免依赖物理自增 ID
INSERT INTO `products`
  (`sku`,`name`,`description`,`device_type`,`model_number`,`frequency_protocol`,`firmware_version`,
   `category_id`,`barcode`,`price`,`cost_price`,`unit`,`weight`,
   `min_stock`,`max_stock`,`min_stock_level`,`status`)
VALUES
('SKU-5G-BBU','5G BBU基带单元','5G基站基带处理单元，含主控板','基站设备','BBU5900','5G NR 2.6GHz','V100R015',
   (SELECT id FROM `categories` WHERE `code`='COMM-BS'),'BC-SKU-5G-BBU',68500.00,61200.00,'台',18.500,5,80,10,'active'),
('SKU-RRU-3971','RRU射频拉远单元','5G宏站射频单元','基站设备','RRU3971','5G NR 2.6GHz','V100R015',
   (SELECT id FROM `categories` WHERE `code`='COMM-BS'),'BC-SKU-RRU-3971',21800.00,19600.00,'台',12.000,10,200,20,'active'),
('SKU-OLT-MA5683T','OLT光线路终端','GPON/10G PON 汇聚局端设备','光传输设备','MA5683T','GPON/XGS-PON','V800R018',
   (SELECT id FROM `categories` WHERE `code`='OPT-OLT'),'BC-SKU-OLT-MA5683T',46800.00,42000.00,'台',15.200,2,30,5,'active'),
('SKU-ONU-HG8245H','ONU光网络单元','家庭侧千兆光猫终端','光传输设备','HG8245H','GPON','V300R019',
   (SELECT id FROM `categories` WHERE `code`='OPT-ONU'),'BC-SKU-ONU-HG8245H',320.00,245.00,'台',0.600,200,5000,300,'active'),
('SKU-OPT-SFP28','25G SFP28光模块','25G 灰光模块 10km','光传输设备','SFP28-25G-LR','25GBASE-LR','NA',
   (SELECT id FROM `categories` WHERE `code`='OPT-MOD'),'BC-SKU-OPT-SFP28',1180.00,880.00,'只',0.050,50,2000,100,'active'),
('SKU-SW-S5720','千兆接入交换机','24口千兆+4万兆上行','网络设备','S5720-28X-SI','GE/10GE','V200R020',
   (SELECT id FROM `categories` WHERE `code`='NET-SW'),'BC-SKU-SW-S5720',5600.00,4300.00,'台',4.200,10,150,20,'active'),
('SKU-FW-USG6525E','下一代防火墙','边界安全防护网关','网络安全设备','USG6525E','N/A','V600R007',
   (SELECT id FROM `categories` WHERE `code`='NET-FW'),'BC-SKU-FW-USG6525E',18600.00,15000.00,'台',5.800,2,40,5,'active'),
('SKU-RTR-NE40E','核心路由器','城域网汇聚路由器','网络设备','NE40E-M2K','100GE','V800R011',
   (SELECT id FROM `categories` WHERE `code`='NET-RTR'),'BC-SKU-RTR-NE40E',128000.00,106000.00,'台',22.000,1,20,2,'active'),
('SKU-AP-AE5760','WiFi6无线AP','室内放装型AP','无线设备','AirEngine5760-10','WiFi6 2.4G+5G','V200R021',
   (SELECT id FROM `categories` WHERE `code`='WIRE-AP'),'BC-SKU-AP-AE5760',960.00,720.00,'台',0.800,100,1500,150,'active'),
('SKU-ANT-700M','700MHz定向天线','5G低频定向天线','无线设备','ANT700M-17','700MHz','NA',
   (SELECT id FROM `categories` WHERE `code`='WIRE-ANT'),'BC-SKU-ANT-700M',2400.00,1880.00,'副',7.500,10,120,20,'active'),
('SKU-PWR-EPU4840','通信直流电源模块','-48V整流模块 40A','配件耗材','EPU4840','N/A','NA',
   (SELECT id FROM `categories` WHERE `code`='ACC-PWR'),'BC-SKU-PWR-EPU4840',3600.00,2900.00,'台',3.600,8,100,15,'active'),
('SKU-BAT-LI48','磷酸铁锂备电电池','48V 50AH 备电电池组','配件耗材','BAT-48V50AH','N/A','NA',
   (SELECT id FROM `categories` WHERE `code`='ACC-BAT'),'BC-SKU-BAT-LI48',4200.00,3480.00,'组',19.000,5,80,10,'active'),
('SKU-CBL-LC','光纤跳线 LC-LC','单模双芯 10m','配件耗材','LC-LC-SM-10M','N/A','NA',
   (SELECT id FROM `categories` WHERE `code`='ACC-CBL'),'BC-SKU-CBL-LC',28.00,16.00,'条',0.100,500,8000,800,'active'),
('SKU-CBL-PWR','直流电源线缆','-48V 16mm2 电源线 5m','配件耗材','PWR-CABLE-16-5M','N/A','NA',
   (SELECT id FROM `categories` WHERE `code`='ACC-CBL'),'BC-SKU-CBL-PWR',96.00,62.00,'根',1.200,300,4000,400,'active')
ON DUPLICATE KEY UPDATE
  `name`=VALUES(`name`), `description`=VALUES(`description`), `device_type`=VALUES(`device_type`),
  `model_number`=VALUES(`model_number`), `frequency_protocol`=VALUES(`frequency_protocol`),
  `firmware_version`=VALUES(`firmware_version`), `category_id`=VALUES(`category_id`),
  `barcode`=VALUES(`barcode`), `price`=VALUES(`price`), `cost_price`=VALUES(`cost_price`),
  `unit`=VALUES(`unit`), `weight`=VALUES(`weight`), `min_stock`=VALUES(`min_stock`),
  `max_stock`=VALUES(`max_stock`), `min_stock_level`=VALUES(`min_stock_level`), `status`=VALUES(`status`);

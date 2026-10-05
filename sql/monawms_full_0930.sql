/*
SQLyog Ultimate v12.09 (64 bit)
MySQL - 5.7.26 : Database - monawms
*********************************************************************
*/

/*!40101 SET NAMES utf8 */;

/*!40101 SET SQL_MODE=''*/;

/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
CREATE DATABASE /*!32312 IF NOT EXISTS*/`monawms` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */;

USE `monawms`;

/*Table structure for table `bom_headers` */

DROP TABLE IF EXISTS `bom_headers`;

CREATE TABLE `bom_headers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `bom_code` varchar(50) NOT NULL,
  `product_id` int(11) NOT NULL,
  `version` varchar(20) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_bom_code` (`bom_code`),
  KEY `idx_product_id` (`product_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4;

/*Data for the table `bom_headers` */

insert  into `bom_headers`(`id`,`bom_code`,`product_id`,`version`,`description`,`status`,`created_at`,`updated_at`) values (1,'BOM-5G-MACRO',4,'1.0','5G宏站标准配置（BBU+RRU+天线+电源）','active','2026-09-28 16:10:03','2026-09-28 17:58:47'),(2,'BOM-OLT-NODE',6,'1.0','OLT局端节点标准配置','active','2026-09-28 16:10:03','2026-09-28 17:58:47'),(3,'BOM-WLAN-AP',12,'1.0','室内AP安装套件','active','2026-09-28 16:10:03','2026-09-28 17:58:47');

/*Table structure for table `bom_items` */

DROP TABLE IF EXISTS `bom_items`;

CREATE TABLE `bom_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `bom_header_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `quantity` decimal(10,2) NOT NULL DEFAULT '0.00',
  `unit` varchar(20) DEFAULT NULL,
  `notes` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_bom_header_id` (`bom_header_id`),
  KEY `idx_product_id` (`product_id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4;

/*Data for the table `bom_items` */

insert  into `bom_items`(`id`,`bom_header_id`,`product_id`,`quantity`,`unit`,`notes`,`created_at`,`updated_at`) values (1,1,13,'6.00','副','每扇区2副天线','2026-09-28 16:10:03','2026-09-28 16:10:03'),(2,1,16,'6.00','条','BBU-RRU 光纤互联','2026-09-28 16:10:03','2026-09-28 16:10:03'),(3,1,17,'20.00','根','RRU直流供电线','2026-09-28 16:10:03','2026-09-28 16:10:03'),(4,1,14,'2.00','台','整流模块冗余','2026-09-28 16:10:03','2026-09-28 16:10:03'),(5,1,5,'3.00','台','每站3个扇区 RRU','2026-09-28 16:10:03','2026-09-28 16:10:03'),(6,2,16,'16.00','条','ODF 跳线','2026-09-28 16:10:03','2026-09-28 16:10:03'),(7,2,8,'8.00','只','上联+用户板光模块','2026-09-28 16:10:03','2026-09-28 16:10:03'),(8,2,14,'2.00','台','双路供电','2026-09-28 16:10:03','2026-09-28 16:10:03'),(9,3,16,'2.00','条','AP上联光纤','2026-09-28 16:10:03','2026-09-28 16:10:03'),(10,3,17,'1.00','根','POE/本地供电线','2026-09-28 16:10:03','2026-09-28 16:10:03');

/*Table structure for table `bom_masters` */

DROP TABLE IF EXISTS `bom_masters`;

CREATE TABLE `bom_masters` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `bom_code` varchar(50) NOT NULL,
  `name` varchar(100) DEFAULT NULL,
  `product_id` int(11) NOT NULL,
  `version` varchar(20) NOT NULL DEFAULT '1.0',
  `description` text,
  `status` varchar(20) NOT NULL DEFAULT 'draft',
  `effective_date` date DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `notes` text,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`bom_code`),
  KEY `product_id` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/*Data for the table `bom_masters` */

/*Table structure for table `categories` */

DROP TABLE IF EXISTS `categories`;

CREATE TABLE `categories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `code` varchar(20) NOT NULL,
  `parent_id` int(11) DEFAULT NULL,
  `description` text,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `sort_order` int(11) NOT NULL DEFAULT '0',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `parent_id` (`parent_id`)
) ENGINE=InnoDB AUTO_INCREMENT=44 DEFAULT CHARSET=utf8mb4;

/*Data for the table `categories` */

insert  into `categories`(`id`,`name`,`code`,`parent_id`,`description`,`status`,`sort_order`,`created_at`,`updated_at`) values (1,'电子产品','ELEC',NULL,'仅一级分类示例','active',5,'2026-09-28 08:11:48','2026-09-29 14:25:43'),(2,'通信设备','COMM',NULL,'5G/传输/数据通信主设备','active',10,'2026-09-28 08:11:48','2026-09-28 08:11:48'),(3,'无线设备','WIRE',NULL,'天线、AP、射频单元','active',20,'2026-09-28 08:11:48','2026-09-28 08:11:48'),(4,'配件耗材','ACC',NULL,'电源、电池、线缆、辅材','active',50,'2026-09-28 08:11:48','2026-09-28 08:11:48'),(5,'光传输设备','OPT',NULL,'OLT/ONU/光模块','active',30,NULL,NULL),(6,'网络设备','NET',NULL,'路由器、交换机、防火墙','active',40,NULL,NULL),(7,'基站设备','COMM-BS',2,'5G/4G基站主设备','active',11,NULL,NULL),(8,'传输设备','COMM-TR',2,'PTN/OTN/SDH传输设备','active',12,NULL,NULL),(9,'无线AP','WIRE-AP',3,'室内外无线接入点','active',21,NULL,NULL),(10,'天线','WIRE-ANT',3,'全向/定向天线','active',22,NULL,NULL),(11,'射频单元','WIRE-RF',3,'RRU/射频拉远单元','active',23,NULL,NULL),(12,'OLT设备','OPT-OLT',5,'光线路终端','active',31,NULL,NULL),(13,'ONU设备','OPT-ONU',5,'光网络单元','active',32,NULL,NULL),(14,'光模块','OPT-MOD',5,'SFP/SFP28/QSFP光模块','active',33,NULL,NULL),(15,'路由器','NET-RTR',6,'核心/汇聚/接入路由器','active',41,NULL,NULL),(16,'交换机','NET-SW',6,'二层/三层交换机','active',42,NULL,NULL),(17,'防火墙','NET-FW',6,'防火墙/网络安全设备','active',43,NULL,NULL),(18,'电源','ACC-PWR',4,'开关电源/整流模块','active',51,NULL,NULL),(19,'电池','ACC-BAT',4,'蓄电池/锂电池组','active',52,NULL,NULL),(20,'线缆','ACC-CBL',4,'光纤/网线/电源线','active',53,NULL,NULL),(21,'辅材','ACC-MAT',4,'接头/法兰盘/标签等','active',54,NULL,NULL),(38,'手机终端','ELEC-PHONE',1,'智能手机/功能机','active',6,NULL,NULL),(39,'平板电脑','ELEC-TABLET',1,'平板/二合一设备','active',7,NULL,NULL),(40,'笔记本电脑','ELEC-LAPTOP',1,'笔记本/便携PC','active',8,NULL,NULL),(41,'电子配件','ELEC-ACC',1,'充电器/耳机/保护壳','active',9,NULL,NULL),(42,'基站设备','COMM-BASE',2,'','active',0,'2026-09-29 14:25:43','2026-09-29 14:25:43'),(43,'光缆','COMM-CABLE',2,'','active',0,'2026-09-29 14:25:43','2026-09-29 14:25:43');

/*Table structure for table `customers` */

DROP TABLE IF EXISTS `customers`;

CREATE TABLE `customers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(20) NOT NULL,
  `name` varchar(100) NOT NULL,
  `contact_person` varchar(50) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4;

/*Data for the table `customers` */

insert  into `customers`(`id`,`code`,`name`,`contact_person`,`phone`,`email`,`address`,`status`,`created_at`,`updated_at`) values (1,'CUS001','客户A','王五','13800138003','wangwu@customer.com','广州市','active','2026-09-28 08:11:48','2026-09-28 08:11:48'),(2,'CUS002','客户B','赵六','13800138004','zhaoliu@customer.com','深圳市','active','2026-09-28 08:11:48','2026-09-28 08:11:48'),(3,'CUS-CMCC','中国移动XX分公司','刘洋','13900000001','cmcc@example.com','XX市XX区移动大厦','active',NULL,NULL),(4,'CUS-CTC','中国电信XX分公司','孙磊','13900000002','ctc@example.com','XX市XX区电信大楼','active',NULL,NULL),(5,'CUS-CUCC','中国联通XX分公司','周涛','13900000003','cucc@example.com','XX市XX区联通大厦','active',NULL,NULL),(6,'CUS-TOWER','中国铁塔XX分公司','吴迪','13900000004','tower@example.com','XX市XX区铁塔中心','active',NULL,NULL),(7,'CUS-ENG','XX通信工程建设部','郑凯','13900000005','eng@example.com','XX市XX区创业大厦','active',NULL,NULL);

/*Table structure for table `devices` */

DROP TABLE IF EXISTS `devices`;

CREATE TABLE `devices` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `device_code` varchar(50) NOT NULL,
  `device_name` varchar(200) NOT NULL,
  `device_type` varchar(50) NOT NULL,
  `model` varchar(100) DEFAULT NULL,
  `brand` varchar(50) DEFAULT NULL,
  `serial_number` varchar(100) NOT NULL,
  `product_id` int(11) DEFAULT NULL COMMENT '迁移后归属物资',
  `migrated_at` datetime DEFAULT NULL COMMENT '迁移时间',
  `status` enum('active','maintenance','inactive','scrapped') NOT NULL DEFAULT 'active',
  `location` varchar(200) DEFAULT NULL,
  `purchase_date` date DEFAULT NULL,
  `warranty_period` int(11) DEFAULT '0',
  `warranty_end_date` date DEFAULT NULL,
  `notes` text,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_device_code` (`device_code`),
  UNIQUE KEY `unique_serial_number` (`serial_number`),
  KEY `idx_migrated_at` (`migrated_at`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4;

/*Data for the table `devices` */

insert  into `devices`(`id`,`device_code`,`device_name`,`device_type`,`model`,`brand`,`serial_number`,`product_id`,`migrated_at`,`status`,`location`,`purchase_date`,`warranty_period`,`warranty_end_date`,`notes`,`created_at`,`updated_at`,`deleted_at`) values (1,'DEV-001','5G基站设备','基站设备','AAU5613','华为','HW202401001',18,'2026-09-29 08:00:51','active','机房A-01','2024-01-15',36,'2027-01-15','5G基站主设备','2026-09-28 08:11:48','2026-09-28 08:11:48',NULL),(2,'DEV-002','光纤交换机','网络设备','S5720-28X-SI','华为','HW202401002',19,'2026-09-29 08:00:51','maintenance','机房B-02','2024-01-10',24,'2026-01-10','核心交换设备','2026-09-28 08:11:48','2026-09-28 08:11:48',NULL),(3,'DEV-003','路由器设备','网络设备','AR6280','华为','HW202401003',20,'2026-09-29 08:00:51','active','机房A-03','2024-01-20',24,'2026-01-20','核心路由设备','2026-09-28 08:11:48','2026-09-28 08:11:48',NULL),(4,'DEV-004','光模块','光传输设备','SFP-10G-LR','华为','HW202401004',21,'2026-09-29 08:00:51','active','机房C-01','2024-01-25',12,'2025-01-25','10G光模块','2026-09-28 08:11:48','2026-09-28 08:11:48',NULL),(5,'DEV-005','中兴基站','基站设备','AAU5613','中兴','ZTE202401001',22,'2026-09-29 08:00:51','inactive','机房D-01','2023-12-01',36,'2026-12-01','中兴5G基站设备','2026-09-28 08:11:48','2026-09-28 08:11:48',NULL),(6,'DEV-5G-001','5G BBU基带单元','基站设备','BBU5900','华为','SN-BBU-2026-0001',4,'2026-09-29 08:00:51','active','A区-01','2026-01-05',36,'2029-01-05','5G三期在网运行','2026-01-05 09:30:00','2026-09-28 17:58:47',NULL),(7,'DEV-5G-002','5G BBU基带单元','基站设备','BBU5900','华为','SN-BBU-2026-0002',4,'2026-09-29 08:00:51','active','A区-01','2026-01-05',36,'2029-01-05','5G三期在网运行','2026-01-05 09:30:00','2026-09-28 17:58:47',NULL),(8,'DEV-5G-003','RRU射频拉远单元','基站设备','RRU3971','华为','SN-RRU-2026-0011',5,'2026-09-29 08:00:51','active','C区-01','2026-01-05',36,'2029-01-05','已交付安装','2026-01-05 09:30:00','2026-09-28 17:58:47',NULL),(9,'DEV-5G-004','RRU射频拉远单元','基站设备','RRU3971','华为','SN-RRU-2026-0012',5,'2026-09-29 08:00:51','maintenance','维修区-R01','2026-01-05',36,'2029-01-05','端口异常，返修中','2026-01-05 09:30:00','2026-09-28 17:58:47',NULL),(10,'DEV-5G-005','RRU射频拉远单元','基站设备','RRU3971','华为','SN-RRU-2026-0013',5,'2026-09-29 08:00:51','inactive','暂苔区-T01','2026-01-05',36,'2029-01-05','暂不用，封存待调拨','2026-01-05 09:30:00','2026-09-28 17:58:47',NULL),(11,'DEV-OPT-001','OLT光线路终端','光传输设备','MA5683T','华为','SN-OLT-2026-0001',6,'2026-09-29 08:00:51','active','B区-01','2026-01-12',36,'2029-01-12','乡镇局端已上线','2026-01-12 10:15:00','2026-09-28 17:58:47',NULL),(12,'DEV-OPT-002','OLT光线路终端','光传输设备','MA5683T','华为','SN-OLT-2026-0002',6,'2026-09-29 08:00:51','active','B区-01','2026-01-12',36,'2029-01-12','备用局端','2026-01-12 10:15:00','2026-09-28 17:58:47',NULL),(13,'DEV-OPT-003','25G SFP28光模块','光传输设备','SFP28-25G-LR','华为','SN-SFP28-2026-0101',8,'2026-09-29 08:00:51','active','B区-02','2026-02-03',12,'2027-02-03','已收120只批次中的代表件','2026-02-03 14:20:00','2026-09-28 17:58:47',NULL),(14,'DEV-NET-001','千兆接入交换机','网络设备','S5720-28X-SI','华为','SN-SW-2026-0001',9,'2026-09-29 08:00:51','active','A区-02','2025-11-01',36,'2028-11-01','园区项目在用','2025-11-01 10:00:00','2026-09-28 17:58:47',NULL),(15,'DEV-NET-002','下一代防火墙','网络安全设备','USG6525E','华为','SN-FW-2026-0001',10,'2026-09-29 08:00:51','active','A区-01','2026-03-20',36,'2029-03-20','边界安全防护网关','2026-03-20 09:05:00','2026-09-28 17:58:47',NULL),(16,'DEV-NET-003','核心路由器','网络设备','NE40E-M2K','华为','SN-RTR-2026-0001',11,'2026-09-29 08:00:51','active','A区-02','2026-03-20',36,'2029-03-20','城域网汇聚节点','2026-03-20 09:05:00','2026-09-28 17:58:47',NULL),(17,'DEV-NET-004','核心路由器','网络设备','NE40E-M2K','华为','SN-RTR-2026-0002',11,'2026-09-29 08:00:51','maintenance','维修区-R01','2026-03-20',36,'2029-03-20','风扇告警待更换','2026-03-20 09:05:00','2026-09-28 17:58:47',NULL),(18,'DEV-WIR-001','WiFi6无线AP','无线设备','AirEngine5760-10','华为','SN-AP-2026-0001',12,'2026-09-29 08:00:51','active','C区-02','2025-11-20',36,'2028-11-20','室内放装型','2025-11-20 10:00:00','2026-09-28 17:58:47',NULL),(19,'DEV-WIR-002','WiFi6无线AP','无线设备','AirEngine5760-10','华为','SN-AP-2026-0002',12,'2026-09-29 08:00:51','active','C区-02','2025-11-20',36,'2028-11-20','室内放装型','2025-11-20 10:00:00','2026-09-28 17:58:47',NULL),(20,'DEV-WIR-003','700MHz定向天线','无线设备','ANT700M-17','华为','SN-ANT-2026-0001',13,'2026-09-29 08:00:51','active','E区-01','2026-04-02',24,'2028-04-02','低频定向天线','2026-04-02 15:30:00','2026-09-28 17:58:47',NULL),(21,'DEV-PWR-001','通信直流电源模块','配件耗材','EPU4840','中兴','SN-PWR-2026-0001',14,'2026-09-29 08:00:51','active','D区-02','2025-11-01',24,'2027-11-01','-48V整流模块','2025-11-01 10:00:00','2026-09-28 17:58:47',NULL),(22,'DEV-PWR-002','磷酸铁锂备电电池','配件耗材','BAT-48V50AH','中兴','SN-BAT-2026-0001',15,'2026-09-29 08:00:51','active','D区-02','2025-11-01',36,'2028-11-01','备电电池组','2025-11-01 10:00:00','2026-09-28 17:58:47',NULL),(23,'DEV-SCR-001','老旧光猫终端','光传输设备','HG8245C','华为','SN-EOL-2019-0088',23,'2026-09-29 08:00:51','scrapped','报废区','2019-06-01',36,'2022-06-01','超期服役已报废','2019-06-01 10:00:00','2026-09-28 17:58:47',NULL);

/*Table structure for table `dictionary_items` */

DROP TABLE IF EXISTS `dictionary_items`;

CREATE TABLE `dictionary_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `type_id` int(11) NOT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `value` varchar(255) DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT '0',
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_type_code` (`type_id`,`code`),
  KEY `idx_type_id` (`type_id`)
) ENGINE=InnoDB AUTO_INCREMENT=76 DEFAULT CHARSET=utf8mb4;

/*Data for the table `dictionary_items` */

insert  into `dictionary_items`(`id`,`type_id`,`code`,`name`,`value`,`sort_order`,`status`,`created_at`,`updated_at`) values (1,1,'5g-base','5G基站',NULL,1,'active','2026-09-28 08:11:48','2026-09-28 08:11:48'),(2,1,'core-network','核心网设备',NULL,2,'active','2026-09-28 08:11:48','2026-09-28 08:11:48'),(3,1,'optical','光传输设备',NULL,3,'active','2026-09-28 08:11:48','2026-09-28 08:11:48'),(4,1,'router','路由器',NULL,4,'active','2026-09-28 08:11:48','2026-09-28 08:11:48'),(5,1,'switch','交换机',NULL,5,'active','2026-09-28 08:11:48','2026-09-28 08:11:48'),(6,2,'model-a1','Model A1',NULL,1,'active','2026-09-28 08:11:48','2026-09-28 08:11:48'),(7,2,'model-b2','Model B2',NULL,2,'active','2026-09-28 08:11:48','2026-09-28 08:11:48'),(8,3,'huawei','华为',NULL,1,'active','2026-09-28 08:11:48','2026-09-28 08:11:48'),(9,3,'zte','中兴',NULL,2,'active','2026-09-28 08:11:48','2026-09-28 08:11:48'),(10,4,'normal','正常',NULL,1,'active','2026-09-28 08:11:48','2026-09-28 08:11:48'),(11,4,'maintenance','维护中',NULL,2,'active','2026-09-28 08:11:48','2026-09-28 08:11:48'),(12,4,'fault','故障',NULL,3,'active','2026-09-28 08:11:48','2026-09-28 08:11:48'),(13,4,'scrapped','已报废',NULL,4,'inactive','2026-09-28 08:11:48','2026-09-28 08:11:48'),(14,5,'pcs','台','台',1,'active',NULL,NULL),(15,5,'pcs2','只','只',2,'active',NULL,NULL),(16,5,'set','套','套',3,'active',NULL,NULL),(17,5,'pcs3','组','组',4,'active',NULL,NULL),(18,5,'pcs4','条','条',5,'active',NULL,NULL),(19,5,'pcs5','根','根',6,'active',NULL,NULL),(20,5,'pcs6','副','副',7,'active',NULL,NULL),(21,6,'zone-a','A区·核心网络','A区',1,'active',NULL,NULL),(22,6,'zone-b','B区·传输接入','B区',2,'active',NULL,NULL),(23,6,'zone-c','C区·无线终端','C区',3,'active',NULL,NULL),(24,6,'zone-d','D区·备件耗材','D区',4,'active',NULL,NULL),(25,6,'zone-r','维修区','维修区',5,'active',NULL,NULL),(26,6,'zone-t','暂存区','暂存区',6,'active',NULL,NULL),(27,7,'low','低','low',1,'active',NULL,NULL),(28,7,'normal','普通','normal',2,'active',NULL,NULL),(29,7,'high','高','high',3,'active',NULL,NULL),(30,7,'urgent','紧急','urgent',4,'active',NULL,NULL),(31,8,'damage','设备损坏','damage',1,'active',NULL,NULL),(32,8,'obsolete','技术淘汰','obsolete',2,'active',NULL,NULL),(33,8,'expired','超期使用','expired',3,'active',NULL,NULL),(34,8,'other','其他原因','other',4,'active',NULL,NULL),(35,9,'planning','规划中','planning',1,'active',NULL,NULL),(36,9,'executing','执行中','executing',2,'active',NULL,NULL),(37,9,'completed','已完成','completed',3,'active',NULL,NULL),(38,9,'cancelled','已取消','cancelled',4,'active',NULL,NULL),(39,10,'5g','5G','5G',1,'active',NULL,NULL),(40,10,'4g','4G','4G',2,'active',NULL,NULL),(41,10,'3g','3G','3G',3,'active',NULL,NULL),(42,10,'2g','2G','2G',4,'active',NULL,NULL),(43,10,'other','其他','other',5,'active',NULL,NULL),(44,5,'ge','个',NULL,2,'active',NULL,NULL),(45,5,'tai','台',NULL,3,'active',NULL,NULL),(46,5,'meter','米',NULL,5,'active',NULL,NULL),(47,5,'ton','吨',NULL,6,'active',NULL,NULL),(48,5,'kg','千克',NULL,7,'active',NULL,NULL),(49,5,'sqm','平方米',NULL,8,'active',NULL,NULL),(50,5,'roll','卷',NULL,9,'active',NULL,NULL),(51,5,'coil','盘',NULL,10,'active',NULL,NULL),(52,5,'pair','对',NULL,11,'active',NULL,NULL),(53,5,'box','箱',NULL,12,'active',NULL,NULL),(54,5,'zhi','只',NULL,13,'active',NULL,NULL),(55,5,'group','组',NULL,14,'active',NULL,NULL),(56,5,'strip','条',NULL,15,'active',NULL,NULL),(57,5,'gen','根',NULL,16,'active',NULL,NULL),(58,5,'fu','副',NULL,17,'active',NULL,NULL),(61,12,'count','计件（件/个/台/套）','count',1,'active',NULL,NULL),(62,12,'length','长度（米）','length',2,'active',NULL,NULL),(63,12,'weight','重量（吨/千克）','weight',3,'active',NULL,NULL),(64,12,'area','面积（平方米）','area',4,'active',NULL,NULL),(65,12,'volume','体积','volume',5,'active',NULL,NULL),(66,11,'purchase','采购入库',NULL,1,'active',NULL,NULL),(67,11,'transfer_in','调拨入库',NULL,2,'active',NULL,NULL),(68,11,'return_in','归还入库',NULL,3,'active',NULL,NULL),(69,11,'project_return','项目退回',NULL,4,'active',NULL,NULL),(70,11,'borrow_return','借用归还',NULL,5,'active',NULL,NULL),(71,11,'inventory_gain','盘盈',NULL,6,'active',NULL,NULL),(72,11,'other','其他',NULL,7,'active',NULL,NULL),(73,4,'in_use','正在用',NULL,1,'active',NULL,NULL),(74,4,'repairing','返修中',NULL,2,'active',NULL,NULL),(75,4,'to_scrap','待报废',NULL,3,'active',NULL,NULL);

/*Table structure for table `dictionary_types` */

DROP TABLE IF EXISTS `dictionary_types`;

CREATE TABLE `dictionary_types` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4;

/*Data for the table `dictionary_types` */

insert  into `dictionary_types`(`id`,`code`,`name`,`description`,`status`,`created_at`,`updated_at`) values (1,'device_type','设备类型','设备类型字典','active','2026-09-28 08:11:48','2026-09-28 08:11:48'),(2,'device_model','设备型号','设备型号字典','active','2026-09-28 08:11:48','2026-09-28 08:11:48'),(3,'device_brand','设备品牌','设备品牌字典','active','2026-09-28 08:11:48','2026-09-28 08:11:48'),(4,'device_status','设备状态','设备状态字典','active','2026-09-28 08:11:48','2026-09-28 08:11:48'),(5,'unit','计量单位','物料计量单位','active',NULL,NULL),(6,'device_location','存放区域','设备/物料存放区域','active',NULL,NULL),(7,'order_priority','单据优先级','出入库单优先级','active',NULL,NULL),(8,'scrap_reason','报废原因','报废申请原因分类','active',NULL,NULL),(9,'project_status','项目状态','项目生命周期状态','active',NULL,NULL),(10,'wireless_type','无线备件类型','无线备件网络制式','active',NULL,NULL),(11,'inbound_source','入库来源','入库单来源字典','active',NULL,NULL),(12,'measure_type','计量方式','物资计量方式（计件/长度/重量等），驱动数量精度与序列号要求','active',NULL,NULL);

/*Table structure for table `inbound_order_items` */

DROP TABLE IF EXISTS `inbound_order_items`;

CREATE TABLE `inbound_order_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `inbound_order_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `unit` varchar(20) DEFAULT NULL COMMENT '单位快照(过账时固化，避免主数据变更导致历史语义漂移)',
  `location_id` int(11) DEFAULT NULL,
  `quantity` decimal(18,4) unsigned NOT NULL DEFAULT '0.0000' COMMENT '入库数量',
  `received_quantity` decimal(18,4) unsigned NOT NULL DEFAULT '0.0000' COMMENT '实收数量',
  `unit_price` decimal(18,4) unsigned NOT NULL DEFAULT '0.0000' COMMENT '单价',
  `batch_number` varchar(50) DEFAULT '',
  `expiry_date` date DEFAULT NULL,
  `requires_serial` tinyint(1) NOT NULL DEFAULT '0',
  `notes` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `inbound_order_id` (`inbound_order_id`),
  KEY `product_id` (`product_id`)
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4;

/*Data for the table `inbound_order_items` */

insert  into `inbound_order_items`(`id`,`inbound_order_id`,`product_id`,`unit`,`location_id`,`quantity`,`received_quantity`,`unit_price`,`batch_number`,`expiry_date`,`requires_serial`,`notes`,`created_at`,`updated_at`) values (1,1,1,NULL,4,'5.0000','0.0000','100.0000','',NULL,0,'','2026-09-28 11:26:49','2026-09-28 11:26:49'),(2,2,1,NULL,4,'7.0000','0.0000','100.0000','',NULL,0,'','2026-09-28 11:31:11','2026-09-28 11:31:11'),(3,3,1,NULL,4,'7.0000','0.0000','100.0000','',NULL,0,'','2026-09-28 11:36:38','2026-09-28 11:36:38'),(4,4,1,NULL,4,'7.0000','0.0000','100.0000','',NULL,0,'','2026-09-28 11:39:00','2026-09-28 11:39:00'),(5,5,1,NULL,4,'7.0000','0.0000','100.0000','',NULL,0,'','2026-09-28 11:54:15','2026-09-28 11:54:15'),(6,6,1,NULL,4,'7.0000','0.0000','100.0000','',NULL,0,'','2026-09-28 12:16:20','2026-09-28 12:16:20'),(7,7,1,NULL,1,'7.0000','7.0000','100.0000','',NULL,0,'','2026-09-28 12:20:39','2026-09-28 12:20:40'),(8,8,1,NULL,1,'7.0000','7.0000','100.0000','',NULL,0,'','2026-09-28 12:22:18','2026-09-28 12:22:19'),(9,9,1,NULL,1,'7.0000','7.0000','100.0000','',NULL,0,'','2026-09-28 13:20:08','2026-09-28 13:20:09'),(10,14,16,NULL,6,'2000.0000','0.0000','16.0000','B20260220',NULL,0,'辅材未到','2026-02-18 11:00:00','2026-02-18 11:00:00'),(11,11,4,NULL,8,'10.0000','10.0000','61200.0000','B20260103',NULL,1,'含主控板本期到货','2026-01-05 09:30:00','2026-01-05 09:30:00'),(12,10,11,NULL,9,'2.0000','2.0000','106000.0000','B20260318',NULL,1,'城域网汇聚路由','2026-03-20 09:05:00','2026-03-20 09:05:00'),(13,11,5,NULL,10,'30.0000','30.0000','19600.0000','B20260103',NULL,1,'宏站射频单元','2026-01-05 09:30:00','2026-01-05 09:30:00'),(14,12,8,NULL,12,'200.0000','120.0000','880.0000','B20260201',NULL,0,'已收120只，其余在途','2026-02-03 14:20:00','2026-02-03 14:20:00'),(15,13,6,NULL,13,'5.0000','5.0000','42000.0000','B20260110',NULL,1,'局端OLT','2026-01-12 10:15:00','2026-01-12 10:15:00'),(16,15,13,NULL,15,'60.0000','60.0000','1880.0000','B20260401',NULL,0,'低频天线','2026-04-02 15:30:00','2026-04-02 15:30:00'),(17,16,9,NULL,16,'20.0000','0.0000','4300.0000','B20260308',NULL,1,'园区项目备件','2026-03-05 16:40:00','2026-03-05 16:40:00'),(18,14,17,NULL,19,'500.0000','0.0000','62.0000','B20260220',NULL,0,'辅材未到','2026-02-18 11:00:00','2026-02-18 11:00:00'),(19,10,10,NULL,21,'4.0000','4.0000','15000.0000','B20260318',NULL,1,'边界防火墙','2026-03-20 09:05:00','2026-03-20 09:05:00'),(20,12,12,NULL,23,'300.0000','0.0000','720.0000','B20260201',NULL,1,'待质检','2026-02-03 14:20:00','2026-02-03 14:20:00'),(21,13,7,NULL,26,'800.0000','800.0000','245.0000','B20260110',NULL,0,'家庭侧终端批量','2026-01-12 10:15:00','2026-01-12 10:15:00'),(22,15,5,NULL,28,'20.0000','20.0000','19600.0000','B20260401',NULL,1,'农网补点 RRU','2026-04-02 15:30:00','2026-04-02 15:30:00'),(23,16,12,NULL,29,'100.0000','0.0000','720.0000','B20260308',NULL,1,'无线覆盖一期待发','2026-03-05 16:40:00','2026-03-05 16:40:00'),(24,17,14,NULL,42,'40.0000','0.0000','2900.0000','B20260420',NULL,1,'电源模块备货','2026-04-16 08:50:00','2026-04-16 08:50:00'),(25,17,15,NULL,42,'30.0000','0.0000','3480.0000','B20260420',NULL,0,'备电电池','2026-04-16 08:50:00','2026-04-16 08:50:00'),(26,19,18,'台',NULL,'2.0000','0.0000','1.2000','',NULL,1,'','2026-09-29 08:26:05','2026-09-29 08:26:05'),(27,20,1,'台',4,'2.0000','2.0000','100.0000','',NULL,1,'','2026-09-29 15:58:44','2026-09-29 15:59:26'),(29,22,1,'台',NULL,'1.0000','0.0000','100.0000','',NULL,1,'','2026-09-29 15:59:26','2026-09-29 15:59:26'),(30,28,2,'个',4,'100.0000','100.0000','0.0000','BULK-01',NULL,0,'','2026-09-29 16:46:11','2026-09-29 16:46:12'),(31,29,2,'个',4,'50.0000','50.0000','0.0000','BULK-02',NULL,0,'','2026-09-29 16:46:13','2026-09-29 16:46:14');

/*Table structure for table `inbound_orders` */

DROP TABLE IF EXISTS `inbound_orders`;

CREATE TABLE `inbound_orders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_number` varchar(50) NOT NULL,
  `warehouse_id` int(11) NOT NULL,
  `supplier_id` int(11) DEFAULT NULL,
  `source` varchar(30) NOT NULL DEFAULT 'purchase' COMMENT '入库来源(字典 inbound_source)',
  `transfer_from` varchar(120) DEFAULT NULL COMMENT '调出仓库/地点（从哪里调拨）',
  `transfer_remark` varchar(500) DEFAULT NULL COMMENT '调拨说明（无设备编号调拨须注明从哪到哪、依据）',
  `handler_name` varchar(50) DEFAULT NULL COMMENT '经手人姓名',
  `handler_phone` varchar(30) DEFAULT NULL COMMENT '经手人电话',
  `operator_id` int(11) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `type` varchar(20) NOT NULL DEFAULT 'purchase',
  `expected_date` date DEFAULT NULL,
  `received_date` date DEFAULT NULL,
  `received_at` datetime DEFAULT NULL COMMENT '入库时间(业务发生时间)',
  `notes` text,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL COMMENT '归档时间（软删除）',
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_number` (`order_number`),
  KEY `warehouse_id` (`warehouse_id`),
  KEY `supplier_id` (`supplier_id`),
  KEY `idx_deleted_at` (`deleted_at`),
  KEY `idx_source` (`source`)
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4;

/*Data for the table `inbound_orders` */

insert  into `inbound_orders`(`id`,`order_number`,`warehouse_id`,`supplier_id`,`source`,`transfer_from`,`transfer_remark`,`handler_name`,`handler_phone`,`operator_id`,`created_by`,`status`,`type`,`expected_date`,`received_date`,`received_at`,`notes`,`created_at`,`updated_at`,`deleted_at`) values (1,'IN202609280001',1,1,'purchase',NULL,NULL,NULL,NULL,1,NULL,'pending','purchase','2026-10-01',NULL,NULL,'','2026-09-28 11:26:49','2026-09-28 11:26:49',NULL),(2,'IN202609280002',1,1,'purchase',NULL,NULL,NULL,NULL,1,NULL,'pending','purchase','2026-10-01',NULL,NULL,'','2026-09-28 11:31:11','2026-09-28 11:31:11',NULL),(3,'IN202609280003',1,1,'purchase',NULL,NULL,NULL,NULL,1,NULL,'pending','purchase','2026-10-01',NULL,NULL,'','2026-09-28 11:36:38','2026-09-28 11:36:38',NULL),(4,'IN202609280004',1,1,'purchase',NULL,NULL,NULL,NULL,1,NULL,'pending','purchase','2026-10-01',NULL,NULL,'','2026-09-28 11:39:00','2026-09-29 07:57:27',NULL),(5,'IN202609280005',1,1,'purchase',NULL,NULL,NULL,NULL,1,2,'completed','purchase','2026-10-01','2026-09-28','2026-09-28 00:00:00','','2026-09-28 11:54:15','2026-09-28 11:54:16',NULL),(6,'IN202609280006',1,1,'purchase',NULL,NULL,NULL,NULL,1,2,'completed','purchase','2026-10-01','2026-09-28','2026-09-28 00:00:00','','2026-09-28 12:16:20','2026-09-28 12:16:21',NULL),(7,'IN202609280007',1,1,'purchase',NULL,NULL,NULL,NULL,1,2,'completed','purchase','2026-10-01','2026-09-28','2026-09-28 00:00:00','','2026-09-28 12:20:39','2026-09-28 12:20:40',NULL),(8,'IN202609280008',1,1,'purchase',NULL,NULL,NULL,NULL,1,2,'completed','purchase','2026-10-01','2026-09-28','2026-09-28 00:00:00','','2026-09-28 12:22:18','2026-09-28 12:22:20',NULL),(9,'IN202609280009',1,1,'purchase',NULL,NULL,NULL,NULL,1,2,'completed','purchase','2026-10-01','2026-09-28','2026-09-28 00:00:00','','2026-09-28 13:20:08','2026-09-28 13:20:09',NULL),(10,'IN202603200006',1,6,'purchase',NULL,NULL,NULL,NULL,1,1,'completed','purchase','2026-03-18','2026-03-20','2026-03-20 00:00:00','核心路由与防火墙到货','2026-03-20 09:05:00','2026-03-20 09:05:00',NULL),(11,'IN202601050001',1,3,'purchase',NULL,NULL,NULL,NULL,1,1,'completed','purchase','2026-01-03','2026-01-05','2026-01-05 00:00:00','5G三期首批到货，验收通过','2026-01-05 09:30:00','2026-01-05 09:30:00',NULL),(12,'IN202602030003',1,3,'purchase',NULL,NULL,NULL,NULL,2,2,'receiving','purchase','2026-02-01',NULL,NULL,'光模块与AP验收中，待质检','2026-02-03 14:20:00','2026-02-03 14:20:00',NULL),(13,'IN202601120002',1,4,'purchase',NULL,NULL,NULL,NULL,4,4,'completed','purchase','2026-01-10','2026-01-12','2026-01-12 00:00:00','宽带光网OLT/ONU到货','2026-01-12 10:15:00','2026-01-12 10:15:00',NULL),(14,'IN202602180004',2,5,'purchase',NULL,NULL,NULL,NULL,3,3,'pending','purchase','2026-02-20',NULL,NULL,'线缆类辅材已下单，未到货','2026-02-18 11:00:00','2026-02-18 11:00:00',NULL),(15,'IN202604020007',2,3,'purchase',NULL,NULL,NULL,NULL,3,3,'completed','purchase','2026-04-01','2026-04-02','2026-04-02 00:00:00','天线与RRU补货','2026-04-02 15:30:00','2026-04-02 15:30:00',NULL),(16,'IN202603050005',3,7,'purchase',NULL,NULL,NULL,NULL,5,5,'pending','purchase','2026-03-08',NULL,NULL,'园区项目备件调拨入库','2026-03-05 16:40:00','2026-03-05 16:40:00',NULL),(17,'IN202604160008',3,4,'purchase',NULL,NULL,NULL,NULL,5,5,'pending','purchase','2026-04-20',NULL,NULL,'电源与电池备电批次','2026-04-16 08:50:00','2026-04-16 08:50:00',NULL),(19,'IN202609290001',1,NULL,'return_in',NULL,NULL,NULL,NULL,1,1,'pending','return','2026-09-29',NULL,'2026-09-29 10:30:00','P8 int ok','2026-09-29 08:26:05','2026-09-29 08:26:05',NULL),(20,'IN202609290002',1,1,'purchase','','','','',1,1,'completed','purchase','2026-09-29','2026-09-29','2026-09-29 10:00:00','P9','2026-09-29 15:58:44','2026-09-29 15:59:28',NULL),(22,'IN202609290004',1,NULL,'other','','','','',1,1,'cancelled','other','2026-09-29',NULL,NULL,'P9-dup\\n取消原因：P9 duplicate test order cleanup','2026-09-29 15:59:26','2026-09-29 16:56:12',NULL),(28,'IN202609290005',1,NULL,'other','','','','',1,1,'completed','other','2026-09-29','2026-09-29','2026-09-29 16:46:12','P9 stage3 bulk test A','2026-09-29 16:46:11','2026-09-29 16:46:13',NULL),(29,'IN202609290006',1,NULL,'other','','','','',1,1,'completed','other','2026-09-29','2026-09-29','2026-09-29 16:46:13','P9 stage3 bulk test B','2026-09-29 16:46:13','2026-09-29 16:46:14',NULL);

/*Table structure for table `inventory` */

DROP TABLE IF EXISTS `inventory`;

CREATE TABLE `inventory` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` int(11) NOT NULL,
  `location_id` int(11) NOT NULL,
  `warehouse_id` int(11) DEFAULT NULL,
  `quantity` decimal(18,4) unsigned NOT NULL DEFAULT '0.0000' COMMENT '库存数量',
  `reserved_quantity` decimal(18,4) unsigned NOT NULL DEFAULT '0.0000' COMMENT '预留数量',
  `available_quantity` decimal(18,4) NOT NULL DEFAULT '0.0000' COMMENT '可用数量',
  `batch_number` varchar(50) DEFAULT '',
  `expiry_date` date DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `product_id` (`product_id`),
  KEY `location_id` (`location_id`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4;

/*Data for the table `inventory` */

insert  into `inventory`(`id`,`product_id`,`location_id`,`warehouse_id`,`quantity`,`reserved_quantity`,`available_quantity`,`batch_number`,`expiry_date`,`created_at`,`updated_at`) values (1,1,1,1,'30.0000','0.0000','30.0000','B20240101',NULL,'2026-09-28 08:11:48','2026-09-29 16:26:12'),(2,2,1,1,'300.0000','0.0000','300.0000','B20240101',NULL,'2026-09-28 08:11:48','2026-09-28 17:58:47'),(3,3,3,2,'15.0000','0.0000','15.0000','B20240102',NULL,'2026-09-28 08:11:48','2026-09-28 17:58:47'),(4,1,1,1,'21.0000','0.0000','21.0000','',NULL,'2026-09-28 12:20:40','2026-09-28 17:58:47'),(5,14,5,1,'60.0000','0.0000','60.0000','B20251101',NULL,'2026-09-28 16:10:04','2026-09-28 17:58:47'),(6,16,6,1,'3240.0000','0.0000','3240.0000','B20251015',NULL,'2026-09-28 16:10:04','2026-09-28 17:58:47'),(7,4,8,1,'6.0000','0.0000','6.0000','B20260103',NULL,'2026-09-28 16:10:04','2026-09-28 17:58:47'),(8,11,9,1,'2.0000','0.0000','2.0000','B20260318',NULL,'2026-09-28 16:10:04','2026-09-28 17:58:47'),(9,5,10,1,'18.0000','0.0000','18.0000','B20260103',NULL,'2026-09-28 16:10:04','2026-09-28 17:58:47'),(10,8,12,1,'120.0000','50.0000','70.0000','B20260201',NULL,'2026-09-28 16:10:04','2026-09-28 17:58:47'),(11,6,13,1,'3.0000','0.0000','3.0000','B20260110',NULL,'2026-09-28 16:10:04','2026-09-28 17:58:47'),(12,13,15,2,'30.0000','0.0000','30.0000','B20260401',NULL,'2026-09-28 16:10:04','2026-09-28 17:58:47'),(13,15,18,1,'40.0000','0.0000','40.0000','B20251101',NULL,'2026-09-28 16:10:04','2026-09-28 17:58:47'),(14,17,19,1,'890.0000','0.0000','890.0000','B20251015',NULL,'2026-09-28 16:10:04','2026-09-28 17:58:47'),(15,10,21,1,'2.0000','0.0000','2.0000','B20260318',NULL,'2026-09-28 16:10:04','2026-09-28 17:58:47'),(16,9,22,1,'24.0000','0.0000','24.0000','B20251101',NULL,'2026-09-28 16:10:04','2026-09-28 17:58:47'),(17,12,23,1,'260.0000','0.0000','260.0000','B20251120',NULL,'2026-09-28 16:10:04','2026-09-28 17:58:47'),(18,7,26,1,'300.0000','0.0000','300.0000','B20260110',NULL,'2026-09-28 16:10:04','2026-09-28 17:58:47'),(19,5,28,2,'20.0000','10.0000','10.0000','B20260401',NULL,'2026-09-28 16:10:04','2026-09-28 17:58:47'),(20,8,31,1,'150.0000','0.0000','150.0000','B20251101',NULL,'2026-09-28 16:10:04','2026-09-28 17:58:47'),(21,1,4,1,'2.0000','0.0000','2.0000','',NULL,'2026-09-29 15:59:26','2026-09-29 16:31:59'),(22,24,4,1,'3.0000','0.0000','0.0000','',NULL,'2026-09-29 20:43:31','2026-09-29 20:43:31'),(23,25,4,1,'120.0000','0.0000','0.0000','',NULL,'2026-09-29 20:43:32','2026-09-29 20:43:32');

/*Table structure for table `inventory_batches` */

DROP TABLE IF EXISTS `inventory_batches`;

CREATE TABLE `inventory_batches` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` int(11) NOT NULL COMMENT '商品ID',
  `warehouse_id` int(11) NOT NULL COMMENT '仓库ID',
  `location_id` int(11) NOT NULL COMMENT '库位ID',
  `batch_no` varchar(50) NOT NULL DEFAULT '' COMMENT '批次号/卷号',
  `initial_quantity` decimal(18,4) unsigned NOT NULL DEFAULT '0.0000' COMMENT '初始数量',
  `remaining_quantity` decimal(18,4) unsigned NOT NULL DEFAULT '0.0000' COMMENT '剩余数量',
  `unit` varchar(20) NOT NULL DEFAULT '' COMMENT '单位快照',
  `status` varchar(20) NOT NULL DEFAULT 'active' COMMENT 'active在用/exhausted已用完',
  `inbound_item_id` int(11) DEFAULT NULL COMMENT '入库明细ID',
  `inbound_order_id` int(11) DEFAULT NULL COMMENT '入库单ID',
  `inbound_at` datetime DEFAULT NULL COMMENT '入库时间（FIFO 排序依据）',
  `notes` varchar(255) DEFAULT '',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_product_wh_batch` (`product_id`,`warehouse_id`,`batch_no`),
  KEY `idx_fifo` (`product_id`,`warehouse_id`,`status`,`inbound_at`),
  KEY `idx_inbound_order` (`inbound_order_id`),
  CONSTRAINT `fk_ib_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='散料批次台账（余量扣减）';

/*Data for the table `inventory_batches` */

/*Table structure for table `inventory_transactions` */

DROP TABLE IF EXISTS `inventory_transactions`;

CREATE TABLE `inventory_transactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` int(11) NOT NULL,
  `location_id` int(11) DEFAULT NULL,
  `inventory_id` int(11) DEFAULT NULL,
  `type` varchar(20) NOT NULL DEFAULT 'in',
  `quantity` decimal(18,4) NOT NULL DEFAULT '0.0000' COMMENT '变动数量(正入负出)',
  `balance_quantity` decimal(18,4) NOT NULL DEFAULT '0.0000' COMMENT '变动后结存',
  `operator_id` int(11) DEFAULT NULL,
  `reason` varchar(255) DEFAULT '',
  `remark` varchar(500) DEFAULT NULL COMMENT '备注（调整/转移说明）',
  `reference_type` varchar(50) DEFAULT 'manual',
  `reference_id` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `product_id` (`product_id`),
  KEY `location_id` (`location_id`)
) ENGINE=InnoDB AUTO_INCREMENT=57 DEFAULT CHARSET=utf8mb4;

/*Data for the table `inventory_transactions` */

insert  into `inventory_transactions`(`id`,`product_id`,`location_id`,`inventory_id`,`type`,`quantity`,`balance_quantity`,`operator_id`,`reason`,`remark`,`reference_type`,`reference_id`,`created_at`) values (1,1,1,NULL,'in','7.0000','0.0000',1,'入库收货',NULL,'inbound_order',7,'2026-09-28 12:20:40'),(2,1,1,NULL,'in','7.0000','0.0000',1,'入库收货',NULL,'inbound_order',8,'2026-09-28 12:22:19'),(3,1,1,NULL,'in','7.0000','0.0000',1,'入库收货',NULL,'inbound_order',9,'2026-09-28 13:20:08'),(4,12,23,17,'check','260.0000','260.0000',1,'期初建账盘点',NULL,'opening',0,'2025-11-20 10:00:00'),(5,16,6,6,'check','3200.0000','3200.0000',1,'期初建账盘点',NULL,'opening',0,'2025-10-15 10:00:00'),(6,17,19,14,'check','900.0000','900.0000',1,'期初建账盘点',NULL,'opening',0,'2025-10-15 10:00:00'),(7,14,5,5,'check','60.0000','60.0000',1,'期初建账盘点',NULL,'opening',0,'2025-11-01 10:00:00'),(8,15,18,13,'check','40.0000','40.0000',1,'期初建账盘点',NULL,'opening',0,'2025-11-01 10:00:00'),(9,9,22,16,'check','24.0000','24.0000',1,'期初建账盘点',NULL,'opening',0,'2025-11-01 10:00:00'),(10,8,31,20,'check','150.0000','150.0000',1,'期初建账盘点',NULL,'opening',0,'2025-11-01 10:00:00'),(11,4,8,7,'in','10.0000','10.0000',4,'按入库单收货入库',NULL,'inbound_order',11,'2026-01-05 09:30:00'),(12,5,10,9,'in','30.0000','30.0000',4,'按入库单收货入库',NULL,'inbound_order',11,'2026-01-05 09:30:00'),(13,6,13,11,'in','5.0000','5.0000',4,'按入库单收货入库',NULL,'inbound_order',13,'2026-01-12 10:15:00'),(14,7,26,18,'in','800.0000','800.0000',4,'按入库单收货入库',NULL,'inbound_order',13,'2026-01-12 10:15:00'),(15,8,12,10,'in','120.0000','120.0000',2,'按入库单收货入库',NULL,'inbound_order',12,'2026-02-03 14:20:00'),(16,10,21,15,'in','4.0000','4.0000',1,'按入库单收货入库',NULL,'inbound_order',10,'2026-03-20 09:05:00'),(17,11,9,8,'in','2.0000','2.0000',1,'按入库单收货入库',NULL,'inbound_order',10,'2026-03-20 09:05:00'),(18,13,15,12,'in','60.0000','60.0000',3,'按入库单收货入库',NULL,'inbound_order',15,'2026-04-02 15:30:00'),(19,5,28,19,'in','20.0000','20.0000',3,'按入库单收货入库',NULL,'inbound_order',15,'2026-04-02 15:30:00'),(26,4,8,7,'out','4.0000','6.0000',4,'按出库单拣货下架',NULL,'outbound_order',1,'2026-02-10 09:15:00'),(27,5,10,9,'out','12.0000','18.0000',4,'按出库单拣货下架',NULL,'outbound_order',1,'2026-02-10 09:15:00'),(28,6,13,11,'out','2.0000','3.0000',1,'按出库单拣货下架',NULL,'outbound_order',2,'2026-03-03 10:40:00'),(29,7,26,18,'out','300.0000','500.0000',1,'按出库单拣货下架',NULL,'outbound_order',2,'2026-03-03 10:40:00'),(30,13,15,12,'out','30.0000','30.0000',3,'按出库单拣货下架',NULL,'outbound_order',8,'2026-04-18 15:30:00'),(31,10,21,15,'out','2.0000','2.0000',1,'按出库单拣货下架',NULL,'outbound_order',5,'2026-05-06 11:20:00'),(32,7,26,18,'out','200.0000','300.0000',2,'按出库单拣货下架',NULL,'outbound_order',3,'2026-05-20 09:45:00'),(33,16,6,6,'adjust','20.0000','3220.0000',5,'季度盘点盘盈，登记入库',NULL,'adjust',0,'2026-06-28 16:00:00'),(34,17,19,14,'out','5.0000','895.0000',5,'季度盘点损耗，核减出库',NULL,'manual_adjust',0,'2026-06-28 16:10:00'),(36,1,1,1,'check','30.0000','30.0000',1,'历史库存补记账，保证库存与流水一致',NULL,'opening',0,'2026-09-28 16:13:57'),(37,2,1,2,'check','300.0000','300.0000',1,'历史库存补记账，保证库存与流水一致',NULL,'opening',0,'2026-09-28 16:13:57'),(38,3,3,3,'check','15.0000','15.0000',1,'历史库存补记账，保证库存与流水一致',NULL,'opening',0,'2026-09-28 16:13:57'),(39,1,1,4,'check','21.0000','21.0000',1,'历史库存补记账，保证库存与流水一致',NULL,'opening',0,'2026-09-28 16:13:57'),(43,16,6,6,'in','20.0000','3240.0000',5,'季度盘点盘盈，登记入库',NULL,'manual_adjust',0,'2026-06-28 16:00:00'),(44,17,19,14,'out','5.0000','890.0000',5,'季度盘点损耗，核减出库',NULL,'manual_adjust',0,'2026-06-28 16:10:00'),(45,1,4,NULL,'in','2.0000','2.0000',1,'入库收货',NULL,'inbound_order',20,'2026-09-29 15:59:26'),(46,1,4,NULL,'out','1.0000','1.0000',1,'出库拣货','','outbound_order',14,'2026-09-29 16:31:55'),(47,1,4,NULL,'out','1.0000','0.0000',1,'出库拣货','','outbound_order',14,'2026-09-29 16:31:56'),(48,1,4,NULL,'in','2.0000','0.0000',0,'出库订单取消回滚',NULL,'outbound_order_cancel',14,'2026-09-29 16:31:59'),(49,2,4,NULL,'in','100.0000','100.0000',1,'入库收货','','inbound_order',28,'2026-09-29 16:46:12'),(50,2,4,NULL,'in','50.0000','50.0000',1,'入库收货','','inbound_order',29,'2026-09-29 16:46:13'),(51,2,4,NULL,'out','100.0000','0.0000',1,'出库拣货','','outbound_order',15,'2026-09-29 16:53:57'),(52,2,4,NULL,'out','20.0000','30.0000',1,'出库拣货','','outbound_order',15,'2026-09-29 16:53:57'),(53,2,4,NULL,'in','100.0000','0.0000',0,'出库订单取消回滚（批次 BULK-01）',NULL,'outbound_order_cancel',15,'2026-09-29 16:53:59'),(54,2,4,NULL,'in','20.0000','0.0000',0,'出库订单取消回滚（批次 BULK-02）',NULL,'outbound_order_cancel',15,'2026-09-29 16:53:59'),(55,24,4,22,'adjust_in','3.0000','3.0000',1,'P10-test','','adjust_order',NULL,'2026-09-29 20:43:31'),(56,25,4,23,'adjust_in','120.0000','120.0000',1,'P10-test','','adjust_order',NULL,'2026-09-29 20:43:31');

/*Table structure for table `locations` */

DROP TABLE IF EXISTS `locations`;

CREATE TABLE `locations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `shelf_id` int(11) NOT NULL,
  `warehouse_id` int(11) DEFAULT NULL,
  `zone_id` int(11) DEFAULT NULL,
  `code` varchar(20) NOT NULL,
  `name` varchar(100) DEFAULT NULL,
  `barcode` varchar(50) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `type` varchar(20) NOT NULL DEFAULT 'storage',
  `status` varchar(20) NOT NULL DEFAULT 'available',
  `created_at` datetime DEFAULT NULL,
  `capacity` int(11) NOT NULL DEFAULT '0',
  `length` decimal(10,3) NOT NULL DEFAULT '0.000',
  `width` decimal(10,3) NOT NULL DEFAULT '0.000',
  `height` decimal(10,3) NOT NULL DEFAULT '0.000',
  `weight_limit` decimal(10,3) NOT NULL DEFAULT '0.000',
  PRIMARY KEY (`id`),
  KEY `shelf_id` (`shelf_id`)
) ENGINE=InnoDB AUTO_INCREMENT=43 DEFAULT CHARSET=utf8mb4;

/*Data for the table `locations` */

insert  into `locations`(`id`,`shelf_id`,`warehouse_id`,`zone_id`,`code`,`name`,`barcode`,`description`,`type`,`status`,`created_at`,`capacity`,`length`,`width`,`height`,`weight_limit`) values (1,1,NULL,NULL,'L-A01','A-01','LOC0001','','storage','available','2026-09-28 08:11:48',0,'0.000','0.000','0.000','0.000'),(2,1,NULL,NULL,'L-A02','A-02','LOC0002','','storage','available','2026-09-28 08:11:48',0,'0.000','0.000','0.000','0.000'),(3,2,NULL,NULL,'L-B01','B-01','LOC0003','','storage','available','2026-09-28 08:11:48',0,'0.000','0.000','0.000','0.000'),(4,1,1,1,'S001-01','S001-01 库位','BC-S001-01',NULL,'storage','available',NULL,200,'0.000','0.000','0.000','0.000'),(5,3,1,4,'S-D-02-01','S-D-02-01 库位','BC-S-D-02-01',NULL,'storage','available',NULL,200,'0.000','0.000','0.000','0.000'),(6,4,1,4,'S-D-01-01','S-D-01-01 库位','BC-S-D-01-01',NULL,'storage','available',NULL,200,'0.000','0.000','0.000','0.000'),(7,5,1,5,'S-T-01-01','S-T-01-01 库位','BC-S-T-01-01',NULL,'storage','available',NULL,200,'0.000','0.000','0.000','0.000'),(8,6,1,6,'S-A-01-01','S-A-01-01 库位','BC-S-A-01-01',NULL,'storage','available',NULL,200,'0.000','0.000','0.000','0.000'),(9,7,1,6,'S-A-02-01','S-A-02-01 库位','BC-S-A-02-01',NULL,'storage','available',NULL,200,'0.000','0.000','0.000','0.000'),(10,8,1,7,'S-C-01-01','S-C-01-01 库位','BC-S-C-01-01',NULL,'storage','available',NULL,200,'0.000','0.000','0.000','0.000'),(11,9,1,8,'S-R-01-01','S-R-01-01 库位','BC-S-R-01-01',NULL,'storage','available',NULL,200,'0.000','0.000','0.000','0.000'),(12,10,1,9,'S-B-02-01','S-B-02-01 库位','BC-S-B-02-01',NULL,'storage','available',NULL,200,'0.000','0.000','0.000','0.000'),(13,11,1,9,'S-B-01-01','S-B-01-01 库位','BC-S-B-01-01',NULL,'storage','available',NULL,200,'0.000','0.000','0.000','0.000'),(14,2,2,2,'S002-01','S002-01 库位','BC-S002-01',NULL,'storage','available',NULL,200,'0.000','0.000','0.000','0.000'),(15,12,2,10,'S-E-01-01','S-E-01-01 库位','BC-S-E-01-01',NULL,'storage','available',NULL,200,'0.000','0.000','0.000','0.000'),(16,13,3,11,'S-F-01-01','S-F-01-01 库位','BC-S-F-01-01',NULL,'storage','available',NULL,200,'0.000','0.000','0.000','0.000'),(17,1,1,1,'S001-02','S001-02 库位','BC-S001-02',NULL,'storage','available',NULL,200,'0.000','0.000','0.000','0.000'),(18,3,1,4,'S-D-02-02','S-D-02-02 库位','BC-S-D-02-02',NULL,'storage','available',NULL,200,'0.000','0.000','0.000','0.000'),(19,4,1,4,'S-D-01-02','S-D-01-02 库位','BC-S-D-01-02',NULL,'storage','available',NULL,200,'0.000','0.000','0.000','0.000'),(20,5,1,5,'S-T-01-02','S-T-01-02 库位','BC-S-T-01-02',NULL,'storage','available',NULL,200,'0.000','0.000','0.000','0.000'),(21,6,1,6,'S-A-01-02','S-A-01-02 库位','BC-S-A-01-02',NULL,'storage','available',NULL,200,'0.000','0.000','0.000','0.000'),(22,7,1,6,'S-A-02-02','S-A-02-02 库位','BC-S-A-02-02',NULL,'storage','available',NULL,200,'0.000','0.000','0.000','0.000'),(23,8,1,7,'S-C-01-02','S-C-01-02 库位','BC-S-C-01-02',NULL,'storage','available',NULL,200,'0.000','0.000','0.000','0.000'),(24,9,1,8,'S-R-01-02','S-R-01-02 库位','BC-S-R-01-02',NULL,'storage','available',NULL,200,'0.000','0.000','0.000','0.000'),(25,10,1,9,'S-B-02-02','S-B-02-02 库位','BC-S-B-02-02',NULL,'storage','available',NULL,200,'0.000','0.000','0.000','0.000'),(26,11,1,9,'S-B-01-02','S-B-01-02 库位','BC-S-B-01-02',NULL,'storage','available',NULL,200,'0.000','0.000','0.000','0.000'),(27,2,2,2,'S002-02','S002-02 库位','BC-S002-02',NULL,'storage','available',NULL,200,'0.000','0.000','0.000','0.000'),(28,12,2,10,'S-E-01-02','S-E-01-02 库位','BC-S-E-01-02',NULL,'storage','available',NULL,200,'0.000','0.000','0.000','0.000'),(29,13,3,11,'S-F-01-02','S-F-01-02 库位','BC-S-F-01-02',NULL,'storage','available',NULL,200,'0.000','0.000','0.000','0.000'),(30,1,1,1,'S001-03','S001-03 库位','BC-S001-03',NULL,'storage','available',NULL,200,'0.000','0.000','0.000','0.000'),(31,3,1,4,'S-D-02-03','S-D-02-03 库位','BC-S-D-02-03',NULL,'storage','available',NULL,200,'0.000','0.000','0.000','0.000'),(32,4,1,4,'S-D-01-03','S-D-01-03 库位','BC-S-D-01-03',NULL,'storage','available',NULL,200,'0.000','0.000','0.000','0.000'),(33,5,1,5,'S-T-01-03','S-T-01-03 库位','BC-S-T-01-03',NULL,'storage','available',NULL,200,'0.000','0.000','0.000','0.000'),(34,6,1,6,'S-A-01-03','S-A-01-03 库位','BC-S-A-01-03',NULL,'storage','available',NULL,200,'0.000','0.000','0.000','0.000'),(35,7,1,6,'S-A-02-03','S-A-02-03 库位','BC-S-A-02-03',NULL,'storage','available',NULL,200,'0.000','0.000','0.000','0.000'),(36,8,1,7,'S-C-01-03','S-C-01-03 库位','BC-S-C-01-03',NULL,'storage','available',NULL,200,'0.000','0.000','0.000','0.000'),(37,9,1,8,'S-R-01-03','S-R-01-03 库位','BC-S-R-01-03',NULL,'storage','available',NULL,200,'0.000','0.000','0.000','0.000'),(38,10,1,9,'S-B-02-03','S-B-02-03 库位','BC-S-B-02-03',NULL,'storage','available',NULL,200,'0.000','0.000','0.000','0.000'),(39,11,1,9,'S-B-01-03','S-B-01-03 库位','BC-S-B-01-03',NULL,'storage','available',NULL,200,'0.000','0.000','0.000','0.000'),(40,2,2,2,'S002-03','S002-03 库位','BC-S002-03',NULL,'storage','available',NULL,200,'0.000','0.000','0.000','0.000'),(41,12,2,10,'S-E-01-03','S-E-01-03 库位','BC-S-E-01-03',NULL,'storage','available',NULL,200,'0.000','0.000','0.000','0.000'),(42,13,3,11,'S-F-01-03','S-F-01-03 库位','BC-S-F-01-03',NULL,'storage','available',NULL,200,'0.000','0.000','0.000','0.000');

/*Table structure for table `operation_log` */

DROP TABLE IF EXISTS `operation_log`;

CREATE TABLE `operation_log` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `operator_id` int(11) DEFAULT NULL COMMENT '操作人ID',
  `action` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '动作，如 create/update/delete/grant:grant',
  `target_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '目标类型',
  `target_id` int(11) DEFAULT NULL COMMENT '目标ID',
  `before` longtext COLLATE utf8mb4_unicode_ci COMMENT '变更前 JSON diff',
  `after` longtext COLLATE utf8mb4_unicode_ci COMMENT '变更后 JSON diff',
  `method` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'HTTP 方法',
  `path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '请求路径',
  `ip` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '来源IP',
  `created_at` datetime DEFAULT NULL COMMENT '操作时间',
  PRIMARY KEY (`id`),
  KEY `idx_operator` (`operator_id`),
  KEY `idx_action` (`action`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=145 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='操作日志（只读）';

/*Data for the table `operation_log` */

insert  into `operation_log`(`id`,`operator_id`,`action`,`target_type`,`target_id`,`before`,`after`,`method`,`path`,`ip`,`created_at`) values (1,2,'post','api',1,NULL,'{\"expected_date\":\"2026-10-01\",\"items\":[{\"quantity\":5,\"product_id\":1,\"unit_price\":100}],\"warehouse_id\":1,\"type\":\"purchase\",\"supplier_id\":1}','POST','api/inbound-orders','127.0.0.1','2026-09-28 11:26:49'),(2,2,'post','api',2,NULL,'{\"expected_date\":\"2026-10-01\",\"items\":[{\"quantity\":7,\"product_id\":1,\"unit_price\":100}],\"warehouse_id\":1,\"type\":\"purchase\",\"supplier_id\":1}','POST','api/inbound-orders','127.0.0.1','2026-09-28 11:31:11'),(3,2,'post','api',3,NULL,'{\"expected_date\":\"2026-10-01\",\"items\":[{\"quantity\":7,\"product_id\":1,\"unit_price\":100}],\"warehouse_id\":1,\"type\":\"purchase\",\"supplier_id\":1}','POST','api/inbound-orders','127.0.0.1','2026-09-28 11:36:37'),(4,2,'post','api',4,NULL,'{\"expected_date\":\"2026-10-01\",\"items\":[{\"quantity\":7,\"product_id\":1,\"unit_price\":100}],\"warehouse_id\":1,\"type\":\"purchase\",\"supplier_id\":1}','POST','api/inbound-orders','127.0.0.1','2026-09-28 11:39:00'),(5,1,'grant:grant','user_warehouse_grant',2,NULL,'{\"grant_role\":\"operator\",\"status\":\"active\",\"granted_by\":1,\"granted_at\":\"2026-09-28 11:39:01\",\"revoked_by\":null,\"revoked_at\":null,\"remark\":\"P7 test\",\"user_id\":2,\"warehouse_id\":2}',NULL,NULL,'127.0.0.1','2026-09-28 11:39:01'),(6,2,'post','api',5,NULL,'{\"expected_date\":\"2026-10-01\",\"items\":[{\"quantity\":7,\"product_id\":1,\"unit_price\":100}],\"warehouse_id\":1,\"type\":\"purchase\",\"supplier_id\":1}','POST','api/inbound-orders','127.0.0.1','2026-09-28 11:54:15'),(7,1,'post','api',5,NULL,'{\"id\":\"5\"}','POST','api/inbound-orders/5/start-receiving','127.0.0.1','2026-09-28 11:54:15'),(8,1,'post','api',5,NULL,'{\"id\":\"5\"}','POST','api/inbound-orders/5/complete','127.0.0.1','2026-09-28 11:54:16'),(9,1,'grant:grant','user_warehouse_grant',2,'{\"user_id\":2,\"warehouse_id\":2,\"grant_role\":\"operator\",\"status\":\"active\",\"granted_by\":1,\"granted_at\":\"2026-09-28 11:39:01\",\"revoked_by\":null,\"revoked_at\":null,\"remark\":\"P7 test\"}','{\"grant_role\":\"operator\",\"status\":\"active\",\"granted_by\":1,\"granted_at\":\"2026-09-28 11:54:16\",\"revoked_by\":null,\"revoked_at\":null,\"remark\":\"P7 test\",\"user_id\":2,\"warehouse_id\":2}',NULL,NULL,'127.0.0.1','2026-09-28 11:54:16'),(10,1,'grant:change_role','user_warehouse_grant',2,'{\"user_id\":2,\"warehouse_id\":2,\"grant_role\":\"operator\",\"status\":\"active\",\"granted_by\":1,\"granted_at\":\"2026-09-28 11:54:16\",\"revoked_by\":null,\"revoked_at\":null,\"remark\":\"P7 test\"}','{\"grant_role\":\"manager\"}',NULL,NULL,'127.0.0.1','2026-09-28 11:54:17'),(11,1,'grant:revoke','user_warehouse_grant',2,'{\"user_id\":2,\"warehouse_id\":2,\"grant_role\":\"manager\",\"status\":\"active\",\"granted_by\":1,\"granted_at\":\"2026-09-28 11:54:16\",\"revoked_by\":null,\"revoked_at\":null,\"remark\":\"P7 test\"}','{\"status\":\"revoked\",\"revoked_by\":1,\"revoked_at\":\"2026-09-28 11:54:17\",\"remark\":\"P7 revoke\"}',NULL,NULL,'127.0.0.1','2026-09-28 11:54:17'),(12,2,'post','api',6,NULL,'{\"expected_date\":\"2026-10-01\",\"items\":[{\"quantity\":7,\"product_id\":1,\"unit_price\":100}],\"warehouse_id\":1,\"type\":\"purchase\",\"supplier_id\":1}','POST','api/inbound-orders','127.0.0.1','2026-09-28 12:16:20'),(13,1,'post','api',6,NULL,'{\"id\":\"6\"}','POST','api/inbound-orders/6/start-receiving','127.0.0.1','2026-09-28 12:16:20'),(14,1,'post','api',6,NULL,'{\"id\":\"6\"}','POST','api/inbound-orders/6/complete','127.0.0.1','2026-09-28 12:16:20'),(15,1,'grant:grant','user_warehouse_grant',2,'{\"user_id\":2,\"warehouse_id\":2,\"grant_role\":\"manager\",\"status\":\"revoked\",\"granted_by\":1,\"granted_at\":\"2026-09-28 11:54:16\",\"revoked_by\":1,\"revoked_at\":\"2026-09-28 11:54:17\",\"remark\":\"P7 revoke\"}','{\"grant_role\":\"operator\",\"status\":\"active\",\"granted_by\":1,\"granted_at\":\"2026-09-28 12:16:21\",\"revoked_by\":null,\"revoked_at\":null,\"remark\":\"P7 test\",\"user_id\":2,\"warehouse_id\":2}',NULL,NULL,'127.0.0.1','2026-09-28 12:16:21'),(16,1,'grant:change_role','user_warehouse_grant',2,'{\"user_id\":2,\"warehouse_id\":2,\"grant_role\":\"operator\",\"status\":\"active\",\"granted_by\":1,\"granted_at\":\"2026-09-28 12:16:21\",\"revoked_by\":null,\"revoked_at\":null,\"remark\":\"P7 test\"}','{\"grant_role\":\"manager\"}',NULL,NULL,'127.0.0.1','2026-09-28 12:16:21'),(17,1,'grant:revoke','user_warehouse_grant',2,'{\"user_id\":2,\"warehouse_id\":2,\"grant_role\":\"manager\",\"status\":\"active\",\"granted_by\":1,\"granted_at\":\"2026-09-28 12:16:21\",\"revoked_by\":null,\"revoked_at\":null,\"remark\":\"P7 test\"}','{\"status\":\"revoked\",\"revoked_by\":1,\"revoked_at\":\"2026-09-28 12:16:22\",\"remark\":\"P7 revoke\"}',NULL,NULL,'127.0.0.1','2026-09-28 12:16:22'),(18,2,'post','api',7,NULL,'{\"expected_date\":\"2026-10-01\",\"items\":[{\"quantity\":7,\"product_id\":1,\"unit_price\":100}],\"warehouse_id\":1,\"type\":\"purchase\",\"supplier_id\":1}','POST','api/inbound-orders','127.0.0.1','2026-09-28 12:20:39'),(19,1,'post','api',7,NULL,'{\"id\":\"7\"}','POST','api/inbound-orders/7/start-receiving','127.0.0.1','2026-09-28 12:20:39'),(20,1,'post','api',7,NULL,'{\"id\":\"7\"}','POST','api/inbound-orders/7/complete','127.0.0.1','2026-09-28 12:20:40'),(21,1,'grant:grant','user_warehouse_grant',2,'{\"user_id\":2,\"warehouse_id\":2,\"grant_role\":\"manager\",\"status\":\"revoked\",\"granted_by\":1,\"granted_at\":\"2026-09-28 12:16:21\",\"revoked_by\":1,\"revoked_at\":\"2026-09-28 12:16:22\",\"remark\":\"P7 revoke\"}','{\"grant_role\":\"operator\",\"status\":\"active\",\"granted_by\":1,\"granted_at\":\"2026-09-28 12:20:40\",\"revoked_by\":null,\"revoked_at\":null,\"remark\":\"P7 test\",\"user_id\":2,\"warehouse_id\":2}',NULL,NULL,'127.0.0.1','2026-09-28 12:20:40'),(22,1,'grant:change_role','user_warehouse_grant',2,'{\"user_id\":2,\"warehouse_id\":2,\"grant_role\":\"operator\",\"status\":\"active\",\"granted_by\":1,\"granted_at\":\"2026-09-28 12:20:40\",\"revoked_by\":null,\"revoked_at\":null,\"remark\":\"P7 test\"}','{\"grant_role\":\"manager\"}',NULL,NULL,'127.0.0.1','2026-09-28 12:20:41'),(23,1,'grant:revoke','user_warehouse_grant',2,'{\"user_id\":2,\"warehouse_id\":2,\"grant_role\":\"manager\",\"status\":\"active\",\"granted_by\":1,\"granted_at\":\"2026-09-28 12:20:40\",\"revoked_by\":null,\"revoked_at\":null,\"remark\":\"P7 test\"}','{\"status\":\"revoked\",\"revoked_by\":1,\"revoked_at\":\"2026-09-28 12:20:41\",\"remark\":\"P7 revoke\"}',NULL,NULL,'127.0.0.1','2026-09-28 12:20:41'),(24,2,'post','api',8,NULL,'{\"expected_date\":\"2026-10-01\",\"items\":[{\"quantity\":7,\"product_id\":1,\"unit_price\":100}],\"warehouse_id\":1,\"type\":\"purchase\",\"supplier_id\":1}','POST','api/inbound-orders','127.0.0.1','2026-09-28 12:22:18'),(25,1,'post','api',8,NULL,'{\"id\":\"8\"}','POST','api/inbound-orders/8/start-receiving','127.0.0.1','2026-09-28 12:22:19'),(26,1,'post','api',NULL,NULL,'{\"location_id\":1,\"item_id\":8,\"quantity\":7,\"id\":\"8\"}','POST','api/inbound-orders/8/receive','127.0.0.1','2026-09-28 12:22:19'),(27,1,'post','api',8,NULL,'{\"id\":\"8\"}','POST','api/inbound-orders/8/complete','127.0.0.1','2026-09-28 12:22:19'),(28,1,'grant:grant','user_warehouse_grant',2,'{\"user_id\":2,\"warehouse_id\":2,\"grant_role\":\"manager\",\"status\":\"revoked\",\"granted_by\":1,\"granted_at\":\"2026-09-28 12:20:40\",\"revoked_by\":1,\"revoked_at\":\"2026-09-28 12:20:41\",\"remark\":\"P7 revoke\"}','{\"grant_role\":\"operator\",\"status\":\"active\",\"granted_by\":1,\"granted_at\":\"2026-09-28 12:22:20\",\"revoked_by\":null,\"revoked_at\":null,\"remark\":\"P7 test\",\"user_id\":2,\"warehouse_id\":2}',NULL,NULL,'127.0.0.1','2026-09-28 12:22:20'),(29,1,'grant:change_role','user_warehouse_grant',2,'{\"user_id\":2,\"warehouse_id\":2,\"grant_role\":\"operator\",\"status\":\"active\",\"granted_by\":1,\"granted_at\":\"2026-09-28 12:22:20\",\"revoked_by\":null,\"revoked_at\":null,\"remark\":\"P7 test\"}','{\"grant_role\":\"manager\"}',NULL,NULL,'127.0.0.1','2026-09-28 12:22:20'),(30,1,'grant:revoke','user_warehouse_grant',2,'{\"user_id\":2,\"warehouse_id\":2,\"grant_role\":\"manager\",\"status\":\"active\",\"granted_by\":1,\"granted_at\":\"2026-09-28 12:22:20\",\"revoked_by\":null,\"revoked_at\":null,\"remark\":\"P7 test\"}','{\"status\":\"revoked\",\"revoked_by\":1,\"revoked_at\":\"2026-09-28 12:22:20\",\"remark\":\"P7 revoke\"}',NULL,NULL,'127.0.0.1','2026-09-28 12:22:20'),(31,1,'post','api',1,NULL,'{\"device_id\":\"1\",\"reason_type\":\"damage\",\"description\":\"test image upload\",\"estimated_loss\":\"100\"}','POST','api/scrap','127.0.0.1','2026-09-28 13:15:43'),(32,2,'post','api',9,NULL,'{\"expected_date\":\"2026-10-01\",\"items\":[{\"quantity\":7,\"product_id\":1,\"unit_price\":100}],\"warehouse_id\":1,\"type\":\"purchase\",\"supplier_id\":1}','POST','api/inbound-orders','127.0.0.1','2026-09-28 13:20:07'),(33,1,'post','api',9,NULL,'{\"id\":\"9\"}','POST','api/inbound-orders/9/start-receiving','127.0.0.1','2026-09-28 13:20:08'),(34,1,'post','api',NULL,NULL,'{\"location_id\":1,\"item_id\":9,\"quantity\":7,\"id\":\"9\"}','POST','api/inbound-orders/9/receive','127.0.0.1','2026-09-28 13:20:08'),(35,1,'post','api',9,NULL,'{\"id\":\"9\"}','POST','api/inbound-orders/9/complete','127.0.0.1','2026-09-28 13:20:09'),(36,1,'grant:grant','user_warehouse_grant',2,'{\"user_id\":2,\"warehouse_id\":2,\"grant_role\":\"manager\",\"status\":\"revoked\",\"granted_by\":1,\"granted_at\":\"2026-09-28 12:22:20\",\"revoked_by\":1,\"revoked_at\":\"2026-09-28 12:22:20\",\"remark\":\"P7 revoke\"}','{\"grant_role\":\"operator\",\"status\":\"active\",\"granted_by\":1,\"granted_at\":\"2026-09-28 13:20:09\",\"revoked_by\":null,\"revoked_at\":null,\"remark\":\"P7 test\",\"user_id\":2,\"warehouse_id\":2}',NULL,NULL,'127.0.0.1','2026-09-28 13:20:09'),(37,1,'grant:change_role','user_warehouse_grant',2,'{\"user_id\":2,\"warehouse_id\":2,\"grant_role\":\"operator\",\"status\":\"active\",\"granted_by\":1,\"granted_at\":\"2026-09-28 13:20:09\",\"revoked_by\":null,\"revoked_at\":null,\"remark\":\"P7 test\"}','{\"grant_role\":\"manager\"}',NULL,NULL,'127.0.0.1','2026-09-28 13:20:10'),(38,1,'grant:revoke','user_warehouse_grant',2,'{\"user_id\":2,\"warehouse_id\":2,\"grant_role\":\"manager\",\"status\":\"active\",\"granted_by\":1,\"granted_at\":\"2026-09-28 13:20:09\",\"revoked_by\":null,\"revoked_at\":null,\"remark\":\"P7 test\"}','{\"status\":\"revoked\",\"revoked_by\":1,\"revoked_at\":\"2026-09-28 13:20:10\",\"remark\":\"P7 revoke\"}',NULL,NULL,'127.0.0.1','2026-09-28 13:20:10'),(39,1,'create','inbound_order',11,NULL,'{\"status\":\"completed\",\"note\":\"5G三期首批到货\"}','POST','/api/inbound-orders','127.0.0.1','2026-01-05 09:30:00'),(40,1,'grant:grant','user_warehouse_grant',1,NULL,'{\"grant_role\":\"manager\",\"remark\":\"系统初始化：管理员全量授权\"}','POST','/api/grants','127.0.0.1','2026-01-01 08:00:00'),(41,1,'create','outbound_order',1,NULL,'{\"status\":\"completed\",\"picked\":16}','POST','/api/outbound-orders','127.0.0.1','2026-02-10 09:15:00'),(42,5,'check','inventory',NULL,'{\"quantity\":3200}','{\"quantity\":3220}','POST','/api/inventory/adjust','127.0.0.1','2026-06-28 16:00:00'),(43,5,'create','scrap_application',2,NULL,'{\"status\":\"completed\",\"actual_loss\":320}','POST','/api/scrap','127.0.0.1','2026-01-20 10:00:00'),(44,2,'create','inbound_order',12,NULL,'{\"status\":\"receiving\",\"sku\":\"SKU-OPT-SFP28\"}','POST','/api/inbound-orders','127.0.0.1','2026-02-03 14:20:00'),(45,3,'approve','outbound_order',8,'{\"status\":\"pending\"}','{\"status\":\"shipped\"}','POST','/api/outbound-orders/4/ship','127.0.0.1','2026-04-18 15:30:00'),(46,4,'update','inbound_order',11,'{\"received_quantity\":0}','{\"received_quantity\":10}','PUT','/api/inbound-orders/1','127.0.0.1','2026-01-05 11:00:00'),(47,1,'delete','api',NULL,NULL,'{\"id\":\"4\"}','DELETE','api/inbound-orders/4','127.0.0.1','2026-09-29 07:57:27'),(48,1,'post','api',19,NULL,'{\"expected_date\":\"2026-09-29\",\"source\":\"return_in\",\"notes\":\"P8 int ok\",\"type\":\"return\",\"items\":[{\"quantity\":2,\"product_id\":18,\"unit_price\":1.2}],\"warehouse_id\":1,\"received_at\":\"2026-09-29 10:30:00\"}','POST','api/inbound-orders','127.0.0.1','2026-09-29 08:26:05'),(49,1,'serial_number:update_status','serial_number',25,'{\"status\":\"in_use\"}','{\"status\":\"repairing\"}','PUT','serial-numbers/25','127.0.0.1','2026-09-29 08:40:33'),(50,1,'put','api',25,NULL,'{\"status\":\"repairing\",\"notes\":\"P8 ??????\",\"id\":\"25\"}','PUT','api/serial-numbers/25','127.0.0.1','2026-09-29 08:40:33'),(51,1,'serial_number:update_status','serial_number',25,'{\"status\":\"repairing\"}','{\"status\":\"sold\"}','PUT','serial-numbers/25','127.0.0.1','2026-09-29 08:41:17'),(52,1,'post','api',9,NULL,'{\"receiver_name\":\"??\",\"type\":\"sale\",\"expected_date\":\"2026-09-29\",\"receiver_unit\":\"?????\",\"notes\":\"P8 ??????\",\"items\":[{\"quantity\":2,\"product_id\":1,\"unit_price\":10}],\"warehouse_id\":1,\"receiver_phone\":\"13800001111\",\"shipped_at\":\"2026-09-29 14:20:00\"}','POST','api/outbound-orders','127.0.0.1','2026-09-29 08:41:52'),(53,1,'post','api',24,NULL,'{\"sku\":\"sku-001\",\"name\":\"电阻\",\"description\":\"aa\",\"device_type\":\"aa\",\"model_number\":\"huawei00001\",\"frequency_protocol\":\"5G222222\",\"firmware_version\":null,\"category_id\":\"38\",\"unit\":\"个\",\"measure_type\":\"count\",\"price\":32.6,\"min_stock\":0,\"max_stock\":0,\"barcode\":\"3333333333\",\"status\":\"active\"}','POST','api/products','127.0.0.1','2026-09-29 11:59:51'),(54,1,'delete','api',NULL,NULL,'{\"id\":\"24\"}','DELETE','api/products/24','127.0.0.1','2026-09-29 11:59:57'),(55,1,'post','api',NULL,NULL,'[]','POST','api/products/batch-import','127.0.0.1','2026-09-29 12:15:21'),(56,1,'post','api',28,NULL,'{\"max_stock\":10,\"sku\":\"SNTEST1859\",\"measure_type\":\"count\",\"category_id\":1,\"price\":10,\"warranty_months\":36,\"name\":\"??????\",\"barcode\":\"SN-XYZ-001\",\"min_stock\":0,\"brand\":\"??\",\"production_date\":\"2025-03-12\",\"unit\":\"?\"}','POST','api/products','127.0.0.1','2026-09-29 14:06:07'),(57,1,'put','api',28,NULL,'{\"brand\":\"??\",\"barcode_image\":\"\\/uploads\\/barcodes\\/x.png\",\"warranty_months\":48,\"id\":\"28\"}','PUT','api/products/28','127.0.0.1','2026-09-29 14:06:07'),(58,1,'delete','api',NULL,NULL,'{\"id\":\"28\"}','DELETE','api/products/28','127.0.0.1','2026-09-29 14:06:36'),(59,1,'post','api',NULL,NULL,'[]','POST','api/products/batch-import','127.0.0.1','2026-09-29 14:11:46'),(60,1,'delete','api',NULL,NULL,'{\"id\":\"29\"}','DELETE','api/products/29','127.0.0.1','2026-09-29 14:13:21'),(61,1,'delete','api',NULL,NULL,'{\"id\":\"30\"}','DELETE','api/products/30','127.0.0.1','2026-09-29 14:13:22'),(62,1,'post','api',NULL,NULL,'[]','POST','api/products/batch-import','127.0.0.1','2026-09-29 14:13:23'),(63,1,'delete','api',NULL,NULL,'{\"id\":\"31\"}','DELETE','api/products/31','127.0.0.1','2026-09-29 14:13:50'),(64,1,'delete','api',NULL,NULL,'{\"id\":\"32\"}','DELETE','api/products/32','127.0.0.1','2026-09-29 14:13:50'),(65,1,'post','api',NULL,NULL,'[]','POST','api/products/batch-import','127.0.0.1','2026-09-29 14:17:45'),(66,1,'delete','api',NULL,NULL,'{\"id\":\"33\"}','DELETE','api/products/33','127.0.0.1','2026-09-29 14:18:22'),(67,1,'delete','api',NULL,NULL,'{\"id\":\"34\"}','DELETE','api/products/34','127.0.0.1','2026-09-29 14:18:22'),(68,1,'post','api',NULL,NULL,'[]','POST','api/categories/batch-import','127.0.0.1','2026-09-29 14:25:42'),(69,1,'post','api',NULL,NULL,'[]','POST','api/products/batch-import','127.0.0.1','2026-09-29 14:31:33'),(70,1,'post','api',NULL,NULL,'[]','POST','api/categories/batch-import','127.0.0.1','2026-09-29 14:32:12'),(71,1,'post','api',NULL,NULL,'[]','POST','api/products/batch-import','127.0.0.1','2026-09-29 14:43:43'),(72,1,'put','api',18,NULL,'{\"status\":\"repairing\",\"id\":\"18\"}','PUT','api/products/18','127.0.0.1','2026-09-29 14:50:28'),(73,1,'put','api',18,NULL,'{\"status\":\"to_scrap\",\"id\":\"18\"}','PUT','api/products/18','127.0.0.1','2026-09-29 14:50:28'),(74,1,'put','api',18,NULL,'{\"status\":\"active\",\"id\":\"18\"}','PUT','api/products/18','127.0.0.1','2026-09-29 14:50:28'),(75,1,'post','api',20,NULL,'{\"warehouse_id\":1,\"source\":\"purchase\",\"type\":\"purchase\",\"supplier_id\":1,\"received_at\":\"2026-09-29 10:00:00\",\"expected_date\":\"2026-09-29\",\"notes\":\"P9\",\"items\":[{\"product_id\":1,\"quantity\":2,\"unit_price\":100}]}','POST','api/inbound-orders','127.0.0.1','2026-09-29 15:58:43'),(76,1,'post','api',21,NULL,'{\"source\":\"transfer_in\",\"type\":\"transfer\",\"expected_date\":\"2026-09-29\",\"transfer_remark\":\"?????????,???????,??:???? A\",\"items\":[{\"quantity\":10,\"product_id\":38,\"unit_price\":0}],\"handler_phone\":\"13800000000\",\"warehouse_id\":1,\"handler_name\":\"??\",\"transfer_from\":\"??? WH003\"}','POST','api/inbound-orders','127.0.0.1','2026-09-29 15:58:46'),(77,1,'post','api',20,NULL,'{\"id\":\"20\"}','POST','api/inbound-orders/20/start-receiving','127.0.0.1','2026-09-29 15:59:24'),(78,1,'post','api',NULL,NULL,'{\"serials\":[\"P9TEST-155925-A\",\"P9TEST-155925-B\"],\"quantity\":2,\"item_id\":27,\"location_id\":4,\"id\":\"20\"}','POST','api/inbound-orders/20/receive','127.0.0.1','2026-09-29 15:59:26'),(79,1,'post','api',22,NULL,'{\"expected_date\":\"2026-09-29\",\"source\":\"other\",\"type\":\"other\",\"items\":[{\"quantity\":1,\"product_id\":1,\"unit_price\":100}],\"warehouse_id\":1,\"notes\":\"P9-dup\"}','POST','api/inbound-orders','127.0.0.1','2026-09-29 15:59:26'),(80,1,'post','api',22,NULL,'{\"id\":\"22\"}','POST','api/inbound-orders/22/start-receiving','127.0.0.1','2026-09-29 15:59:26'),(81,1,'post','api',NULL,NULL,'{\"serials\":[\"P9TEST-155925-A\"],\"quantity\":1,\"item_id\":29,\"location_id\":4,\"id\":\"22\"}','POST','api/inbound-orders/22/receive','127.0.0.1','2026-09-29 15:59:27'),(82,1,'post','api',20,NULL,'{\"id\":\"20\"}','POST','api/inbound-orders/20/complete','127.0.0.1','2026-09-29 15:59:27'),(83,1,'post','api',10,NULL,'{\"warehouse_id\":1,\"expected_date\":\"2026-09-29\",\"receiver_unit\":\"P9-verify\",\"receiver_name\":\"tester\",\"type\":\"other\",\"items\":[{\"quantity\":2,\"product_id\":1,\"unit_price\":0}],\"notes\":\"P9-outbound-chain-test\"}','POST','api/outbound-orders','127.0.0.1','2026-09-29 16:22:13'),(84,1,'post','api',10,NULL,'{\"warehouse_id\":\"1\",\"id\":\"10\"}','POST','api/outbound-orders/10/start-picking','127.0.0.1','2026-09-29 16:22:14'),(85,1,'post','api',10,NULL,'{\"warehouse_id\":\"1\",\"reason\":\"P9-test-cleanup\",\"id\":\"10\"}','POST','api/outbound-orders/10/cancel','127.0.0.1','2026-09-29 16:26:12'),(86,1,'post','api',13,NULL,'{\"warehouse_id\":1,\"expected_date\":\"2026-09-29\",\"receiver_unit\":\"P9-verify\",\"receiver_name\":\"tester\",\"type\":\"other\",\"items\":[{\"quantity\":2,\"product_id\":1,\"unit_price\":0}],\"notes\":\"P9-outbound-chain-test-2\"}','POST','api/outbound-orders','127.0.0.1','2026-09-29 16:28:34'),(87,1,'post','api',13,NULL,'{\"warehouse_id\":\"1\",\"id\":\"13\"}','POST','api/outbound-orders/13/start-picking','127.0.0.1','2026-09-29 16:28:35'),(88,1,'post','api',NULL,NULL,'{\"warehouse_id\":\"1\",\"serials\":[\"P9TEST-155925-A\"],\"location_id\":5,\"item_id\":13,\"quantity\":1,\"id\":\"13\"}','POST','api/outbound-orders/13/pick','127.0.0.1','2026-09-29 16:29:56'),(89,1,'post','api',NULL,NULL,'{\"warehouse_id\":\"1\",\"serials\":[\"P9TEST-155925-A\"],\"location_id\":4,\"item_id\":13,\"quantity\":1,\"id\":\"13\"}','POST','api/outbound-orders/13/pick','127.0.0.1','2026-09-29 16:29:57'),(90,1,'post','api',13,NULL,'{\"warehouse_id\":\"1\",\"reason\":\"P9-partial-pick-rollback-test\",\"id\":\"13\"}','POST','api/outbound-orders/13/cancel','127.0.0.1','2026-09-29 16:29:58'),(91,1,'post','api',14,NULL,'{\"warehouse_id\":1,\"expected_date\":\"2026-09-29\",\"receiver_unit\":\"P9-verify\",\"receiver_name\":\"tester\",\"type\":\"other\",\"items\":[{\"quantity\":2,\"product_id\":1,\"unit_price\":0}],\"notes\":\"P9-full-cycle\"}','POST','api/outbound-orders','127.0.0.1','2026-09-29 16:31:54'),(92,1,'post','api',14,NULL,'{\"warehouse_id\":\"1\",\"id\":\"14\"}','POST','api/outbound-orders/14/start-picking','127.0.0.1','2026-09-29 16:31:55'),(93,1,'post','api',NULL,NULL,'{\"warehouse_id\":\"1\",\"serials\":[\"P9TEST-155925-A\"],\"location_id\":4,\"item_id\":14,\"quantity\":1,\"id\":\"14\"}','POST','api/outbound-orders/14/pick','127.0.0.1','2026-09-29 16:31:55'),(94,1,'post','api',NULL,NULL,'{\"warehouse_id\":\"1\",\"serials\":[\"P9TEST-155925-B\"],\"location_id\":4,\"item_id\":14,\"quantity\":1,\"id\":\"14\"}','POST','api/outbound-orders/14/pick','127.0.0.1','2026-09-29 16:31:57'),(95,1,'post','api',14,NULL,'{\"warehouse_id\":\"1\",\"id\":\"14\"}','POST','api/outbound-orders/14/pack','127.0.0.1','2026-09-29 16:31:58'),(96,1,'post','api',14,NULL,'{\"warehouse_id\":\"1\",\"reason\":\"P9-full-cycle-rollback\",\"id\":\"14\"}','POST','api/outbound-orders/14/cancel','127.0.0.1','2026-09-29 16:31:59'),(97,1,'post','api',28,NULL,'{\"warehouse_id\":1,\"expected_date\":\"2026-09-29\",\"source\":\"other\",\"type\":\"other\",\"items\":[{\"quantity\":100,\"product_id\":2,\"batch_number\":\"BULK-01\",\"unit_price\":0}],\"notes\":\"P9 stage3 bulk test A\"}','POST','api/inbound-orders','127.0.0.1','2026-09-29 16:46:11'),(98,1,'post','api',28,NULL,'{\"warehouse_id\":\"1\",\"id\":\"28\"}','POST','api/inbound-orders/28/start-receiving','127.0.0.1','2026-09-29 16:46:12'),(99,1,'post','api',NULL,NULL,'{\"warehouse_id\":\"1\",\"location_id\":4,\"item_id\":30,\"batch_number\":\"BULK-01\",\"quantity\":100,\"id\":\"28\"}','POST','api/inbound-orders/28/receive','127.0.0.1','2026-09-29 16:46:12'),(100,1,'post','api',28,NULL,'{\"warehouse_id\":\"1\",\"id\":\"28\"}','POST','api/inbound-orders/28/complete','127.0.0.1','2026-09-29 16:46:12'),(101,1,'post','api',29,NULL,'{\"warehouse_id\":1,\"expected_date\":\"2026-09-29\",\"source\":\"other\",\"type\":\"other\",\"items\":[{\"quantity\":50,\"product_id\":2,\"batch_number\":\"BULK-02\",\"unit_price\":0}],\"notes\":\"P9 stage3 bulk test B\"}','POST','api/inbound-orders','127.0.0.1','2026-09-29 16:46:12'),(102,1,'post','api',29,NULL,'{\"warehouse_id\":\"1\",\"id\":\"29\"}','POST','api/inbound-orders/29/start-receiving','127.0.0.1','2026-09-29 16:46:13'),(103,1,'post','api',NULL,NULL,'{\"warehouse_id\":\"1\",\"location_id\":4,\"item_id\":31,\"batch_number\":\"BULK-02\",\"quantity\":50,\"id\":\"29\"}','POST','api/inbound-orders/29/receive','127.0.0.1','2026-09-29 16:46:13'),(104,1,'post','api',29,NULL,'{\"warehouse_id\":\"1\",\"id\":\"29\"}','POST','api/inbound-orders/29/complete','127.0.0.1','2026-09-29 16:46:13'),(105,1,'post','api',15,NULL,'{\"warehouse_id\":1,\"receiver_unit\":\"P9-test\",\"items\":[{\"quantity\":120,\"product_id\":2,\"unit_price\":0}],\"type\":\"other\",\"expected_date\":\"2026-09-29\"}','POST','api/outbound-orders','127.0.0.1','2026-09-29 16:46:14'),(106,1,'post','api',15,NULL,'{\"warehouse_id\":\"1\",\"id\":\"15\"}','POST','api/outbound-orders/15/start-picking','127.0.0.1','2026-09-29 16:53:57'),(107,1,'post','api',NULL,NULL,'{\"warehouse_id\":\"1\",\"location_id\":4,\"item_id\":15,\"quantity\":120,\"id\":\"15\"}','POST','api/outbound-orders/15/pick','127.0.0.1','2026-09-29 16:53:57'),(108,1,'post','api',15,NULL,'{\"warehouse_id\":\"1\",\"reason\":\"P9 stage3 rollback test\",\"id\":\"15\"}','POST','api/outbound-orders/15/cancel','127.0.0.1','2026-09-29 16:53:58'),(109,1,'post','api',22,NULL,'{\"warehouse_id\":\"1\",\"reason\":\"P9 duplicate test order cleanup\",\"id\":\"22\"}','POST','api/inbound-orders/22/cancel','127.0.0.1','2026-09-29 16:56:12'),(110,1,'post','api',1,NULL,'{\"warehouse_id\":\"1\",\"type\":\"full\",\"scope_type\":\"all\",\"notes\":\"P10-verify\"}','POST','api/stocktakes','127.0.0.1','2026-09-29 17:33:36'),(111,1,'post','api',1,NULL,'{\"id\":\"1\"}','POST','api/stocktakes/1/start','127.0.0.1','2026-09-29 17:38:23'),(112,1,'post','api',NULL,NULL,'{\"product_id\":\"1\",\"warehouse_id\":\"1\",\"type\":\"increase\",\"quantity\":\"1\",\"reason\":\"freeze-test\"}','POST','api/inventory/adjustment','127.0.0.1','2026-09-29 17:38:24'),(113,1,'post','api',NULL,NULL,'{\"sn\":\"P9TEST-155925-A\",\"id\":\"1\"}','POST','api/stocktakes/1/scan','127.0.0.1','2026-09-29 17:38:24'),(114,1,'post','api',NULL,NULL,'{\"sn\":\"P9TEST-155925-A\",\"id\":\"1\"}','POST','api/stocktakes/1/scan','127.0.0.1','2026-09-29 17:38:24'),(115,1,'post','api',NULL,NULL,'{\"sn\":\"P10-UNKNOWN-001\",\"id\":\"1\"}','POST','api/stocktakes/1/scan','127.0.0.1','2026-09-29 17:39:19'),(116,1,'post','api',NULL,NULL,'{\"sn\":\"P10-UNKNOWN-001\",\"product_id\":\"1\",\"id\":\"1\"}','POST','api/stocktakes/1/scan','127.0.0.1','2026-09-29 17:39:20'),(117,1,'post','api',3,NULL,'{\"item_id\":\"3\",\"counted_qty\":\"50\",\"reason\":\"input-error\",\"id\":\"1\"}','POST','api/stocktakes/1/record','127.0.0.1','2026-09-29 17:39:20'),(118,1,'post','api',1,NULL,'{\"id\":\"1\"}','POST','api/stocktakes/1/submit','127.0.0.1','2026-09-29 17:39:21'),(119,1,'post','api',1,NULL,'{\"reason\":\"verify-only\",\"id\":\"1\"}','POST','api/stocktakes/1/cancel','127.0.0.1','2026-09-29 17:39:51'),(120,1,'post','api',2,NULL,'{\"warehouse_id\":\"1\",\"type\":\"partial\",\"scope_type\":\"location\",\"scope_value\":\"4\"}','POST','api/stocktakes','127.0.0.1','2026-09-29 17:42:04'),(121,1,'post','api',2,NULL,'{\"id\":\"2\"}','POST','api/stocktakes/2/start','127.0.0.1','2026-09-29 17:42:41'),(122,1,'post','api',NULL,NULL,'{\"sn\":\"SN-P10-A\",\"id\":\"2\"}','POST','api/stocktakes/2/scan','127.0.0.1','2026-09-29 17:42:42'),(123,1,'post','api',NULL,NULL,'{\"sn\":\"P10-NEW-C\",\"product_id\":\"39\",\"id\":\"2\"}','POST','api/stocktakes/2/scan','127.0.0.1','2026-09-29 17:42:42'),(124,1,'post','api',24,NULL,'{\"item_id\":\"24\",\"counted_qty\":\"95\",\"reason\":\"natural-loss\",\"id\":\"2\"}','POST','api/stocktakes/2/record','127.0.0.1','2026-09-29 17:42:43'),(125,1,'post','api',23,NULL,'{\"item_id\":\"23\",\"counted_qty\":\"0\",\"id\":\"2\"}','POST','api/stocktakes/2/record','127.0.0.1','2026-09-29 17:42:43'),(126,1,'post','api',2,NULL,'{\"id\":\"2\"}','POST','api/stocktakes/2/submit','127.0.0.1','2026-09-29 17:42:43'),(127,1,'post','api',NULL,NULL,'{\"sn\":\"P9TEST-155925-A\",\"id\":\"2\"}','POST','api/stocktakes/2/scan','127.0.0.1','2026-09-29 17:43:27'),(128,1,'post','api',NULL,NULL,'{\"sn\":\"P9TEST-155925-B\",\"id\":\"2\"}','POST','api/stocktakes/2/scan','127.0.0.1','2026-09-29 17:43:27'),(129,1,'post','api',NULL,NULL,'{\"notes\":\"P10 verify\",\"id\":\"2\"}','POST','api/stocktakes/2/review','127.0.0.1','2026-09-29 17:43:28'),(130,1,'post','api',3,NULL,'{\"warehouse_id\":\"1\",\"scope_type\":\"location\",\"scope_value\":\"7\"}','POST','api/stocktakes','127.0.0.1','2026-09-29 18:02:07'),(131,1,'post','api',3,NULL,'{\"id\":\"3\"}','POST','api/stocktakes/3/start','127.0.0.1','2026-09-29 18:02:34'),(132,1,'post','api',NULL,NULL,'{\"sn\":\"SN-P10-A\",\"id\":\"3\"}','POST','api/stocktakes/3/scan','127.0.0.1','2026-09-29 18:02:35'),(133,1,'post','api',NULL,NULL,'{\"sn\":\"SN-P10-C\",\"product_id\":\"41\",\"location_id\":\"7\",\"id\":\"3\"}','POST','api/stocktakes/3/scan','127.0.0.1','2026-09-29 18:02:35'),(134,1,'post','api',30,NULL,'{\"item_id\":\"30\",\"counted_qty\":\"0\",\"reason\":\"lost\",\"id\":\"3\"}','POST','api/stocktakes/3/record','127.0.0.1','2026-09-29 18:03:18'),(135,1,'post','api',3,NULL,'{\"id\":\"3\"}','POST','api/stocktakes/3/submit','127.0.0.1','2026-09-29 18:03:18'),(136,1,'post','api',NULL,NULL,'{\"notes\":\"Phase B retest\",\"id\":\"3\"}','POST','api/stocktakes/3/review','127.0.0.1','2026-09-29 18:03:49'),(137,1,'post','api',1,NULL,'{\"warehouse_id\":\"3\",\"type\":\"full\",\"scope_type\":\"all\",\"notes\":\"test\"}','POST','api/stocktakes','127.0.0.1','2026-09-29 20:30:33'),(138,1,'post','api',24,NULL,'{\"sku\":\"T-P10-P\",\"name\":\"P10-Test-Oil-Machine\",\"category_id\":\"2\",\"unit\":\"tai\",\"measure_type\":\"count\",\"price\":\"1000\",\"min_stock\":\"0\",\"max_stock\":\"100\"}','POST','api/products','127.0.0.1','2026-09-29 20:40:12'),(139,1,'post','api',25,NULL,'{\"sku\":\"T-P10-B\",\"name\":\"P10-Test-Wire\",\"category_id\":\"3\",\"unit\":\"mi\",\"measure_type\":\"length\",\"price\":\"10\",\"min_stock\":\"0\",\"max_stock\":\"1000\"}','POST','api/products','127.0.0.1','2026-09-29 20:40:12'),(140,1,'post','api',NULL,NULL,'{\"product_id\":\"24\",\"warehouse_id\":\"1\",\"location_id\":\"7\",\"type\":\"increase\",\"quantity\":\"3\",\"reason\":\"P10-test\"}','POST','api/inventory/adjustment','127.0.0.1','2026-09-29 20:43:31'),(141,1,'post','api',NULL,NULL,'{\"product_id\":\"25\",\"warehouse_id\":\"1\",\"location_id\":\"7\",\"type\":\"increase\",\"quantity\":\"120\",\"reason\":\"P10-test\"}','POST','api/inventory/adjustment','127.0.0.1','2026-09-29 20:43:31'),(142,1,'post','api',2,NULL,'{\"warehouse_id\":\"1\",\"type\":\"partial\",\"scope_type\":\"location\",\"scope_value\":\"7\",\"notes\":\"P10-test-location7\"}','POST','api/stocktakes','127.0.0.1','2026-09-29 20:45:30'),(143,1,'post','api',1,NULL,'{\"reason\":\"test cleanup\",\"id\":\"1\"}','POST','api/stocktakes/1/cancel','127.0.0.1','2026-09-29 20:49:02'),(144,1,'post','api',2,NULL,'{\"reason\":\"test cleanup\",\"id\":\"2\"}','POST','api/stocktakes/2/cancel','127.0.0.1','2026-09-29 20:49:02');

/*Table structure for table `outbound_order_items` */

DROP TABLE IF EXISTS `outbound_order_items`;

CREATE TABLE `outbound_order_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `outbound_order_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `unit` varchar(20) DEFAULT NULL COMMENT '单位快照',
  `location_id` int(11) DEFAULT NULL,
  `quantity` decimal(18,4) unsigned NOT NULL DEFAULT '0.0000' COMMENT '出库数量',
  `picked_quantity` decimal(18,4) unsigned NOT NULL DEFAULT '0.0000' COMMENT '已拣数量',
  `unit_price` decimal(18,4) unsigned NOT NULL DEFAULT '0.0000' COMMENT '单价',
  `batch_number` varchar(50) DEFAULT '',
  `requires_serial` tinyint(1) NOT NULL DEFAULT '0',
  `project_id` int(11) DEFAULT NULL,
  `notes` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `picked_batches` text COMMENT 'P9: 批次扣减轨迹 JSON [{batch_id,batch_no,location_id,quantity}]',
  PRIMARY KEY (`id`),
  KEY `outbound_order_id` (`outbound_order_id`),
  KEY `product_id` (`product_id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4;

/*Data for the table `outbound_order_items` */

insert  into `outbound_order_items`(`id`,`outbound_order_id`,`product_id`,`unit`,`location_id`,`quantity`,`picked_quantity`,`unit_price`,`batch_number`,`requires_serial`,`project_id`,`notes`,`created_at`,`updated_at`,`picked_batches`) values (1,1,4,NULL,8,'4.0000','4.0000','68500.0000','B20260103',1,1,'宏站BBU 4台','2026-02-10 09:15:00','2026-02-10 09:15:00',NULL),(2,1,5,NULL,10,'12.0000','12.0000','21800.0000','B20260103',1,1,'站点RRU 12台','2026-02-10 09:15:00','2026-02-10 09:15:00',NULL),(3,4,8,NULL,12,'50.0000','0.0000','1180.0000','B20260201',0,NULL,'待备货，未拣配','2026-04-05 14:05:00','2026-04-05 14:05:00',NULL),(4,2,6,NULL,13,'2.0000','2.0000','46800.0000','B20260110',1,NULL,'乡镇OLT 2台','2026-03-03 10:40:00','2026-03-03 10:40:00',NULL),(5,8,13,NULL,15,'30.0000','30.0000','2400.0000','B20260401',0,3,'天线30副','2026-04-18 15:30:00','2026-04-18 15:30:00',NULL),(6,5,10,NULL,21,'2.0000','2.0000','18600.0000','B20260318',1,NULL,'边界防火墙2台','2026-05-06 11:20:00','2026-05-06 11:20:00',NULL),(7,6,12,NULL,23,'120.0000','0.0000','960.0000','B20251120',1,NULL,'AP拣货中','2026-06-02 16:00:00','2026-06-02 16:00:00',NULL),(8,2,7,NULL,26,'300.0000','300.0000','320.0000','B20260110',0,2,'家庭终端300台','2026-03-03 10:40:00','2026-03-03 10:40:00',NULL),(9,3,7,NULL,26,'200.0000','200.0000','320.0000','B20260110',0,2,'二期茨口ONU','2026-05-20 09:45:00','2026-05-20 09:45:00',NULL),(10,7,5,NULL,28,'10.0000','0.0000','21800.0000','B20260401',1,NULL,'调拨待审批','2026-06-15 10:10:00','2026-06-15 10:10:00',NULL),(11,9,1,'台',NULL,'2.0000','0.0000','10.0000','',1,NULL,'','2026-09-29 08:41:52','2026-09-29 08:41:52',NULL),(12,10,1,'台',1,'2.0000','0.0000','0.0000','B20240101',1,NULL,'','2026-09-29 16:22:14','2026-09-29 16:22:14',NULL),(13,13,1,'台',4,'2.0000','0.0000','0.0000','',1,NULL,'','2026-09-29 16:28:35','2026-09-29 16:28:35',NULL),(14,14,1,'台',4,'2.0000','2.0000','0.0000','',1,NULL,'','2026-09-29 16:31:54','2026-09-29 16:31:57',NULL),(15,15,2,'个',4,'120.0000','120.0000','0.0000','BULK-01',0,NULL,'','2026-09-29 16:46:15','2026-09-29 16:53:58','[{\"batch_id\":1,\"batch_no\":\"BULK-01\",\"location_id\":4,\"quantity\":\"100.0000\"},{\"batch_id\":2,\"batch_no\":\"BULK-02\",\"location_id\":4,\"quantity\":\"20.0000\"}]');

/*Table structure for table `outbound_orders` */

DROP TABLE IF EXISTS `outbound_orders`;

CREATE TABLE `outbound_orders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_number` varchar(50) NOT NULL,
  `warehouse_id` int(11) NOT NULL,
  `customer_id` int(11) DEFAULT NULL,
  `receiver_unit` varchar(100) DEFAULT NULL COMMENT '领用单位',
  `receiver_name` varchar(50) DEFAULT NULL COMMENT '领用人',
  `receiver_phone` varchar(20) DEFAULT NULL COMMENT '领用人手机号',
  `operator_id` int(11) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `type` varchar(20) NOT NULL DEFAULT 'sale',
  `priority` varchar(20) NOT NULL DEFAULT 'normal',
  `expected_date` date DEFAULT NULL,
  `shipped_date` date DEFAULT NULL,
  `shipped_at` datetime DEFAULT NULL COMMENT '出库时间(业务发生时间)',
  `tracking_number` varchar(100) DEFAULT NULL,
  `project_id` int(11) DEFAULT NULL,
  `notes` text,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL COMMENT '归档时间（软删除）',
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_number` (`order_number`),
  KEY `warehouse_id` (`warehouse_id`),
  KEY `customer_id` (`customer_id`),
  KEY `idx_deleted_at` (`deleted_at`),
  KEY `idx_receiver_unit` (`receiver_unit`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4;

/*Data for the table `outbound_orders` */

insert  into `outbound_orders`(`id`,`order_number`,`warehouse_id`,`customer_id`,`receiver_unit`,`receiver_name`,`receiver_phone`,`operator_id`,`created_by`,`status`,`type`,`priority`,`expected_date`,`shipped_date`,`shipped_at`,`tracking_number`,`project_id`,`notes`,`created_at`,`updated_at`,`deleted_at`) values (1,'OUT202602100001',1,3,NULL,NULL,NULL,4,4,'completed','sale','high','2026-02-08','2026-02-10','2026-02-10 00:00:00','SF202602100001',1,'5G三期首批站点发货','2026-02-10 09:15:00','2026-02-10 09:15:00',NULL),(2,'OUT202603030002',1,4,NULL,NULL,NULL,1,1,'completed','sale','normal','2026-03-01','2026-03-03','2026-03-03 00:00:00','SF202603030002',NULL,'宽带光网首批发货','2026-03-03 10:40:00','2026-03-03 10:40:00',NULL),(3,'OUT202605200006',1,4,NULL,NULL,NULL,2,2,'completed','sale','normal','2026-05-18','2026-05-20','2026-05-20 00:00:00','SF202605200006',2,'农村宽带二期 ONU 领用','2026-05-20 09:45:00','2026-05-20 09:45:00',NULL),(4,'OUT202604050003',1,5,NULL,NULL,NULL,4,4,'pending','sale','normal','2026-04-08',NULL,NULL,NULL,NULL,'光模块申请 50 只，待备货','2026-04-05 14:05:00','2026-04-05 14:05:00',NULL),(5,'OUT202605060005',1,7,NULL,NULL,NULL,1,1,'completed','sale','normal','2026-05-04','2026-05-06','2026-05-06 00:00:00','SF202605060005',NULL,'园区项目防火墙领用','2026-05-06 11:20:00','2026-05-06 11:20:00',NULL),(6,'OUT202606020007',1,7,NULL,NULL,NULL,5,5,'picking','sale','normal','2026-06-05',NULL,NULL,NULL,NULL,'AP 覆盖扩容，拣货中','2026-06-02 16:00:00','2026-06-02 16:00:00',NULL),(7,'OUT202606150008',2,5,NULL,NULL,NULL,3,3,'pending','transfer','low','2026-06-20',NULL,NULL,NULL,NULL,'调拨至备份站点，待审批','2026-06-15 10:10:00','2026-06-15 10:10:00',NULL),(8,'OUT202604180004',2,6,NULL,NULL,NULL,3,3,'shipped','sale','urgent','2026-04-16','2026-04-18','2026-04-18 00:00:00','SF202604180004',3,'铁塔电源改造配套天线','2026-04-18 15:30:00','2026-04-18 15:30:00',NULL),(9,'OUT202609290001',1,NULL,'综合维护部','王伟','13800001111',1,1,'pending','sale','normal','2026-09-29',NULL,'2026-09-29 14:20:00',NULL,NULL,'P8 ??????','2026-09-29 08:41:52','2026-09-29 08:41:52',NULL),(10,'OUT202609290002',1,NULL,'P9-verify','tester',NULL,1,1,'cancelled','other','normal','2026-09-29',NULL,NULL,NULL,NULL,'P9-outbound-chain-test\\n取消原因：P9-test-cleanup','2026-09-29 16:22:13','2026-09-29 16:26:12',NULL),(13,'OUT202609290003',1,NULL,'P9-verify','tester',NULL,1,1,'cancelled','other','normal','2026-09-29',NULL,NULL,NULL,NULL,'P9-outbound-chain-test-2\\n取消原因：P9-partial-pick-rollback-test','2026-09-29 16:28:35','2026-09-29 16:29:58',NULL),(14,'OUT202609290004',1,NULL,'P9-verify','tester',NULL,1,1,'cancelled','other','normal','2026-09-29',NULL,NULL,NULL,NULL,'P9-full-cycle\\n取消原因：P9-full-cycle-rollback','2026-09-29 16:31:54','2026-09-29 16:31:59',NULL),(15,'OUT202609290005',1,NULL,'P9-test',NULL,NULL,1,1,'cancelled','other','normal','2026-09-29',NULL,NULL,NULL,NULL,'\\n取消原因：P9 stage3 rollback test','2026-09-29 16:46:14','2026-09-29 16:53:59',NULL);

/*Table structure for table `products` */

DROP TABLE IF EXISTS `products`;

CREATE TABLE `products` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `sku` varchar(50) NOT NULL,
  `name` varchar(200) NOT NULL,
  `description` text,
  `device_type` varchar(50) DEFAULT NULL,
  `model_number` varchar(100) DEFAULT NULL,
  `brand` varchar(100) DEFAULT NULL COMMENT '品牌',
  `production_date` date DEFAULT NULL COMMENT '生产日期',
  `warranty_months` int(11) DEFAULT '0' COMMENT '保修期（月）',
  `frequency_protocol` varchar(100) DEFAULT NULL,
  `firmware_version` varchar(50) DEFAULT NULL,
  `category_id` int(11) DEFAULT NULL,
  `barcode` varchar(50) DEFAULT NULL,
  `barcode_image` varchar(255) DEFAULT NULL COMMENT '条码图片URL',
  `price` decimal(18,4) unsigned NOT NULL DEFAULT '0.0000' COMMENT '售价',
  `cost_price` decimal(18,4) unsigned NOT NULL DEFAULT '0.0000' COMMENT '成本价',
  `unit` varchar(20) DEFAULT 'pcs',
  `measure_type` varchar(20) NOT NULL DEFAULT 'count' COMMENT '计量方式 count计件/length长度/weight重量/area面积/volume体积',
  `requires_serial` tinyint(1) NOT NULL DEFAULT '1' COMMENT '是否需要序列号(由 measure_type 推导：计件=1，长度/重量/面积/体积=0)',
  `weight` decimal(10,3) DEFAULT NULL,
  `length` decimal(10,3) NOT NULL DEFAULT '0.000',
  `width` decimal(10,3) NOT NULL DEFAULT '0.000',
  `height` decimal(10,3) NOT NULL DEFAULT '0.000',
  `min_stock` int(11) NOT NULL DEFAULT '0',
  `max_stock` int(11) NOT NULL DEFAULT '0',
  `stock_quantity` int(11) NOT NULL DEFAULT '0',
  `min_stock_level` int(11) NOT NULL DEFAULT '0',
  `status` enum('active','inactive','discontinued','repairing','to_scrap') NOT NULL DEFAULT 'active',
  `project_id` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sku` (`sku`),
  KEY `category_id` (`category_id`),
  KEY `project_id` (`project_id`)
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4;

/*Data for the table `products` */

insert  into `products`(`id`,`sku`,`name`,`description`,`device_type`,`model_number`,`brand`,`production_date`,`warranty_months`,`frequency_protocol`,`firmware_version`,`category_id`,`barcode`,`barcode_image`,`price`,`cost_price`,`unit`,`measure_type`,`requires_serial`,`weight`,`length`,`width`,`height`,`min_stock`,`max_stock`,`stock_quantity`,`min_stock_level`,`status`,`project_id`,`created_at`,`updated_at`) values (1,'SKU-5G-AAU','5G AAU基站设备','5G有源天线单元','基站设备','AAU5613',NULL,NULL,0,'5G 700MHz',NULL,7,'BC0001',NULL,'12000.0000','9000.0000','台','count',1,NULL,'0.000','0.000','0.000',5,100,51,5,'active',NULL,'2026-09-28 08:11:48','2026-09-28 08:11:48'),(2,'SKU-OPT-SFP','10G光模块','SFP+ 10G光模块','光传输设备','SFP-10G-LR',NULL,NULL,0,'10G',NULL,14,'BC0002',NULL,'850.0000','500.0000','个','count',1,NULL,'0.000','0.000','0.000',20,500,300,20,'active',NULL,'2026-09-28 08:11:48','2026-09-28 08:11:48'),(3,'SKU-RTR-AR','核心路由器','企业核心路由器','网络设备','AR6280',NULL,NULL,0,'IPv6',NULL,15,'BC0003',NULL,'6500.0000','4800.0000','台','count',1,NULL,'0.000','0.000','0.000',3,50,15,3,'active',NULL,'2026-09-28 08:11:48','2026-09-28 08:11:48'),(4,'SKU-5G-BBU','5G BBU基带单元','5G基站基带处理单元，含主控板','基站设备','BBU5900',NULL,NULL,0,'5G NR 2.6GHz','V100R015',7,'BC-SKU-5G-BBU',NULL,'68500.0000','61200.0000','台','count',1,'18.500','0.000','0.000','0.000',5,80,6,10,'active',NULL,NULL,NULL),(5,'SKU-RRU-3971','RRU射频拉远单元','5G宏站射频单元','基站设备','RRU3971',NULL,NULL,0,'5G NR 2.6GHz','V100R015',7,'BC-SKU-RRU-3971',NULL,'21800.0000','19600.0000','台','count',1,'12.000','0.000','0.000','0.000',10,200,38,20,'active',NULL,NULL,NULL),(6,'SKU-OLT-MA5683T','OLT光线路终端','GPON/10G PON 汇聚局端设备','光传输设备','MA5683T',NULL,NULL,0,'GPON/XGS-PON','V800R018',12,'BC-SKU-OLT-MA5683T',NULL,'46800.0000','42000.0000','台','count',1,'15.200','0.000','0.000','0.000',2,30,3,5,'active',NULL,NULL,NULL),(7,'SKU-ONU-HG8245H','ONU光网络单元','家庭侧千兆光猫终端','光传输设备','HG8245H',NULL,NULL,0,'GPON','V300R019',13,'BC-SKU-ONU-HG8245H',NULL,'320.0000','245.0000','台','count',1,'0.600','0.000','0.000','0.000',200,5000,300,300,'active',NULL,NULL,NULL),(8,'SKU-OPT-SFP28','25G SFP28光模块','25G 灰光模块 10km','光传输设备','SFP28-25G-LR',NULL,NULL,0,'25GBASE-LR','NA',14,'BC-SKU-OPT-SFP28',NULL,'1180.0000','880.0000','只','count',1,'0.050','0.000','0.000','0.000',50,2000,270,100,'active',NULL,NULL,NULL),(9,'SKU-SW-S5720','千兆接入交换机','24口千兆+4万兆上行','网络设备','S5720-28X-SI',NULL,NULL,0,'GE/10GE','V200R020',16,'BC-SKU-SW-S5720',NULL,'5600.0000','4300.0000','台','count',1,'4.200','0.000','0.000','0.000',10,150,24,20,'active',NULL,NULL,NULL),(10,'SKU-FW-USG6525E','下一代防火墙','边界安全防护网关','网络安全设备','USG6525E',NULL,NULL,0,'N/A','V600R007',17,'BC-SKU-FW-USG6525E',NULL,'18600.0000','15000.0000','台','count',1,'5.800','0.000','0.000','0.000',2,40,2,5,'active',NULL,NULL,NULL),(11,'SKU-RTR-NE40E','核心路由器','城域网汇聚路由器','网络设备','NE40E-M2K',NULL,NULL,0,'100GE','V800R011',15,'BC-SKU-RTR-NE40E',NULL,'128000.0000','106000.0000','台','count',1,'22.000','0.000','0.000','0.000',1,20,2,2,'active',NULL,NULL,NULL),(12,'SKU-AP-AE5760','WiFi6无线AP','室内放装型AP','无线设备','AirEngine5760-10',NULL,NULL,0,'WiFi6 2.4G+5G','V200R021',9,'BC-SKU-AP-AE5760',NULL,'960.0000','720.0000','台','count',1,'0.800','0.000','0.000','0.000',100,1500,260,150,'active',NULL,NULL,NULL),(13,'SKU-ANT-700M','700MHz定向天线','5G低频定向天线','无线设备','ANT700M-17',NULL,NULL,0,'700MHz','NA',10,'BC-SKU-ANT-700M',NULL,'2400.0000','1880.0000','副','count',1,'7.500','0.000','0.000','0.000',10,120,30,20,'active',NULL,NULL,NULL),(14,'SKU-PWR-EPU4840','通信直流电源模块','-48V整流模块 40A','配件耗材','EPU4840',NULL,NULL,0,'N/A','NA',18,'BC-SKU-PWR-EPU4840',NULL,'3600.0000','2900.0000','台','count',1,'3.600','0.000','0.000','0.000',8,100,60,15,'active',NULL,NULL,NULL),(15,'SKU-BAT-LI48','磷酸铁锂备电电池','48V 50AH 备电电池组','配件耗材','BAT-48V50AH',NULL,NULL,0,'N/A','NA',19,'BC-SKU-BAT-LI48',NULL,'4200.0000','3480.0000','组','count',1,'19.000','0.000','0.000','0.000',5,80,40,10,'active',NULL,NULL,NULL),(16,'SKU-CBL-LC','光纤跳线 LC-LC','单模双芯 10m','配件耗材','LC-LC-SM-10M',NULL,NULL,0,'N/A','NA',20,'BC-SKU-CBL-LC',NULL,'28.0000','16.0000','条','count',1,'0.100','0.000','0.000','0.000',500,8000,3240,800,'active',NULL,NULL,NULL),(17,'SKU-CBL-PWR','直流电源线缆','-48V 16mm2 电源线 5m','配件耗材','PWR-CABLE-16-5M',NULL,NULL,0,'N/A','NA',20,'BC-SKU-CBL-PWR',NULL,'96.0000','62.0000','根','count',1,'1.200','0.000','0.000','0.000',300,4000,890,400,'active',NULL,NULL,NULL),(18,'DEV-DEV-001','5G基站设备',NULL,'基站设备','AAU5613',NULL,NULL,0,NULL,NULL,7,NULL,NULL,'0.0000','0.0000','台','count',1,NULL,'0.000','0.000','0.000',0,0,0,0,'active',NULL,'2026-09-29 08:00:22','2026-09-29 14:50:29'),(19,'DEV-DEV-002','光纤交换机',NULL,'网络设备','S5720-28X-SI',NULL,NULL,0,NULL,NULL,16,NULL,NULL,'0.0000','0.0000','台','count',1,NULL,'0.000','0.000','0.000',0,0,0,0,'active',NULL,'2026-09-29 08:00:22','2026-09-29 08:00:22'),(20,'DEV-DEV-003','路由器设备',NULL,'网络设备','AR6280',NULL,NULL,0,NULL,NULL,15,NULL,NULL,'0.0000','0.0000','台','count',1,NULL,'0.000','0.000','0.000',0,0,0,0,'active',NULL,'2026-09-29 08:00:22','2026-09-29 08:00:22'),(21,'DEV-DEV-004','光模块',NULL,'光传输设备','SFP-10G-LR',NULL,NULL,0,NULL,NULL,14,NULL,NULL,'0.0000','0.0000','台','count',1,NULL,'0.000','0.000','0.000',0,0,0,0,'active',NULL,'2026-09-29 08:00:22','2026-09-29 08:00:22'),(22,'DEV-DEV-005','中兴基站',NULL,'基站设备','AAU5613',NULL,NULL,0,NULL,NULL,7,NULL,NULL,'0.0000','0.0000','台','count',1,NULL,'0.000','0.000','0.000',0,0,0,0,'active',NULL,'2026-09-29 08:00:22','2026-09-29 08:00:22'),(23,'DEV-DEV-SCR-001','老旧光猫终端',NULL,'光传输设备','HG8245C',NULL,NULL,0,NULL,NULL,13,NULL,NULL,'0.0000','0.0000','台','count',1,NULL,'0.000','0.000','0.000',0,0,0,0,'active',NULL,'2026-09-29 08:00:22','2026-09-29 08:00:22'),(24,'T-P10-P','P10-Test-Oil-Machine','','','','',NULL,0,'','',2,'','','1000.0000','0.0000','tai','count',1,'0.000','0.000','0.000','0.000',0,100,0,0,'active',NULL,'2026-09-29 20:40:12','2026-09-29 20:40:12'),(25,'T-P10-B','P10-Test-Wire','','','','',NULL,0,'','',3,'','','10.0000','0.0000','mi','length',0,'0.000','0.000','0.000','0.000',0,1000,0,0,'active',NULL,'2026-09-29 20:40:13','2026-09-29 20:40:13');

/*Table structure for table `project_inventory_reservations` */

DROP TABLE IF EXISTS `project_inventory_reservations`;

CREATE TABLE `project_inventory_reservations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `project_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `quantity` decimal(10,2) NOT NULL DEFAULT '0.00',
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `notes` text,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `project_id` (`project_id`),
  KEY `product_id` (`product_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4;

/*Data for the table `project_inventory_reservations` */

insert  into `project_inventory_reservations`(`id`,`project_id`,`product_id`,`quantity`,`status`,`notes`,`created_at`,`updated_at`) values (1,1,5,'40.00','active','5G三期首批次保障用量','2026-09-28 16:10:03','2026-09-28 16:10:03'),(2,2,7,'1500.00','active','农村宽带首月施工用料','2026-09-28 16:10:03','2026-09-28 16:10:03'),(3,3,15,'60.00','active','电源改造备电批次','2026-09-28 16:10:03','2026-09-28 16:10:03');

/*Table structure for table `projects` */

DROP TABLE IF EXISTS `projects`;

CREATE TABLE `projects` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `project_code` varchar(50) NOT NULL,
  `project_name` varchar(200) NOT NULL,
  `description` text,
  `manager` varchar(50) DEFAULT NULL,
  `manager_id` int(11) DEFAULT NULL,
  `contact_phone` varchar(20) DEFAULT NULL,
  `contact_email` varchar(100) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'planning',
  `budget` decimal(12,2) NOT NULL DEFAULT '0.00',
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `customer_id` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `project_code` (`project_code`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4;

/*Data for the table `projects` */

insert  into `projects`(`id`,`project_code`,`project_name`,`description`,`manager`,`manager_id`,`contact_phone`,`contact_email`,`address`,`status`,`budget`,`start_date`,`end_date`,`customer_id`,`created_at`,`updated_at`) values (1,'PRJ-2026-5G-001','XX市移动5G三期宏站建设','城区及周边乡镇宏站新建与扩容','刘洋',1,'13900000001','cmcc@example.com','XX市城区','executing','8600000.00','2026-01-05','2026-12-31',3,'2026-09-28 16:10:03','2026-09-28 17:58:47'),(2,'PRJ-2026-BRG-002','农村宽带千兆光网改造','OLT/ONU 端到端替换升级','孙磊',1,'13900000002','ctc@example.com','XX市乡镇','executing','4200000.00','2026-03-01','2026-10-31',4,'2026-09-28 16:10:03','2026-09-28 17:58:47'),(3,'PRJ-2026-TWR-003','铁塔机房电源改造','开关电源与备电电池更换','吴迪',1,'13900000004','tower@example.com','XX市铁塔站点','planning','1500000.00','2026-09-01','2027-03-31',6,'2026-09-28 16:10:03','2026-09-28 17:58:47'),(4,'PRJ-2025-WLAN-004','园区WLAN覆盖项目','WiFi6 AP 覆盖一期','郑凯',1,'13900000005','eng@example.com','XX高新区','completed','980000.00','2025-05-01','2025-12-31',7,'2026-09-28 16:10:03','2026-09-28 17:58:47');

/*Table structure for table `scrap_applications` */

DROP TABLE IF EXISTS `scrap_applications`;

CREATE TABLE `scrap_applications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `scrap_number` varchar(50) NOT NULL,
  `device_id` int(11) NOT NULL,
  `reason_type` enum('damage','obsolete','expired','other') NOT NULL,
  `description` text,
  `images` json DEFAULT NULL COMMENT '报废图片 URL 列表',
  `estimated_loss` decimal(10,2) DEFAULT '0.00',
  `actual_loss` decimal(10,2) DEFAULT '0.00',
  `applicant_id` int(11) NOT NULL,
  `status` enum('pending','approved','rejected','completed') NOT NULL DEFAULT 'pending',
  `approved_by` int(11) DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `approval_notes` text,
  `processed_by` int(11) DEFAULT NULL,
  `processed_at` datetime DEFAULT NULL,
  `processing_notes` text,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_scrap_number` (`scrap_number`),
  KEY `idx_device_id` (`device_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4;

/*Data for the table `scrap_applications` */

insert  into `scrap_applications`(`id`,`scrap_number`,`device_id`,`reason_type`,`description`,`images`,`estimated_loss`,`actual_loss`,`applicant_id`,`status`,`approved_by`,`approved_at`,`approval_notes`,`processed_by`,`processed_at`,`processing_notes`,`created_at`,`updated_at`,`deleted_at`) values (1,'SCR20260928001',1,'damage','test image upload','[\"/uploads/scraps/20260928/scrap_6ab9f7ff7edee1.84591274.png\"]','100.00','0.00',1,'pending',NULL,NULL,NULL,NULL,NULL,NULL,'2026-09-28 13:15:43','2026-09-28 13:15:44',NULL),(2,'SCR20260120001',7,'damage','雷击导致光猫端口击穿，无法修复',NULL,'320.00','320.00',5,'completed',1,'2026-01-21 09:00:00','同意报废，做残值回收',5,'2026-01-22 15:00:00','已交由环保回收商处理','2026-01-20 10:00:00','2026-09-28 17:58:47',NULL),(3,'SCR20260305001',8,'damage','批次光模块收光异常，返修报价高于重置成本',NULL,'1180.00',NULL,2,'approved',1,'2026-03-06 11:20:00','同意报废，待处置',NULL,NULL,NULL,'2026-03-05 16:30:00','2026-09-28 17:58:47',NULL),(4,'SCR20260512001',5,'obsolete','旧射频单元厂家停产，建议整批淘汰',NULL,'21800.00',NULL,3,'pending',NULL,NULL,NULL,NULL,NULL,NULL,'2026-05-12 14:00:00','2026-09-28 17:58:47',NULL),(5,'SCR20260608001',17,'expired','库存线缆老化超期，绝缘层开裂',NULL,'96.00',NULL,5,'rejected',1,'2026-06-09 10:00:00','仍可降级使用，暂缓报废',NULL,NULL,NULL,'2026-06-08 09:15:00','2026-09-28 17:58:47',NULL),(6,'SCR20260625001',7,'other','旧型号光猫技术淘汰，用于备件 ECO 处理',NULL,'245.00','80.00',4,'completed',1,'2026-06-26 09:30:00','同意按残值处置',5,'2026-06-28 16:30:00','残值入账 80 元','2026-06-25 17:00:00','2026-09-28 17:58:47',NULL);

/*Table structure for table `serial_number_history` */

DROP TABLE IF EXISTS `serial_number_history`;

CREATE TABLE `serial_number_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `serial_number_id` int(11) NOT NULL,
  `event_type` varchar(30) NOT NULL,
  `status_before` varchar(50) DEFAULT NULL,
  `status_after` varchar(50) DEFAULT NULL,
  `location_before` int(11) DEFAULT NULL,
  `location_after` int(11) DEFAULT NULL,
  `reference_type` varchar(50) DEFAULT NULL,
  `reference_id` int(11) DEFAULT NULL,
  `operator_id` int(11) DEFAULT NULL,
  `notes` text,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `serial_number_id` (`serial_number_id`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4;

/*Data for the table `serial_number_history` */

insert  into `serial_number_history`(`id`,`serial_number_id`,`event_type`,`status_before`,`status_after`,`location_before`,`location_after`,`reference_type`,`reference_id`,`operator_id`,`notes`,`created_at`) values (1,3,'inbound',NULL,'in_stock',NULL,NULL,'inbound_order',11,4,'到货入库登记','2026-01-05 09:30:00'),(2,3,'install','in_stock','installed',NULL,NULL,'outbound_order',NULL,4,'站点安装开通','2026-02-12 10:00:00'),(3,6,'inbound',NULL,'in_stock',NULL,NULL,'inbound_order',11,4,'到货入库登记','2026-01-05 09:30:00'),(4,6,'repair','in_stock','returned',NULL,NULL,'outbound_order',NULL,4,'端口异常返修','2026-03-05 09:30:00'),(5,8,'inbound',NULL,'in_stock',NULL,NULL,'inbound_order',13,4,'OLT到货入库','2026-01-12 10:15:00'),(6,8,'install','in_stock','installed',NULL,NULL,'outbound_order',NULL,1,'乡镇机房上线','2026-03-06 11:00:00'),(7,13,'inbound',NULL,'in_stock',NULL,NULL,'inbound_order',12,2,'部分到货入库','2026-02-03 14:20:00'),(8,14,'inbound',NULL,'reserved',NULL,NULL,'inbound_order',12,2,'入库后即被占用','2026-02-03 14:20:00'),(9,16,'inbound',NULL,'in_stock',NULL,NULL,'inbound_order',10,1,'防火墙到货入库','2026-03-20 09:05:00'),(10,18,'repair','in_stock','returned',NULL,NULL,'outbound_order',NULL,1,'风扇告警返修','2026-05-20 09:05:00'),(11,24,'repair','in_stock','to_scrap',NULL,NULL,'inbound_order',11,1,'超期服役报废','2026-01-20 10:00:00'),(12,25,'repair','in_use','repairing',NULL,NULL,'serial_number',25,1,'P8 ??????','2026-09-29 08:40:33'),(13,28,'install','in_stock','in_use',NULL,NULL,'outbound_order',14,1,'出库领用','2026-09-29 16:31:55'),(14,29,'install','in_stock','in_use',NULL,NULL,'outbound_order',14,1,'出库领用','2026-09-29 16:31:56'),(15,28,'return','in_use','in_stock',NULL,NULL,'outbound_order_cancel',14,0,'出库订单取消回退','2026-09-29 16:31:59'),(16,29,'return','in_use','in_stock',NULL,NULL,'outbound_order_cancel',14,0,'出库订单取消回退','2026-09-29 16:31:59'),(17,28,'return','in_stock','lost',NULL,NULL,'stocktake_order',2,1,'盘点盘亏：未注明原因','2026-09-29 17:43:28'),(18,29,'return','in_stock','lost',NULL,NULL,'stocktake_order',2,1,'盘点盘亏：未注明原因','2026-09-29 17:43:28'),(20,28,'return','lost','in_stock',NULL,NULL,'stocktake_order',2,1,'盘点误伤数据修复：恢复在库','2026-09-29 17:55:01'),(21,29,'return','lost','in_stock',NULL,NULL,'stocktake_order',2,1,'盘点误伤数据修复：恢复在库','2026-09-29 17:55:01');

/*Table structure for table `serial_numbers` */

DROP TABLE IF EXISTS `serial_numbers`;

CREATE TABLE `serial_numbers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `serial_number` varchar(100) NOT NULL,
  `product_id` int(11) NOT NULL,
  `warehouse_id` int(11) DEFAULT NULL COMMENT '所属仓库ID',
  `location_id` int(11) DEFAULT NULL COMMENT '当前库位ID',
  `stock_id` int(11) DEFAULT NULL,
  `inbound_id` int(11) DEFAULT NULL,
  `outbound_id` int(11) DEFAULT NULL,
  `manufacture_date` date DEFAULT NULL,
  `warranty_period` int(11) DEFAULT NULL,
  `warranty_end_date` date DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'in_stock',
  `location` varchar(255) DEFAULT NULL,
  `mac_address` varchar(50) DEFAULT NULL,
  `notes` text,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_serial_number` (`serial_number`),
  KEY `product_id` (`product_id`),
  KEY `idx_status` (`status`),
  KEY `idx_warehouse_status` (`warehouse_id`,`status`)
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4;

/*Data for the table `serial_numbers` */

insert  into `serial_numbers`(`id`,`serial_number`,`product_id`,`warehouse_id`,`location_id`,`stock_id`,`inbound_id`,`outbound_id`,`manufacture_date`,`warranty_period`,`warranty_end_date`,`status`,`location`,`mac_address`,`notes`,`created_at`,`updated_at`) values (1,'HW202401001',1,NULL,NULL,NULL,NULL,NULL,'2024-01-15',36,'2027-01-15','in_stock','机房A-01',NULL,'5G基站主设备','2026-09-28 08:11:48','2026-09-28 08:11:48'),(2,'HW202401002',2,NULL,NULL,NULL,NULL,NULL,'2024-01-10',24,'2026-01-10','in_stock','机房B-02',NULL,'核心交换设备','2026-09-28 08:11:48','2026-09-28 08:11:48'),(3,'SN-BBU-2026-0001',4,NULL,NULL,NULL,NULL,NULL,'2025-12-10',36,'2028-12-10','installed','XX市宏站-001','00:1A:2B:00:01:01','已安装并开通','2026-09-28 16:10:04','2026-09-28 17:58:47'),(4,'SN-BBU-2026-0002',4,NULL,NULL,NULL,NULL,NULL,'2025-12-10',36,'2028-12-10','in_stock','A区-01','00:1A:2B:00:01:02','库存可用','2026-09-28 16:10:04','2026-09-28 17:58:47'),(5,'SN-RRU-2026-0011',5,NULL,NULL,NULL,NULL,NULL,'2025-12-15',36,'2028-12-15','installed','XX市宏站-001','00:1A:2B:00:02:01','站点一扇区','2026-09-28 16:10:04','2026-09-28 17:58:47'),(6,'SN-RRU-2026-0012',5,NULL,NULL,NULL,NULL,NULL,'2025-12-15',36,'2028-12-15','returned','维修区-R01','00:1A:2B:00:02:02','返修召回','2026-09-28 16:10:04','2026-09-28 17:58:47'),(7,'SN-RRU-2026-0013',5,NULL,NULL,NULL,NULL,NULL,'2025-12-15',36,'2028-12-15','in_stock','暂苔区-T01','00:1A:2B:00:02:03','封存待调拨','2026-09-28 16:10:04','2026-09-28 17:58:47'),(8,'SN-OLT-2026-0001',6,NULL,NULL,NULL,NULL,NULL,'2025-12-20',36,'2028-12-20','installed','乡镇机房-A','00:1A:2B:00:03:01','乡镇OLT已上线','2026-09-28 16:10:04','2026-09-28 17:58:47'),(9,'SN-OLT-2026-0002',6,NULL,NULL,NULL,NULL,NULL,'2025-12-20',36,'2028-12-20','in_stock','B区-01','00:1A:2B:00:03:02','备用局端机','2026-09-28 16:10:04','2026-09-28 17:58:47'),(10,'SN-ONU-2026-0101',7,NULL,NULL,NULL,NULL,NULL,'2025-12-01',24,'2027-12-01','in_stock','B区-02','00:1A:2B:00:04:01','批次 B20260110','2026-09-28 16:10:04','2026-09-28 17:58:47'),(11,'SN-ONU-2026-0102',7,NULL,NULL,NULL,NULL,NULL,'2025-12-01',24,'2027-12-01','shipped','XX乡镇-王村','00:1A:2B:00:04:02','已发放到户','2026-09-28 16:10:04','2026-09-28 17:58:47'),(12,'SN-ONU-2026-0103',7,NULL,NULL,NULL,NULL,NULL,'2025-12-01',24,'2027-12-01','to_scrap','报废区','00:1A:2B:00:04:03','雷击损坏已报废（原已报废→待报废）','2026-09-28 16:10:04','2026-09-28 17:58:47'),(13,'SN-SFP28-2026-0101',8,NULL,NULL,NULL,NULL,NULL,'2026-01-05',12,'2027-01-05','in_stock','B区-02',NULL,'批次 B20260201','2026-09-28 16:10:04','2026-09-28 17:58:47'),(14,'SN-SFP28-2026-0102',8,NULL,NULL,NULL,NULL,NULL,'2026-01-05',12,'2027-01-05','reserved','B区-02',NULL,'已被出库单占用','2026-09-28 16:10:04','2026-09-28 17:58:47'),(15,'SN-SW-2026-0001',9,NULL,NULL,NULL,NULL,NULL,'2025-09-10',36,'2028-09-10','installed','XX高新区-厂房A','00:1A:2B:00:05:01','园区项目在用','2026-09-28 16:10:04','2026-09-28 17:58:47'),(16,'SN-FW-2026-0001',10,NULL,NULL,NULL,NULL,NULL,'2026-01-20',36,'2029-01-20','installed','XX核心机房','00:1A:2B:00:06:01','边界入口','2026-09-28 16:10:04','2026-09-28 17:58:47'),(17,'SN-RTR-2026-0001',11,NULL,NULL,NULL,NULL,NULL,'2026-02-10',36,'2029-02-10','installed','XX核心机房','00:1A:2B:00:07:01','汇聚节点主用','2026-09-28 16:10:04','2026-09-28 17:58:47'),(18,'SN-RTR-2026-0002',11,NULL,NULL,NULL,NULL,NULL,'2026-02-10',36,'2029-02-10','returned','维修区-R01','00:1A:2B:00:07:02','风扇告警返修','2026-09-28 16:10:04','2026-09-28 17:58:47'),(19,'SN-AP-2026-0001',12,NULL,NULL,NULL,NULL,NULL,'2025-10-05',36,'2028-10-05','in_stock','C区-02','00:1A:2B:00:08:01','批次 B20251120','2026-09-28 16:10:04','2026-09-28 17:58:47'),(20,'SN-AP-2026-0002',12,NULL,NULL,NULL,NULL,NULL,'2025-10-05',36,'2028-10-05','in_stock','C区-02','00:1A:2B:00:08:02','批次 B20251120','2026-09-28 16:10:04','2026-09-28 17:58:47'),(21,'SN-ANT-2026-0001',13,NULL,NULL,NULL,NULL,NULL,'2026-03-01',24,'2028-03-01','shipped','XX市铁塔-XX站','00:1A:2B:00:09:01','铁塔站点交付','2026-09-28 16:10:04','2026-09-28 17:58:47'),(22,'SN-PWR-2026-0001',14,NULL,NULL,NULL,NULL,NULL,'2025-10-20',24,'2027-10-20','in_stock','D区-02',NULL,'整流模块','2026-09-28 16:10:04','2026-09-28 17:58:47'),(23,'SN-BAT-2026-0001',15,NULL,NULL,NULL,NULL,NULL,'2025-10-20',36,'2028-10-20','in_stock','D区-02',NULL,'备电电池组','2026-09-28 16:10:04','2026-09-28 17:58:47'),(24,'SN-EOL-2019-0088',7,NULL,NULL,NULL,NULL,NULL,'2019-05-01',36,'2022-05-01','to_scrap','报废区','00:1A:2B:00:99:88','超期服役已报废（原已报废→待报废）','2026-09-28 16:10:04','2026-09-28 17:58:47'),(25,'HW202401003',20,NULL,NULL,NULL,NULL,NULL,'2024-01-20',NULL,'2026-01-20','repairing','机房A-03',NULL,'P8 ??????','2026-09-29 08:00:51','2026-09-29 08:40:34'),(26,'HW202401004',21,NULL,NULL,NULL,NULL,NULL,'2024-01-25',NULL,'2025-01-25','in_use','机房C-01',NULL,'由设备档案迁移 device_id=4 device_code=DEV-004 brand=华为','2026-09-29 08:00:51','2026-09-29 08:00:51'),(27,'ZTE202401001',22,NULL,NULL,NULL,NULL,NULL,'2023-12-01',NULL,'2026-12-01','in_stock','机房D-01',NULL,'由设备档案迁移 device_id=5 device_code=DEV-005 brand=中兴','2026-09-29 08:00:51','2026-09-29 08:00:51'),(28,'P9TEST-155925-A',1,1,4,21,20,NULL,NULL,NULL,NULL,'in_stock','',NULL,'入库收货自动登记','2026-09-29 15:59:26','2026-09-29 17:43:28'),(29,'P9TEST-155925-B',1,1,4,21,20,NULL,NULL,NULL,NULL,'in_stock','',NULL,'入库收货自动登记','2026-09-29 15:59:26','2026-09-29 17:43:28');

/*Table structure for table `shelves` */

DROP TABLE IF EXISTS `shelves`;

CREATE TABLE `shelves` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `zone_id` int(11) NOT NULL,
  `code` varchar(20) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `zone_id` (`zone_id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4;

/*Data for the table `shelves` */

insert  into `shelves`(`id`,`zone_id`,`code`,`name`,`description`,`created_at`) values (1,1,'S001','货架A-1','','2026-09-28 08:11:48'),(2,2,'S002','货架B-1','','2026-09-28 08:11:48'),(3,4,'S-D-02','货架D-02','D区·备件耗材 货架D-02',NULL),(4,4,'S-D-01','货架D-01','D区·备件耗材 货架D-01',NULL),(5,5,'S-T-01','货架T-01','暂存区 货架T-01',NULL),(6,6,'S-A-01','货架A-01','A区·核心网络 货架A-01',NULL),(7,6,'S-A-02','货架A-02','A区·核心网络 货架A-02',NULL),(8,7,'S-C-01','货架C-01','C区·无线终端 货架C-01',NULL),(9,8,'S-R-01','货架R-01','维修区 货架R-01',NULL),(10,9,'S-B-02','货架B-02','B区·传输接入 货架B-02',NULL),(11,9,'S-B-01','货架B-01','B区·传输接入 货架B-01',NULL),(12,10,'S-E-01','货架E-01','E区·分仓存储 货架E-01',NULL),(13,11,'S-F-01','货架F-01','F区·备件仓存储 货架F-01',NULL);

/*Table structure for table `stocktake_items` */

DROP TABLE IF EXISTS `stocktake_items`;

CREATE TABLE `stocktake_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `stocktake_order_id` int(11) NOT NULL COMMENT '???ID',
  `product_id` int(11) NOT NULL COMMENT '??ID',
  `location_id` int(11) DEFAULT NULL COMMENT '??ID',
  `warehouse_id` int(11) NOT NULL COMMENT '??ID???????????',
  `is_piece` tinyint(1) NOT NULL DEFAULT '0' COMMENT '1??(SN)/0??(??)',
  `serial_number` varchar(100) NOT NULL DEFAULT '' COMMENT '??SN???????',
  `batch_no` varchar(50) NOT NULL DEFAULT '' COMMENT '????/?????????',
  `snapshot_qty` decimal(18,4) unsigned NOT NULL DEFAULT '0.0000' COMMENT '?????????1?',
  `counted_qty` decimal(18,4) DEFAULT NULL COMMENT '?????NULL=???',
  `diff_qty` decimal(18,4) NOT NULL DEFAULT '0.0000' COMMENT '??????/????',
  `reason` varchar(50) NOT NULL DEFAULT '' COMMENT '?????????/??/??/????/?????',
  `status` varchar(20) NOT NULL DEFAULT 'pending' COMMENT 'pending??/counted??',
  `is_surplus` tinyint(1) NOT NULL DEFAULT '0' COMMENT '1??????????????????SN???',
  `counted_by` int(11) DEFAULT NULL COMMENT '???',
  `counted_at` datetime DEFAULT NULL COMMENT '????',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_order` (`stocktake_order_id`,`status`),
  KEY `idx_order_sn` (`stocktake_order_id`,`serial_number`),
  KEY `idx_order_batch` (`stocktake_order_id`,`batch_no`),
  KEY `idx_product` (`product_id`),
  CONSTRAINT `fk_si_order` FOREIGN KEY (`stocktake_order_id`) REFERENCES `stocktake_orders` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='??????????SN??/????????';

/*Data for the table `stocktake_items` */

/*Table structure for table `stocktake_orders` */

DROP TABLE IF EXISTS `stocktake_orders`;

CREATE TABLE `stocktake_orders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_number` varchar(32) NOT NULL COMMENT '?????PD+Ymd+4????',
  `warehouse_id` int(11) NOT NULL COMMENT '??ID',
  `type` varchar(20) NOT NULL DEFAULT 'full' COMMENT 'full??/partial??/dynamic????',
  `scope_type` varchar(20) NOT NULL DEFAULT 'all' COMMENT 'all??/category???/location?????',
  `scope_value` varchar(255) NOT NULL DEFAULT '' COMMENT '??????ID/??ID?????',
  `status` varchar(20) NOT NULL DEFAULT 'draft' COMMENT 'draft/counting/pending_review/completed/cancelled',
  `keeper_id` int(11) DEFAULT NULL COMMENT '?????',
  `snapshot_at` datetime DEFAULT NULL COMMENT '????????????',
  `submitted_at` datetime DEFAULT NULL COMMENT '??????',
  `reviewer_id` int(11) DEFAULT NULL COMMENT '???',
  `reviewed_at` datetime DEFAULT NULL COMMENT '????',
  `review_notes` varchar(500) NOT NULL DEFAULT '' COMMENT '????',
  `adjustment_number` varchar(40) NOT NULL DEFAULT '' COMMENT '??????????PD-ADJ-Ymd-???',
  `total_snapshot_qty` decimal(18,4) unsigned NOT NULL DEFAULT '0.0000' COMMENT '????',
  `total_counted_qty` decimal(18,4) NOT NULL DEFAULT '0.0000' COMMENT '????',
  `total_diff_qty` decimal(18,4) NOT NULL DEFAULT '0.0000' COMMENT '????????????',
  `item_total` int(11) NOT NULL DEFAULT '0' COMMENT '????',
  `item_counted` int(11) NOT NULL DEFAULT '0' COMMENT '????',
  `item_diff` int(11) NOT NULL DEFAULT '0' COMMENT '????',
  `notes` varchar(500) NOT NULL DEFAULT '' COMMENT '??',
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_order_number` (`order_number`),
  KEY `idx_warehouse_status` (`warehouse_id`,`status`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COMMENT='?????';

/*Data for the table `stocktake_orders` */

insert  into `stocktake_orders`(`id`,`order_number`,`warehouse_id`,`type`,`scope_type`,`scope_value`,`status`,`keeper_id`,`snapshot_at`,`submitted_at`,`reviewer_id`,`reviewed_at`,`review_notes`,`adjustment_number`,`total_snapshot_qty`,`total_counted_qty`,`total_diff_qty`,`item_total`,`item_counted`,`item_diff`,`notes`,`created_by`,`updated_by`,`created_at`,`updated_at`,`deleted_at`) values (1,'PD202609290001',3,'full','all','','cancelled',1,'2026-09-29 20:30:32',NULL,NULL,NULL,'取消原因：test cleanup','','0.0000','0.0000','0.0000',0,0,0,'test',1,1,'2026-09-29 20:30:33','2026-09-29 20:49:02',NULL),(2,'PD202609290002',1,'partial','location','7','cancelled',1,'2026-09-29 20:45:30',NULL,NULL,NULL,'取消原因：test cleanup','','0.0000','0.0000','0.0000',0,0,0,'P10-test-location7',1,1,'2026-09-29 20:45:30','2026-09-29 20:49:03',NULL);

/*Table structure for table `suppliers` */

DROP TABLE IF EXISTS `suppliers`;

CREATE TABLE `suppliers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(20) NOT NULL,
  `name` varchar(100) NOT NULL,
  `contact_person` varchar(50) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4;

/*Data for the table `suppliers` */

insert  into `suppliers`(`id`,`code`,`name`,`contact_person`,`phone`,`email`,`address`,`status`,`created_at`,`updated_at`) values (1,'SUP001','供应商A','张三','13800138001','zhangsan@supplier.com','北京市','active','2026-09-28 08:11:48','2026-09-28 08:11:48'),(2,'SUP002','供应商B','李四','13800138002','lisi@supplier.com','上海市','active','2026-09-28 08:11:48','2026-09-28 08:11:48'),(3,'SUP-HW','华为技术有限公司','张伟','13800000001','hw@example.com','深圳市龙岗区坂田华为基地','active',NULL,NULL),(4,'SUP-ZTE','中兴通讯股份有限公司','李娜','13800000002','zte@example.com','深圳市南山区科技园','active',NULL,NULL),(5,'SUP-FH','烽火通信科技股份有限公司','王强','13800000003','fh@example.com','武汉市东湖高新区','active',NULL,NULL),(6,'SUP-CISCO','思科系统（中国）','赵敏','13800000004','cisco@example.com','上海市浦东新区','active',NULL,NULL),(7,'SUP-TP','普联技术有限公司','陈静','13800000005','tp@example.com','深圳市南山区科技园','active',NULL,NULL);

/*Table structure for table `user_warehouse_grant` */

DROP TABLE IF EXISTS `user_warehouse_grant`;

CREATE TABLE `user_warehouse_grant` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) unsigned NOT NULL COMMENT '被授权账号ID',
  `warehouse_id` int(11) unsigned NOT NULL COMMENT '授权仓库ID',
  `grant_role` enum('manager','operator') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'operator' COMMENT '仓库级角色：manager=可审核过账，operator=仅录入',
  `status` enum('active','revoked') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active' COMMENT 'active 生效 / revoked 已撤销（留痕不删）',
  `granted_by` int(11) unsigned DEFAULT NULL COMMENT '授权人（系统管理员）',
  `granted_at` datetime DEFAULT NULL COMMENT '授权时间',
  `revoked_by` int(11) unsigned DEFAULT NULL COMMENT '撤销人',
  `revoked_at` datetime DEFAULT NULL COMMENT '撤销时间',
  `remark` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '备注（代维方名称、授权事由）',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL COMMENT '软删除（正常不用，授权变更走 status）',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_warehouse` (`user_id`,`warehouse_id`),
  KEY `idx_warehouse` (`warehouse_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='账号-仓库授权表';

/*Data for the table `user_warehouse_grant` */

insert  into `user_warehouse_grant`(`id`,`user_id`,`warehouse_id`,`grant_role`,`status`,`granted_by`,`granted_at`,`revoked_by`,`revoked_at`,`remark`,`created_at`,`updated_at`,`deleted_at`) values (1,1,1,'manager','active',1,'2026-09-28 09:48:01',NULL,NULL,'系统初始化授权','2026-09-28 09:48:01','2026-09-28 09:48:01',NULL),(2,1,2,'manager','active',1,'2026-09-28 09:48:01',NULL,NULL,'系统初始化授权','2026-09-28 09:48:01','2026-09-28 09:48:01',NULL),(4,2,1,'operator','active',1,'2026-09-28 09:48:01',NULL,NULL,'示例录入员授权','2026-09-28 09:48:01','2026-09-28 09:48:01',NULL),(5,2,2,'manager','revoked',1,'2026-09-28 13:20:09',1,'2026-09-28 13:20:10','P7 revoke','2026-09-28 11:39:01','2026-09-28 13:20:10',NULL),(6,1,3,'manager','active',1,'2026-09-28 16:10:03',NULL,NULL,'系统初始化：管理员全量授权','2026-09-28 16:10:03','2026-09-28 16:10:03',NULL),(7,4,1,'manager','active',1,'2026-09-28 16:10:03',NULL,NULL,'主仓库现场负责人','2026-09-28 16:10:03','2026-09-28 16:10:03',NULL),(9,3,2,'operator','active',1,'2026-09-28 16:10:03',NULL,NULL,'华为代维方：分仓 + 备件仓','2026-09-28 16:10:03','2026-09-28 16:10:03',NULL),(10,5,3,'operator','active',1,'2026-09-28 16:10:03',NULL,NULL,'盘点员：备件仓','2026-09-28 16:10:03','2026-09-28 16:10:03',NULL);

/*Table structure for table `users` */

DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `real_name` varchar(50) DEFAULT NULL,
  `email` varchar(100) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('admin','manager','operator','viewer') NOT NULL DEFAULT 'operator',
  `vendor_id` int(11) DEFAULT NULL COMMENT '代维方归属（可空）',
  `department_id` int(11) DEFAULT NULL COMMENT '部门ID（保留，不做隔离）',
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `last_login_time` datetime DEFAULT NULL,
  `last_login_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL COMMENT '软删除时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_vendor` (`vendor_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4;

/*Data for the table `users` */

insert  into `users`(`id`,`username`,`real_name`,`email`,`phone`,`password_hash`,`role`,`vendor_id`,`department_id`,`status`,`last_login_time`,`last_login_at`,`created_at`,`updated_at`,`deleted_at`) values (1,'admin','系统管理员','admin@monawms.com','13800001000','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','admin',NULL,NULL,'active',NULL,'2026-09-29 20:27:26','2026-09-28 08:11:48','2026-09-29 20:27:26',NULL),(2,'operator','录入员','operator@monawms.com','13800138000','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','operator',NULL,NULL,'active',NULL,'2026-09-28 13:20:06','2026-09-28 09:48:01','2026-09-28 13:20:06',NULL),(3,'vendor_hw','张伟（华为代维）','vendor_hw@monawms.com','13800001001','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','operator',1,NULL,'active',NULL,NULL,NULL,NULL,NULL),(4,'wh_manager','李静（仓库主管）','wh_manager@monawms.com','13800001002','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','operator',NULL,NULL,'active',NULL,NULL,NULL,NULL,NULL),(5,'inventor','王强（盘点员）','inventor@monawms.com','13800001003','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','operator',NULL,NULL,'active',NULL,NULL,NULL,NULL,NULL);

/*Table structure for table `warehouses` */

DROP TABLE IF EXISTS `warehouses`;

CREATE TABLE `warehouses` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(20) NOT NULL,
  `name` varchar(100) NOT NULL,
  `address` text,
  `manager_id` int(11) DEFAULT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `total_capacity` int(11) NOT NULL DEFAULT '0',
  `created_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL COMMENT '软删除时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4;

/*Data for the table `warehouses` */

insert  into `warehouses`(`id`,`code`,`name`,`address`,`manager_id`,`status`,`total_capacity`,`created_at`,`deleted_at`) values (1,'WH001','主仓库','北京市朝阳区xxx路xxx号',1,'active',10000,'2026-09-28 08:11:48',NULL),(2,'WH002','分仓库','上海市浦东新区xxx路xxx号',1,'active',5000,'2026-09-28 08:11:48',NULL),(3,'WH003','备件仓','XX市XX区通信设备备件中心',1,'active',2000,NULL,NULL);

/*Table structure for table `wireless_spare_parts` */

DROP TABLE IF EXISTS `wireless_spare_parts`;

CREATE TABLE `wireless_spare_parts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(50) NOT NULL,
  `part_name` varchar(100) NOT NULL,
  `model` varchar(100) DEFAULT NULL,
  `serial_number` varchar(100) DEFAULT NULL,
  `type` enum('5G','4G','3G','2G','other') NOT NULL DEFAULT 'other',
  `quantity` int(11) NOT NULL DEFAULT '1',
  `operator` varchar(50) DEFAULT NULL,
  `project` varchar(100) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'inbound',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4;

/*Data for the table `wireless_spare_parts` */

insert  into `wireless_spare_parts`(`id`,`code`,`part_name`,`model`,`serial_number`,`type`,`quantity`,`operator`,`project`,`status`,`created_at`,`updated_at`) values (1,'WSP-001','5G射频模块','RF-5G-001','SN5G0001','5G',10,'admin','示范项目','inbound','2026-09-28 08:11:48','2026-09-28 08:11:48'),(2,'WSP-002','4G天馈单元','ANT-4G-001','SN4G0001','4G',5,'admin','','inbound','2026-09-28 08:11:48','2026-09-28 08:11:48'),(3,'WSP-2026-0001','5G AAU整机备件','AAU5613','SN-WSP-AAU-0001','5G',3,'张伟','PRJ-2026-5G-001','inbound','2026-01-06 09:00:00','2026-09-28 17:58:47'),(4,'WSP-2026-0002','5G RRU整机备件','RRU3971','SN-WSP-RRU-0002','5G',5,'李静','PRJ-2026-5G-001','inbound','2026-01-06 09:10:00','2026-09-28 17:58:47'),(5,'WSP-2026-0003','BBU主控板','UMPTe3','SN-WSP-BBU-0003','5G',2,'张伟','PRJ-2026-5G-001','outbound','2026-02-11 10:20:00','2026-09-28 17:58:47'),(6,'WSP-2026-0004','4G LTE基带板','LBBPd4','SN-WSP-LTE-0004','4G',4,'王强',NULL,'inbound','2026-03-02 14:00:00','2026-09-28 17:58:47'),(7,'WSP-2026-0005','3G WCDMA板卡','WBBP7','SN-WSP-WCDMA-0005','3G',2,'王强',NULL,'returned','2026-03-18 15:30:00','2026-09-28 17:58:47'),(8,'WSP-2026-0006','2G GSM载频模块','GTMUc','SN-WSP-GSM-0006','2G',6,'张伟',NULL,'inbound','2026-04-08 11:00:00','2026-09-28 17:58:47'),(9,'WSP-2026-0007','GPS天线备件','ANT-GPS-01','SN-WSP-GPS-0007','other',10,'李静','PRJ-2026-TWR-003','inbound','2026-04-25 09:40:00','2026-09-28 17:58:47'),(10,'WSP-2026-0008','RRU 光电复合缆','CPRI-10M',NULL,'5G',20,'赵敏',NULL,'outbound','2026-05-10 16:20:00','2026-09-28 17:58:47'),(11,'WSP-2026-0009','AAU 供电模块','PSU-AAU-48V','SN-WSP-PSU-0009','5G',4,'张伟','PRJ-2026-5G-001','returned','2026-06-02 10:00:00','2026-09-28 17:58:47'),(12,'WSP-2026-0010','WiFi6 AP 备机','AirEngine5760-10','SN-WSP-AP-0010','other',12,'李静','PRJ-2026-WLAN-004','inbound','2026-06-18 13:15:00','2026-09-28 17:58:47');

/*Table structure for table `zones` */

DROP TABLE IF EXISTS `zones`;

CREATE TABLE `zones` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `warehouse_id` int(11) NOT NULL,
  `code` varchar(20) NOT NULL,
  `name` varchar(100) NOT NULL,
  `type` varchar(20) NOT NULL DEFAULT 'storage',
  `description` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `warehouse_id` (`warehouse_id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4;

/*Data for the table `zones` */

insert  into `zones`(`id`,`warehouse_id`,`code`,`name`,`type`,`description`,`created_at`) values (1,1,'Z001','A区存储区','storage','常温存储','2026-09-28 08:11:48'),(2,2,'Z002','B区拣货区','picking','拣货作业区','2026-09-28 08:11:48'),(4,1,'Z-D','D区·备件耗材','storage','电源、电池、线缆',NULL),(5,1,'Z-T','暂存区','staging','待检与待发设备',NULL),(6,1,'Z-A','A区·核心网络','storage','核心路由器、交换机、防火墙',NULL),(7,1,'Z-C','C区·无线终端','storage','AP、天线、RRU',NULL),(8,1,'Z-R','维修区','storage','待修与返修设备',NULL),(9,1,'Z-B','B区·传输接入','storage','OLT/ONU/光模块',NULL),(10,2,'Z-E','E区·分仓存储','storage','分仓通用存储',NULL),(11,3,'Z-F','F区·备件仓存储','storage','备件与周转机器',NULL);

/*Table structure for table `form_metadata` */

DROP TABLE IF EXISTS `form_metadata`;

CREATE TABLE `form_metadata` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `form_key` varchar(64) NOT NULL COMMENT '表单标识（全链路唯一，发布后不可改）',
  `version` int(11) NOT NULL DEFAULT '1' COMMENT '版本号，同 form_key 内只增',
  `title` varchar(128) NOT NULL COMMENT '表单标题',
  `schema_json` json NOT NULL COMMENT '归一化元数据：{layout, fields[{prop,label,type,required,options,...}]}',
  `status` varchar(20) NOT NULL DEFAULT 'draft' COMMENT 'draft草稿/published已发布/archived已归档',
  `change_note` varchar(500) NOT NULL DEFAULT '' COMMENT '版本变更说明',
  `created_by` int(11) DEFAULT NULL,
  `published_at` datetime DEFAULT NULL COMMENT '发布时间',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_form_key_version` (`form_key`,`version`),
  KEY `idx_form_key_status` (`form_key`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='DIY表单元数据（每版本一行）';

/*Data for the table `form_metadata` */

insert  into `form_metadata`(`id`,`form_key`,`version`,`title`,`schema_json`,`status`,`change_note`,`created_by`,`published_at`,`created_at`,`updated_at`) values
(1,'site_patrol',1,'基站巡检单','{\"layout\": {\"columns\": 2}, \"fields\": [{\"prop\": \"site_code\", \"label\": \"基站编码\", \"type\": \"text\", \"required\": true, \"maxLen\": 64}, {\"prop\": \"patrol_date\", \"label\": \"巡检日期\", \"type\": \"date\", \"required\": true}, {\"prop\": \"patrol_result\", \"label\": \"巡检结果\", \"type\": \"select\", \"required\": true, \"options\": [{\"label\": \"正常\", \"value\": \"OK\"}, {\"label\": \"异常\", \"value\": \"ABNORMAL\"}]}, {\"prop\": \"sn_check\", \"label\": \"在网设备SN\", \"type\": \"sn-scan\", \"multiple\": true}, {\"prop\": \"photos\", \"label\": \"现场照片\", \"type\": \"file\", \"accept\": \"image/*\", \"max\": 6}, {\"prop\": \"remark\", \"label\": \"备注\", \"type\": \"textarea\", \"maxLen\": 5000}]}','published','初始版本',1,'2026-10-04 08:00:00','2026-10-04 08:00:00','2026-10-04 08:00:00');

/*Table structure for table `form_records` */

DROP TABLE IF EXISTS `form_records`;

CREATE TABLE `form_records` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `form_key` varchar(64) NOT NULL COMMENT '所属表单',
  `form_version` int(11) NOT NULL DEFAULT '1' COMMENT '写入时的表单版本（宽容渲染依据）',
  `biz_ref` varchar(64) NOT NULL DEFAULT '' COMMENT '可选挂接核心单号（如盘点单号/入库单号）',
  `ext_attrs` json NOT NULL COMMENT 'DIY 字段值 JSON，键 = 元数据 fields[].prop',
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL COMMENT '软删除时间',
  PRIMARY KEY (`id`),
  KEY `idx_form_key_deleted_created` (`form_key`,`deleted_at`,`created_at`),
  KEY `idx_form_key_creator` (`form_key`,`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='DIY表单记录（数据全进 ext_attrs）';

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

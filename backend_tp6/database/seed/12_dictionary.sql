-- ============================================================
-- 12 数据字典（类型 + 字典项）
-- 幂等：dictionary_types.code / (type_id, code) 为唯一键
-- ============================================================
SET NAMES utf8mb4;

INSERT INTO `dictionary_types` (`code`,`name`,`description`,`status`) VALUES
('unit','计量单位','物料计量单位','active'),
('device_location','存放区域','设备/物料存放区域','active'),
('order_priority','单据优先级','出入库单优先级','active'),
('scrap_reason','报废原因','报废申请原因分类','active'),
('project_status','项目状态','项目生命周期状态','active'),
('wireless_type','无线备件类型','无线备件网络制式','active')
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`), `description`=VALUES(`description`), `status`=VALUES(`status`);

INSERT INTO `dictionary_items` (`type_id`,`code`,`name`,`value`,`sort_order`,`status`) VALUES
((SELECT id FROM `dictionary_types` WHERE `code`='unit'),'pcs','台','台',1,'active'),
((SELECT id FROM `dictionary_types` WHERE `code`='unit'),'pcs2','只','只',2,'active'),
((SELECT id FROM `dictionary_types` WHERE `code`='unit'),'set','套','套',3,'active'),
((SELECT id FROM `dictionary_types` WHERE `code`='unit'),'pcs3','组','组',4,'active'),
((SELECT id FROM `dictionary_types` WHERE `code`='unit'),'pcs4','条','条',5,'active'),
((SELECT id FROM `dictionary_types` WHERE `code`='unit'),'pcs5','根','根',6,'active'),
((SELECT id FROM `dictionary_types` WHERE `code`='unit'),'pcs6','副','副',7,'active'),
((SELECT id FROM `dictionary_types` WHERE `code`='device_location'),'zone-a','A区·核心网络','A区',1,'active'),
((SELECT id FROM `dictionary_types` WHERE `code`='device_location'),'zone-b','B区·传输接入','B区',2,'active'),
((SELECT id FROM `dictionary_types` WHERE `code`='device_location'),'zone-c','C区·无线终端','C区',3,'active'),
((SELECT id FROM `dictionary_types` WHERE `code`='device_location'),'zone-d','D区·备件耗材','D区',4,'active'),
((SELECT id FROM `dictionary_types` WHERE `code`='device_location'),'zone-r','维修区','维修区',5,'active'),
((SELECT id FROM `dictionary_types` WHERE `code`='device_location'),'zone-t','暂存区','暂存区',6,'active'),
((SELECT id FROM `dictionary_types` WHERE `code`='order_priority'),'low','低','low',1,'active'),
((SELECT id FROM `dictionary_types` WHERE `code`='order_priority'),'normal','普通','normal',2,'active'),
((SELECT id FROM `dictionary_types` WHERE `code`='order_priority'),'high','高','high',3,'active'),
((SELECT id FROM `dictionary_types` WHERE `code`='order_priority'),'urgent','紧急','urgent',4,'active'),
((SELECT id FROM `dictionary_types` WHERE `code`='scrap_reason'),'damage','设备损坏','damage',1,'active'),
((SELECT id FROM `dictionary_types` WHERE `code`='scrap_reason'),'obsolete','技术淘汰','obsolete',2,'active'),
((SELECT id FROM `dictionary_types` WHERE `code`='scrap_reason'),'expired','超期使用','expired',3,'active'),
((SELECT id FROM `dictionary_types` WHERE `code`='scrap_reason'),'other','其他原因','other',4,'active'),
((SELECT id FROM `dictionary_types` WHERE `code`='project_status'),'planning','规划中','planning',1,'active'),
((SELECT id FROM `dictionary_types` WHERE `code`='project_status'),'executing','执行中','executing',2,'active'),
((SELECT id FROM `dictionary_types` WHERE `code`='project_status'),'completed','已完成','completed',3,'active'),
((SELECT id FROM `dictionary_types` WHERE `code`='project_status'),'cancelled','已取消','cancelled',4,'active'),
((SELECT id FROM `dictionary_types` WHERE `code`='wireless_type'),'5g','5G','5G',1,'active'),
((SELECT id FROM `dictionary_types` WHERE `code`='wireless_type'),'4g','4G','4G',2,'active'),
((SELECT id FROM `dictionary_types` WHERE `code`='wireless_type'),'3g','3G','3G',3,'active'),
((SELECT id FROM `dictionary_types` WHERE `code`='wireless_type'),'2g','2G','2G',4,'active'),
((SELECT id FROM `dictionary_types` WHERE `code`='wireless_type'),'other','其他','other',5,'active')
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`), `value`=VALUES(`value`), `sort_order`=VALUES(`sort_order`), `status`=VALUES(`status`);

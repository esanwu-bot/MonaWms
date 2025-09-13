-- 创建数据字典类型表
CREATE TABLE IF NOT EXISTS `dictionary_types` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(50) NOT NULL COMMENT '字典类型编码',
  `name` varchar(100) NOT NULL COMMENT '字典类型名称',
  `description` varchar(255) DEFAULT NULL COMMENT '描述',
  `status` enum('active', 'inactive') NOT NULL DEFAULT 'active' COMMENT '状态',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='数据字典类型表';

-- 创建数据字典项表
CREATE TABLE IF NOT EXISTS `dictionary_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `type_id` int(11) NOT NULL COMMENT '字典类型ID',
  `code` varchar(50) NOT NULL COMMENT '字典项编码',
  `name` varchar(100) NOT NULL COMMENT '字典项名称',
  `value` varchar(255) DEFAULT NULL COMMENT '字典项值',
  `sort_order` int(11) NOT NULL DEFAULT 0 COMMENT '排序',
  `status` enum('active', 'inactive') NOT NULL DEFAULT 'active' COMMENT '状态',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_type_code` (`type_id`, `code`),
  KEY `idx_type_id` (`type_id`),
  CONSTRAINT `fk_dictionary_item_type` FOREIGN KEY (`type_id`) REFERENCES `dictionary_types` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='数据字典项表';

-- 插入初始数据
INSERT INTO `dictionary_types` (`code`, `name`, `description`, `status`) VALUES
('device_type', '设备类型', '设备类型字典', 'active'),
('device_model', '设备型号', '设备型号字典', 'active'),
('device_brand', '设备品牌', '设备品牌字典', 'active'),
('device_status', '设备状态', '设备状态字典', 'active');

-- 插入设备类型字典项
INSERT INTO `dictionary_items` (`type_id`, `code`, `name`, `sort_order`, `status`) VALUES
(1, '5g-base', '5G基站', 1, 'active'),
(1, 'core-network', '核心网设备', 2, 'active'),
(1, 'optical', '光传输设备', 3, 'active'),
(1, 'router', '路由器', 4, 'active'),
(1, 'switch', '交换机', 5, 'active');

-- 插入设备型号字典项
INSERT INTO `dictionary_items` (`type_id`, `code`, `name`, `sort_order`, `status`) VALUES
(2, 'model-a1', 'Model A1', 1, 'active'),
(2, 'model-b2', 'Model B2', 2, 'active');

-- 插入设备品牌字典项
INSERT INTO `dictionary_items` (`type_id`, `code`, `name`, `sort_order`, `status`) VALUES
(3, 'huawei', '华为', 1, 'active'),
(3, 'zte', '中兴', 2, 'active');

-- 插入设备状态字典项
INSERT INTO `dictionary_items` (`type_id`, `code`, `name`, `sort_order`, `status`) VALUES
(4, 'normal', '正常', 1, 'active'),
(4, 'maintenance', '维护中', 2, 'active'),
(4, 'fault', '故障', 3, 'active'),
(4, 'scrapped', '已报废', 4, 'active');
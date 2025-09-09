-- 通信行业WMS升级脚本

-- 1. 为products表添加通信行业特有属性字段
ALTER TABLE `products` 
ADD COLUMN `device_type` VARCHAR(50) COMMENT '设备类型(如：基站、路由器、光模块)' AFTER `description`,
ADD COLUMN `model_number` VARCHAR(100) COMMENT '具体型号(如：HUAWEI MA5683T)' AFTER `device_type`,
ADD COLUMN `frequency_protocol` VARCHAR(100) COMMENT '频段/协议(如：5G 700MHz, WiFi 6)' AFTER `model_number`,
ADD COLUMN `firmware_version` VARCHAR(50) COMMENT '固件版本' AFTER `frequency_protocol`,
ADD COLUMN `project_id` INT NULL COMMENT '所属项目ID' AFTER `status`;

-- 2. 创建序列号管理表
CREATE TABLE `serial_numbers` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `product_id` INT(11) NOT NULL COMMENT '关联产品ID',
  `serial_number` VARCHAR(100) NOT NULL COMMENT 'SN序列号',
  `mac_address` VARCHAR(50) NULL COMMENT 'MAC地址',
  `status` ENUM('in_stock', 'reserved', 'shipped', 'installed', 'returned', 'scrapped') DEFAULT 'in_stock' COMMENT '状态',
  `location_id` INT(11) NULL COMMENT '当前库位ID',
  `inbound_order_item_id` INT(11) NULL COMMENT '入库单明细ID',
  `outbound_order_item_id` INT(11) NULL COMMENT '出库单明细ID',
  `project_id` INT(11) NULL COMMENT '所属项目ID',
  `notes` TEXT NULL COMMENT '备注',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_serial_number` (`serial_number`),
  KEY `product_id` (`product_id`),
  KEY `location_id` (`location_id`),
  KEY `project_id` (`project_id`),
  CONSTRAINT `serial_numbers_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  CONSTRAINT `serial_numbers_ibfk_2` FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. 创建序列号历史记录表
CREATE TABLE `serial_number_history` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `serial_number_id` INT(11) NOT NULL COMMENT '序列号ID',
  `event_type` ENUM('inbound', 'outbound', 'transfer', 'return', 'install', 'repair', 'scrap') NOT NULL COMMENT '事件类型',
  `status_before` VARCHAR(50) NULL COMMENT '之前状态',
  `status_after` VARCHAR(50) NULL COMMENT '之后状态',
  `location_before` INT(11) NULL COMMENT '之前库位',
  `location_after` INT(11) NULL COMMENT '之后库位',
  `reference_type` VARCHAR(50) NULL COMMENT '关联单据类型',
  `reference_id` INT(11) NULL COMMENT '关联单据ID',
  `operator_id` INT(11) NULL COMMENT '操作人ID',
  `notes` TEXT NULL COMMENT '备注',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `serial_number_id` (`serial_number_id`),
  KEY `operator_id` (`operator_id`),
  CONSTRAINT `serial_number_history_ibfk_1` FOREIGN KEY (`serial_number_id`) REFERENCES `serial_numbers` (`id`),
  CONSTRAINT `serial_number_history_ibfk_2` FOREIGN KEY (`operator_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. 创建项目表
CREATE TABLE `projects` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(50) NOT NULL COMMENT '项目编码',
  `name` VARCHAR(100) NOT NULL COMMENT '项目名称',
  `customer_id` INT(11) NULL COMMENT '客户ID',
  `start_date` DATE NULL COMMENT '开始日期',
  `end_date` DATE NULL COMMENT '结束日期',
  `status` ENUM('planning', 'in_progress', 'completed', 'cancelled') DEFAULT 'planning' COMMENT '状态',
  `description` TEXT NULL COMMENT '描述',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `customer_id` (`customer_id`),
  CONSTRAINT `projects_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. 创建项目库存预留表
CREATE TABLE `project_inventory_reservations` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `project_id` INT(11) NOT NULL COMMENT '项目ID',
  `product_id` INT(11) NOT NULL COMMENT '产品ID',
  `quantity` INT(11) NOT NULL DEFAULT 0 COMMENT '预留数量',
  `reserved_date` DATE NULL COMMENT '预留日期',
  `expected_release_date` DATE NULL COMMENT '预计释放日期',
  `status` ENUM('active', 'partially_fulfilled', 'fulfilled', 'cancelled') DEFAULT 'active' COMMENT '状态',
  `notes` TEXT NULL COMMENT '备注',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `project_id` (`project_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `project_inventory_reservations_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`),
  CONSTRAINT `project_inventory_reservations_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. 创建BOM（物料清单）表
CREATE TABLE `bom_masters` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(50) NOT NULL COMMENT 'BOM编码',
  `name` VARCHAR(100) NOT NULL COMMENT 'BOM名称',
  `product_id` INT(11) NOT NULL COMMENT '主产品ID',
  `version` VARCHAR(20) NOT NULL DEFAULT '1.0' COMMENT '版本号',
  `status` ENUM('draft', 'active', 'obsolete') DEFAULT 'draft' COMMENT '状态',
  `notes` TEXT NULL COMMENT '备注',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `bom_masters_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. 创建BOM明细表
CREATE TABLE `bom_items` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `bom_id` INT(11) NOT NULL COMMENT 'BOM主表ID',
  `component_product_id` INT(11) NOT NULL COMMENT '组件产品ID',
  `quantity` INT(11) NOT NULL DEFAULT 1 COMMENT '数量',
  `unit` VARCHAR(20) NULL COMMENT '单位',
  `position` VARCHAR(50) NULL COMMENT '位置编号',
  `is_key_component` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否关键组件',
  `notes` TEXT NULL COMMENT '备注',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `bom_id` (`bom_id`),
  KEY `component_product_id` (`component_product_id`),
  CONSTRAINT `bom_items_ibfk_1` FOREIGN KEY (`bom_id`) REFERENCES `bom_masters` (`id`),
  CONSTRAINT `bom_items_ibfk_2` FOREIGN KEY (`component_product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. 修改入库单明细表，添加序列号相关字段
ALTER TABLE `inbound_order_items`
ADD COLUMN `requires_serial` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否需要序列号' AFTER `rejected_quantity`;

-- 9. 修改出库单明细表，添加序列号相关字段
ALTER TABLE `outbound_order_items`
ADD COLUMN `requires_serial` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否需要序列号' AFTER `shipped_quantity`,
ADD COLUMN `project_id` INT(11) NULL COMMENT '项目ID' AFTER `requires_serial`;

-- 10. 为出库单表添加项目字段
ALTER TABLE `outbound_orders`
ADD COLUMN `project_id` INT(11) NULL COMMENT '项目ID' AFTER `customer_id`;
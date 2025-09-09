-- MonaWMS 数据库表结构
-- 创建数据库
CREATE DATABASE IF NOT EXISTS `monawms` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `monawms`;

-- 用户表
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('admin','manager','operator','viewer') DEFAULT 'operator',
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 仓库表
CREATE TABLE `warehouses` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(20) NOT NULL,
  `name` varchar(100) NOT NULL,
  `address` text,
  `manager_id` int(11) DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `manager_id` (`manager_id`),
  CONSTRAINT `warehouses_ibfk_1` FOREIGN KEY (`manager_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 库区表
CREATE TABLE `zones` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `warehouse_id` int(11) NOT NULL,
  `code` varchar(20) NOT NULL,
  `name` varchar(100) NOT NULL,
  `zone_type` enum('storage','picking','packing','staging') DEFAULT 'storage',
  PRIMARY KEY (`id`),
  KEY `warehouse_id` (`warehouse_id`),
  CONSTRAINT `zones_ibfk_1` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 货架表
CREATE TABLE `shelves` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `zone_id` int(11) NOT NULL,
  `code` varchar(20) NOT NULL,
  `name` varchar(100) NOT NULL,
  `capacity` decimal(10,2) DEFAULT NULL,
  `current_load` decimal(10,2) DEFAULT '0.00',
  PRIMARY KEY (`id`),
  KEY `zone_id` (`zone_id`),
  CONSTRAINT `shelves_ibfk_1` FOREIGN KEY (`zone_id`) REFERENCES `zones` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 库位表
CREATE TABLE `locations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `shelf_id` int(11) NOT NULL,
  `code` varchar(20) NOT NULL,
  `barcode` varchar(50) DEFAULT NULL,
  `status` enum('available','occupied','reserved','blocked') DEFAULT 'available',
  PRIMARY KEY (`id`),
  KEY `shelf_id` (`shelf_id`),
  CONSTRAINT `locations_ibfk_1` FOREIGN KEY (`shelf_id`) REFERENCES `shelves` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 商品分类表
CREATE TABLE `categories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `parent_id` int(11) DEFAULT NULL,
  `code` varchar(20) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `parent_id` (`parent_id`),
  CONSTRAINT `categories_ibfk_1` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 商品表
CREATE TABLE `products` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `sku` varchar(50) NOT NULL,
  `name` varchar(200) NOT NULL,
  `category_id` int(11) DEFAULT NULL,
  `barcode` varchar(50) DEFAULT NULL,
  `unit` varchar(20) DEFAULT 'pcs',
  `weight` decimal(8,3) DEFAULT NULL,
  `volume` decimal(8,3) DEFAULT NULL,
  `min_stock` int(11) DEFAULT '0',
  `max_stock` int(11) DEFAULT '0',
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sku` (`sku`),
  KEY `category_id` (`category_id`),
  CONSTRAINT `products_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 库存表
CREATE TABLE `inventory` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` int(11) NOT NULL,
  `location_id` int(11) NOT NULL,
  `batch_no` varchar(50) DEFAULT NULL,
  `quantity` int(11) NOT NULL DEFAULT '0',
  `reserved_quantity` int(11) DEFAULT '0',
  `available_quantity` int(11) GENERATED ALWAYS AS ((`quantity` - `reserved_quantity`)) STORED,
  `production_date` date DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `last_updated` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_product_location_batch` (`product_id`,`location_id`,`batch_no`),
  KEY `location_id` (`location_id`),
  CONSTRAINT `inventory_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  CONSTRAINT `inventory_ibfk_2` FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 库存变动记录表
CREATE TABLE `inventory_transactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` int(11) NOT NULL,
  `location_id` int(11) NOT NULL,
  `transaction_type` enum('inbound','outbound','transfer','adjustment') NOT NULL,
  `quantity_change` int(11) NOT NULL,
  `quantity_before` int(11) NOT NULL,
  `quantity_after` int(11) NOT NULL,
  `reference_type` enum('inbound_order','outbound_order','transfer_order','adjustment') NOT NULL,
  `reference_id` int(11) NOT NULL,
  `operator_id` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `product_id` (`product_id`),
  KEY `location_id` (`location_id`),
  KEY `operator_id` (`operator_id`),
  CONSTRAINT `inventory_transactions_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  CONSTRAINT `inventory_transactions_ibfk_2` FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`),
  CONSTRAINT `inventory_transactions_ibfk_3` FOREIGN KEY (`operator_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 供应商表
CREATE TABLE `suppliers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(20) NOT NULL,
  `name` varchar(100) NOT NULL,
  `contact_person` varchar(50) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `address` text,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 客户表
CREATE TABLE `customers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(20) NOT NULL,
  `name` varchar(100) NOT NULL,
  `contact_person` varchar(50) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `address` text,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 入库单表
CREATE TABLE `inbound_orders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_no` varchar(50) NOT NULL,
  `supplier_id` int(11) DEFAULT NULL,
  `warehouse_id` int(11) NOT NULL,
  `status` enum('pending','receiving','quality_check','completed','cancelled') DEFAULT 'pending',
  `expected_date` date DEFAULT NULL,
  `received_date` date DEFAULT NULL,
  `operator_id` int(11) DEFAULT NULL,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_no` (`order_no`),
  KEY `supplier_id` (`supplier_id`),
  KEY `warehouse_id` (`warehouse_id`),
  KEY `operator_id` (`operator_id`),
  CONSTRAINT `inbound_orders_ibfk_1` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`),
  CONSTRAINT `inbound_orders_ibfk_2` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`),
  CONSTRAINT `inbound_orders_ibfk_3` FOREIGN KEY (`operator_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 入库单明细表
CREATE TABLE `inbound_order_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `inbound_order_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `expected_quantity` int(11) NOT NULL,
  `received_quantity` int(11) DEFAULT '0',
  `quality_checked_quantity` int(11) DEFAULT '0',
  `rejected_quantity` int(11) DEFAULT '0',
  `batch_no` varchar(50) DEFAULT NULL,
  `production_date` date DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `inbound_order_id` (`inbound_order_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `inbound_order_items_ibfk_1` FOREIGN KEY (`inbound_order_id`) REFERENCES `inbound_orders` (`id`),
  CONSTRAINT `inbound_order_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 出库单表
CREATE TABLE `outbound_orders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_no` varchar(50) NOT NULL,
  `customer_id` int(11) DEFAULT NULL,
  `warehouse_id` int(11) NOT NULL,
  `status` enum('pending','picking','packing','shipped','delivered','cancelled') DEFAULT 'pending',
  `priority` enum('low','normal','high','urgent') DEFAULT 'normal',
  `required_date` date DEFAULT NULL,
  `shipped_date` date DEFAULT NULL,
  `operator_id` int(11) DEFAULT NULL,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_no` (`order_no`),
  KEY `customer_id` (`customer_id`),
  KEY `warehouse_id` (`warehouse_id`),
  KEY `operator_id` (`operator_id`),
  CONSTRAINT `outbound_orders_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  CONSTRAINT `outbound_orders_ibfk_2` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`),
  CONSTRAINT `outbound_orders_ibfk_3` FOREIGN KEY (`operator_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 出库单明细表
CREATE TABLE `outbound_order_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `outbound_order_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `required_quantity` int(11) NOT NULL,
  `picked_quantity` int(11) DEFAULT '0',
  `packed_quantity` int(11) DEFAULT '0',
  `shipped_quantity` int(11) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `outbound_order_id` (`outbound_order_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `outbound_order_items_ibfk_1` FOREIGN KEY (`outbound_order_id`) REFERENCES `outbound_orders` (`id`),
  CONSTRAINT `outbound_order_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 插入默认管理员用户
INSERT INTO `users` (`username`, `email`, `password_hash`, `role`, `status`) VALUES
('admin', 'admin@monawms.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'active');

-- 插入示例数据
INSERT INTO `categories` (`code`, `name`, `description`) VALUES
('ELEC', '电子产品', '各类电子设备和配件'),
('CLOTH', '服装', '各类服装和配饰'),
('FOOD', '食品', '各类食品和饮料');

INSERT INTO `warehouses` (`code`, `name`, `address`, `manager_id`) VALUES
('WH001', '主仓库', '北京市朝阳区xxx路xxx号', 1),
('WH002', '分仓库', '上海市浦东新区xxx路xxx号', 1);

INSERT INTO `suppliers` (`code`, `name`, `contact_person`, `phone`, `email`) VALUES
('SUP001', '供应商A', '张三', '13800138001', 'zhangsan@supplier.com'),
('SUP002', '供应商B', '李四', '13800138002', 'lisi@supplier.com');

INSERT INTO `customers` (`code`, `name`, `contact_person`, `phone`, `email`) VALUES
('CUS001', '客户A', '王五', '13800138003', 'wangwu@customer.com'),
('CUS002', '客户B', '赵六', '13800138004', 'zhaoliu@customer.com');
-- 创建设备表
CREATE TABLE `devices` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '设备ID',
  `device_code` varchar(50) NOT NULL COMMENT '设备编号',
  `device_name` varchar(200) NOT NULL COMMENT '设备名称',
  `device_type` varchar(50) NOT NULL COMMENT '设备类型',
  `model` varchar(100) DEFAULT NULL COMMENT '型号',
  `brand` varchar(50) DEFAULT NULL COMMENT '品牌',
  `serial_number` varchar(100) NOT NULL COMMENT '序列号',
  `status` enum('active','maintenance','inactive','scrapped') DEFAULT 'active' COMMENT '设备状态',
  `location` varchar(200) DEFAULT NULL COMMENT '位置',
  `purchase_date` date DEFAULT NULL COMMENT '采购日期',
  `warranty_period` int(11) DEFAULT '0' COMMENT '保修期(月)',
  `warranty_end_date` date DEFAULT NULL COMMENT '保修结束日期',
  `notes` text COMMENT '备注',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted_at` timestamp NULL DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_device_code` (`device_code`),
  UNIQUE KEY `unique_serial_number` (`serial_number`),
  KEY `idx_device_type` (`device_type`),
  KEY `idx_status` (`status`),
  KEY `idx_brand` (`brand`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备表';

-- 插入示例数据
INSERT INTO `devices` (`device_code`, `device_name`, `device_type`, `model`, `brand`, `serial_number`, `status`, `location`, `purchase_date`, `warranty_period`, `warranty_end_date`, `notes`) VALUES
('DEV-001', '5G基站设备', '基站设备', 'AAU5613', '华为', 'HW202401001', 'active', '机房A-01', '2024-01-15', 36, '2027-01-15', '5G基站主设备'),
('DEV-002', '光纤交换机', '网络设备', 'S5720-28X-SI', '华为', 'HW202401002', 'maintenance', '机房B-02', '2024-01-10', 24, '2026-01-10', '核心交换设备'),
('DEV-003', '路由器设备', '网络设备', 'AR6280', '华为', 'HW202401003', 'active', '机房A-03', '2024-01-20', 24, '2026-01-20', '核心路由设备'),
('DEV-004', '光模块', '光传输设备', 'SFP-10G-LR', '华为', 'HW202401004', 'active', '机房C-01', '2024-01-25', 12, '2025-01-25', '10G光模块'),
('DEV-005', '中兴基站', '基站设备', 'AAU5613', '中兴', 'ZTE202401001', 'inactive', '机房D-01', '2023-12-01', 36, '2026-12-01', '中兴5G基站设备');
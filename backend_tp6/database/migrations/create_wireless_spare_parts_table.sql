-- 创建无线备件表
CREATE TABLE `wireless_spare_parts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(50) NOT NULL COMMENT '备件编码',
  `part_name` varchar(100) NOT NULL COMMENT '备件名称',
  `model` varchar(100) DEFAULT NULL COMMENT '型号',
  `serial_number` varchar(100) DEFAULT NULL COMMENT '序列号',
  `type` enum('5G','4G','3G','2G','other') NOT NULL DEFAULT 'other' COMMENT '类型',
  `quantity` int(11) NOT NULL DEFAULT '1' COMMENT '数量',
  `operator` varchar(50) NOT NULL COMMENT '操作人',
  `project` varchar(100) DEFAULT NULL COMMENT '关联项目',
  `status` enum('inbound','outbound','returned') NOT NULL DEFAULT 'inbound' COMMENT '状态',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_part_name` (`part_name`),
  KEY `idx_model` (`model`),
  KEY `idx_type` (`type`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='无线备件表';
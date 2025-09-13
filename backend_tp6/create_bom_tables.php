<?php

// 加载基础文件
require __DIR__ . '/vendor/autoload.php';

// 应用初始化
$app = new \think\App();
$app->initialize();

// 获取数据库连接
$db = \think\facade\Db::connect();

// 创建BOM头表
$sql1 = "CREATE TABLE IF NOT EXISTS `bom_headers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `bom_code` varchar(50) NOT NULL COMMENT 'BOM编号',
  `product_id` int(11) NOT NULL COMMENT '主产品ID',
  `version` varchar(20) NOT NULL COMMENT '版本号',
  `description` varchar(500) DEFAULT NULL COMMENT '描述',
  `status` varchar(20) NOT NULL DEFAULT 'active' COMMENT '状态：active（激活）, inactive（非激活）',
  `created_at` datetime DEFAULT NULL COMMENT '创建时间',
  `updated_at` datetime DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_bom_code` (`bom_code`),
  KEY `idx_product_id` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='BOM头表';";

// 创建BOM明细表
$sql2 = "CREATE TABLE IF NOT EXISTS `bom_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `bom_header_id` int(11) NOT NULL COMMENT 'BOM头ID',
  `product_id` int(11) NOT NULL COMMENT '产品ID',
  `quantity` decimal(10,2) NOT NULL COMMENT '数量',
  `unit` varchar(20) DEFAULT NULL COMMENT '单位',
  `notes` varchar(255) DEFAULT NULL COMMENT '备注',
  `created_at` datetime DEFAULT NULL COMMENT '创建时间',
  `updated_at` datetime DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_bom_header_id` (`bom_header_id`),
  KEY `idx_product_id` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='BOM明细表';";

try {
    // 执行SQL语句
    $db->execute($sql1);
    echo "BOM头表创建成功\n";
    
    $db->execute($sql2);
    echo "BOM明细表创建成功\n";
    
    echo "所有表创建完成\n";
} catch (\Exception $e) {
    echo "创建表失败: " . $e->getMessage() . "\n";
}
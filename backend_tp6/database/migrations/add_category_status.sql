-- 为categories表添加status字段
ALTER TABLE `categories` 
ADD COLUMN `status` enum('active','inactive') DEFAULT 'active' AFTER `description`;

-- 添加索引
ALTER TABLE `categories` 
ADD INDEX `idx_status` (`status`);
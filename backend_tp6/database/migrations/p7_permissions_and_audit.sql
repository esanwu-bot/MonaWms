-- ============================================================
-- P7 权限与审计：账号 × 仓库授权 + 操作日志
-- MySQL 5.7 / utf8mb4
-- ============================================================

-- 1. users 增加代维方归属与软删除字段
ALTER TABLE `users`
  ADD COLUMN `vendor_id` int(11) NULL COMMENT '代维方归属（可空）' AFTER `role`,
  ADD COLUMN `department_id` int(11) NULL COMMENT '部门ID（保留，不做隔离）' AFTER `vendor_id`,
  ADD COLUMN `deleted_at` datetime NULL COMMENT '软删除时间' AFTER `updated_at`,
  ADD INDEX `idx_vendor` (`vendor_id`);

-- 2. warehouses 增加软删除字段（授权查询依赖 whereNull deleted_at）
ALTER TABLE `warehouses`
  ADD COLUMN `deleted_at` datetime NULL COMMENT '软删除时间' AFTER `created_at`;

-- 3. 账号 × 仓库授权表
CREATE TABLE IF NOT EXISTS `user_warehouse_grant` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) UNSIGNED NOT NULL COMMENT '被授权账号ID',
  `warehouse_id` int(11) UNSIGNED NOT NULL COMMENT '授权仓库ID',
  `grant_role` enum('manager','operator') NOT NULL DEFAULT 'operator' COMMENT '仓库级角色：manager=可审核过账，operator=仅录入',
  `status` enum('active','revoked') NOT NULL DEFAULT 'active' COMMENT 'active 生效 / revoked 已撤销（留痕不删）',
  `granted_by` int(11) UNSIGNED NULL COMMENT '授权人（系统管理员）',
  `granted_at` datetime NULL COMMENT '授权时间',
  `revoked_by` int(11) UNSIGNED NULL COMMENT '撤销人',
  `revoked_at` datetime NULL COMMENT '撤销时间',
  `remark` varchar(255) NULL COMMENT '备注（代维方名称、授权事由）',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime NULL COMMENT '软删除（正常不用，授权变更走 status）',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_warehouse` (`user_id`, `warehouse_id`),
  KEY `idx_warehouse` (`warehouse_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='账号-仓库授权表';

-- 4. 操作日志表（只读，任何角色不可修改删除）
CREATE TABLE IF NOT EXISTS `operation_log` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `operator_id` int(11) NULL COMMENT '操作人ID',
  `action` varchar(100) NOT NULL COMMENT '动作，如 create/update/delete/grant:grant',
  `target_type` varchar(100) NULL COMMENT '目标类型',
  `target_id` int(11) NULL COMMENT '目标ID',
  `before` longtext NULL COMMENT '变更前 JSON diff',
  `after` longtext NULL COMMENT '变更后 JSON diff',
  `method` varchar(10) NULL COMMENT 'HTTP 方法',
  `path` varchar(255) NULL COMMENT '请求路径',
  `ip` varchar(45) NULL COMMENT '来源IP',
  `created_at` datetime NULL COMMENT '操作时间',
  PRIMARY KEY (`id`),
  KEY `idx_operator` (`operator_id`),
  KEY `idx_action` (`action`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='操作日志（只读）';

-- 5. 种子：系统管理员授权全部现有仓库（严格模式下 admin 也需授权）
INSERT INTO `user_warehouse_grant` (`user_id`, `warehouse_id`, `grant_role`, `status`, `granted_by`, `granted_at`, `remark`)
SELECT 1, w.id, 'manager', 'active', 1, NOW(), '系统初始化授权'
FROM `warehouses` w
WHERE NOT EXISTS (
  SELECT 1 FROM `user_warehouse_grant` g
  WHERE g.user_id = 1 AND g.warehouse_id = w.id
);

-- 6. 示例录入员账号（密码 password），仅授权WH001，用于验收演示
INSERT INTO `users` (`username`, `real_name`, `email`, `phone`, `password_hash`, `role`, `status`, `created_at`, `updated_at`)
SELECT 'operator', '录入员', 'operator@monawms.com', '13800138000',
       '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'operator', 'active', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `users` u2 WHERE u2.username = 'operator');

INSERT INTO `user_warehouse_grant` (`user_id`, `warehouse_id`, `grant_role`, `status`, `granted_by`, `granted_at`, `remark`)
SELECT u.id, 1, 'operator', 'active', 1, NOW(), '示例录入员授权'
FROM `users` u
WHERE u.username = 'operator'
  AND NOT EXISTS (
    SELECT 1 FROM `user_warehouse_grant` g
    WHERE g.user_id = u.id AND g.warehouse_id = 1
  );

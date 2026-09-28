-- ============================================================
-- 03 账号与仓库授权种子（角色 × 仓库 二维授权）
-- 密码统一为：password（bcrypt 哈希与系统默认种子一致）
-- ============================================================
SET NAMES utf8mb4;

-- ---------- 账号（保持 admin / operator 两个全局角色） ----------
INSERT INTO `users` (`username`,`real_name`,`email`,`phone`,`password_hash`,`role`,`status`) VALUES
('admin','系统管理员','admin@monawms.com','13800001000','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','admin','active'),
('operator','录入员','operator@monawms.com','13800138000','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','operator','active'),
('vendor_hw','张伟（华为代维）','vendor_hw@monawms.com','13800001001','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','operator','active'),
('wh_manager','李静（仓库主管）','wh_manager@monawms.com','13800001002','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','operator','active'),
('inventor','王强（盘点员）','inventor@monawms.com','13800001003','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','operator','active')
ON DUPLICATE KEY UPDATE `real_name`=VALUES(`real_name`), `email`=VALUES(`email`), `phone`=VALUES(`phone`), `status`=VALUES(`status`);

-- 代维方归属标记（便于按方统计与批量撤销）
UPDATE `users` SET `vendor_id`=1 WHERE `username`='vendor_hw';

-- ---------- 仓库授权：管理员授权全部仓库（管理员也走显式授权） ----------
INSERT IGNORE INTO `user_warehouse_grant`
  (`user_id`,`warehouse_id`,`grant_role`,`status`,`granted_by`,`granted_at`,`remark`)
SELECT u.id, w.id, 'manager', 'active', (SELECT id FROM `users` WHERE `username`='admin'), NOW(), '系统初始化：管理员全量授权'
FROM `users` u
JOIN `warehouses` w ON w.deleted_at IS NULL
WHERE u.`username` = 'admin';

-- ---------- 仓库授权：仓库主管在 WH001 等同管理员（可过账/盘点/红冲） ----------
INSERT IGNORE INTO `user_warehouse_grant`
  (`user_id`,`warehouse_id`,`grant_role`,`status`,`granted_by`,`granted_at`,`remark`)
SELECT u.id, w.id, 'manager', 'active', (SELECT id FROM `users` WHERE `username`='admin'), NOW(), '主仓库现场负责人'
FROM `users` u
JOIN `warehouses` w ON w.`code` = 'WH001'
WHERE u.`username` = 'wh_manager';

-- ---------- 仓库授权：录入员仅能录单 ----------
INSERT IGNORE INTO `user_warehouse_grant`
  (`user_id`,`warehouse_id`,`grant_role`,`status`,`granted_by`,`granted_at`,`remark`)
SELECT u.id, w.id, 'operator', 'active', (SELECT id FROM `users` WHERE `username`='admin'), NOW(), '主仓库录入授权'
FROM `users` u
JOIN `warehouses` w ON w.`code` = 'WH001'
WHERE u.`username` = 'operator';

INSERT IGNORE INTO `user_warehouse_grant`
  (`user_id`,`warehouse_id`,`grant_role`,`status`,`granted_by`,`granted_at`,`remark`)
SELECT u.id, w.id, 'operator', 'active', (SELECT id FROM `users` WHERE `username`='admin'), NOW(), '华为代维方：分仓 + 备件仓'
FROM `users` u
JOIN `warehouses` w ON w.`code` = 'WH002'
WHERE u.`username` = 'vendor_hw';

INSERT IGNORE INTO `user_warehouse_grant`
  (`user_id`,`warehouse_id`,`grant_role`,`status`,`granted_by`,`granted_at`,`remark`)
SELECT u.id, w.id, 'operator', 'active', (SELECT id FROM `users` WHERE `username`='admin'), NOW(), '盘点员：备件仓'
FROM `users` u
JOIN `warehouses` w ON w.`code` = 'WH003'
WHERE u.`username` = 'inventor';

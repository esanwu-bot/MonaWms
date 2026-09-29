-- ============================================================
-- 出入库单软删除（归档）改造
-- 需求：出入库单禁止物理删除，删除即归档（软删），
--       列表可按 已归档/单号/负责人 筛选翻查
-- 注意：本脚本只执行一次（MySQL 5.7 ALTER ADD COLUMN 不幂等）
-- ============================================================

ALTER TABLE `inbound_orders`
  ADD COLUMN `deleted_at` DATETIME NULL DEFAULT NULL COMMENT '归档时间（软删除）' AFTER `updated_at`,
  ADD KEY `idx_deleted_at` (`deleted_at`);

ALTER TABLE `outbound_orders`
  ADD COLUMN `deleted_at` DATETIME NULL DEFAULT NULL COMMENT '归档时间（软删除）' AFTER `updated_at`,
  ADD KEY `idx_deleted_at` (`deleted_at`);

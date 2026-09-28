-- ============================================================
-- 11 报废申请（覆盖 pending / approved / rejected / completed）
-- device_id 关联 products.id（ScrapApplication 关联 Product）
-- ============================================================
SET NAMES utf8mb4;

INSERT INTO `scrap_applications`
  (`scrap_number`,`device_id`,`reason_type`,`description`,`estimated_loss`,`actual_loss`,`applicant_id`,
   `status`,`approved_by`,`approved_at`,`approval_notes`,`processed_by`,`processed_at`,`processing_notes`,
   `created_at`,`updated_at`)
VALUES
('SCR20260120001',(SELECT id FROM `products` WHERE `sku`='SKU-ONU-HG8245H'),'damage',
 '雷击导致光猫端口击穿，无法修复',320.00,320.00,(SELECT id FROM `users` WHERE `username`='inventor'),
 'completed',(SELECT id FROM `users` WHERE `username`='admin'),'2026-01-21 09:00:00','同意报废，做残值回收',
 (SELECT id FROM `users` WHERE `username`='inventor'),'2026-01-22 15:00:00','已交由环保回收商处理',
 '2026-01-20 10:00:00','2026-01-22 15:00:00'),
('SCR20260305001',(SELECT id FROM `products` WHERE `sku`='SKU-OPT-SFP28'),'damage',
 '批次光模块收光异常，返修报价高于重置成本',1180.00,NULL,(SELECT id FROM `users` WHERE `username`='operator'),
 'approved',(SELECT id FROM `users` WHERE `username`='admin'),'2026-03-06 11:20:00','同意报废，待处置',
 NULL,NULL,NULL,
 '2026-03-05 16:30:00','2026-03-06 11:20:00'),
('SCR20260512001',(SELECT id FROM `products` WHERE `sku`='SKU-RRU-3971'),'obsolete',
 '旧射频单元厂家停产，建议整批淘汰',21800.00,NULL,(SELECT id FROM `users` WHERE `username`='vendor_hw'),
 'pending',NULL,NULL,NULL,NULL,NULL,NULL,
 '2026-05-12 14:00:00','2026-05-12 14:00:00'),
('SCR20260608001',(SELECT id FROM `products` WHERE `sku`='SKU-CBL-PWR'),'expired',
 '库存线缆老化超期，绝缘层开裂',96.00,NULL,(SELECT id FROM `users` WHERE `username`='inventor'),
 'rejected',(SELECT id FROM `users` WHERE `username`='admin'),'2026-06-09 10:00:00','仍可降级使用，暂缓报废',
 NULL,NULL,NULL,
 '2026-06-08 09:15:00','2026-06-09 10:00:00'),
('SCR20260625001',(SELECT id FROM `products` WHERE `sku`='SKU-ONU-HG8245H'),'other',
 '旧型号光猫技术淘汰，用于备件 ECO 处理',245.00,80.00,(SELECT id FROM `users` WHERE `username`='wh_manager'),
 'completed',(SELECT id FROM `users` WHERE `username`='admin'),'2026-06-26 09:30:00','同意按残值处置',
 (SELECT id FROM `users` WHERE `username`='inventor'),'2026-06-28 16:30:00','残值入账 80 元',
 '2026-06-25 17:00:00','2026-06-28 16:30:00')
ON DUPLICATE KEY UPDATE
  `description`=VALUES(`description`), `estimated_loss`=VALUES(`estimated_loss`), `actual_loss`=VALUES(`actual_loss`),
  `applicant_id`=VALUES(`applicant_id`), `status`=VALUES(`status`), `approved_by`=VALUES(`approved_by`),
  `approved_at`=VALUES(`approved_at`), `approval_notes`=VALUES(`approval_notes`), `processed_by`=VALUES(`processed_by`),
  `processed_at`=VALUES(`processed_at`), `processing_notes`=VALUES(`processing_notes`), `updated_at`=NOW();

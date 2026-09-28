-- ============================================================
-- 13 操作日志（只读审计表演示数据）
-- 幂等：以 (operator_id, action, target_type, created_at) 为守卫
-- ============================================================
SET NAMES utf8mb4;

INSERT INTO `operation_log`
  (`operator_id`,`action`,`target_type`,`target_id`,`before`,`after`,`method`,`path`,`ip`,`created_at`)
SELECT u.id, x.act, x.target_type,
       CASE x.target_type
         WHEN 'inbound_order' THEN (SELECT id FROM `inbound_orders` WHERE `order_number` = x.target_key)
         WHEN 'outbound_order' THEN (SELECT id FROM `outbound_orders` WHERE `order_number` = x.target_key)
         WHEN 'scrap_application' THEN (SELECT id FROM `scrap_applications` WHERE `scrap_number` = x.target_key)
         WHEN 'user_warehouse_grant' THEN (SELECT id FROM `user_warehouse_grant` WHERE `user_id` = u.id LIMIT 1)
         ELSE NULL
       END,
       x.before_json, x.after_json, x.method, x.path, '127.0.0.1', x.created_at
FROM `users` u
JOIN (
  SELECT 'admin' op,'create' act,'inbound_order' target_type,'IN202601050001' target_key,
         NULL before_json,'{"status":"completed","note":"5G三期首批到货"}' after_json,'POST' method,'/api/inbound-orders' path,'2026-01-05 09:30:00' created_at
  UNION ALL SELECT 'wh_manager','update','inbound_order','IN202601050001','{"received_quantity":0}','{"received_quantity":10}','PUT','/api/inbound-orders/1','2026-01-05 11:00:00'
  UNION ALL SELECT 'admin','create','outbound_order','OUT202602100001',NULL,'{"status":"completed","picked":16}','POST','/api/outbound-orders','2026-02-10 09:15:00'
  UNION ALL SELECT 'operator','create','inbound_order','IN202602030003',NULL,'{"status":"receiving","sku":"SKU-OPT-SFP28"}','POST','/api/inbound-orders','2026-02-03 14:20:00'
  UNION ALL SELECT 'inventor','create','scrap_application','SCR20260120001',NULL,'{"status":"completed","actual_loss":320}','POST','/api/scrap','2026-01-20 10:00:00'
  UNION ALL SELECT 'vendor_hw','approve','outbound_order','OUT202604180004','{"status":"pending"}','{"status":"shipped"}','POST','/api/outbound-orders/4/ship','2026-04-18 15:30:00'
  UNION ALL SELECT 'admin','grant:grant','user_warehouse_grant',NULL,NULL,'{"grant_role":"manager","remark":"系统初始化：管理员全量授权"}','POST','/api/grants','2026-01-01 08:00:00'
  UNION ALL SELECT 'inventor','check','inventory',NULL,'{"quantity":3200}','{"quantity":3220}','POST','/api/inventory/adjust','2026-06-28 16:00:00'
) x ON x.op = u.`username`
WHERE NOT EXISTS (
  SELECT 1 FROM `operation_log` ol
  WHERE ol.`operator_id` = u.id AND ol.`action` = x.act AND ol.`created_at` = x.created_at
);

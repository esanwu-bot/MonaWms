-- ============================================================
-- 14 历史数据补填（可选）：给缺库位的入库明细补默认库位
-- 仅处理 location_id 为 NULL 的行（系统早期遗留数据），不覆盖已有值
-- ============================================================
SET NAMES utf8mb4;

UPDATE `inbound_order_items` ii
JOIN `inbound_orders` io ON io.id = ii.`inbound_order_id`
LEFT JOIN (
  SELECT l.`warehouse_id`, MIN(l.id) AS first_location_id
  FROM `locations` l
  GROUP BY l.`warehouse_id`
) f ON f.`warehouse_id` = io.`warehouse_id`
SET ii.`location_id` = f.first_location_id
WHERE ii.`location_id` IS NULL
  AND f.first_location_id IS NOT NULL;

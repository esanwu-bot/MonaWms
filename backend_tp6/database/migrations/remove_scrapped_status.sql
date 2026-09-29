-- ============================================================
-- 修正迁移：去掉「已报废(scrapped)」状态，待报废(to_scrap)即坏件
-- 背景：客户口径调整，报废走 ScrapPage 报废申请流程，SN 状态不再设"已报废"
-- 幂等：用 information_schema 判存 + WHERE 条件保护
-- ============================================================

-- 1. device_status 字典的 scrapped 项置为 inactive（不物理删，保留历史记录可查）
UPDATE `dictionary_items`
SET `status` = 'inactive'
WHERE `type_id` = (SELECT `id` FROM `dictionary_types` WHERE `code` = 'device_status')
  AND `code` = 'scrapped'
  AND `status` = 'active';

-- 2. serial_numbers 中 scrapped 状态迁移为 to_scrap（待报废=坏件）
UPDATE `serial_numbers`
SET `status` = 'to_scrap',
    `notes` = CONCAT(IFNULL(`notes`, ''), '（原已报废→待报废）')
WHERE `status` = 'scrapped';

-- 3. serial_number_history 中 scrapped 状态记录同步修正
UPDATE `serial_number_history`
SET `status_after` = 'to_scrap',
    `event_type` = 'repair'
WHERE `status_after` = 'scrapped';

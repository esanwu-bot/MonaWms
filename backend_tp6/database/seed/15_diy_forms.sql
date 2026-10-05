-- ============================================================
-- 15 低代码表单 DIY（元数据 + 记录）
-- 幂等：CREATE TABLE IF NOT EXISTS + form_metadata 唯一键 (form_key, version)
-- 约定：
--   * 元数据 JSON 是唯一事实来源；DIY 字段一律存 form_records.ext_attrs JSON，不给核心表加列
--   * 版本只增不改：draft → published → archived，记录按 form_version 宽容渲染
--   * prop（字段名）一旦发布禁止改名/换类型，只能 deprecated:true 隐藏
--   * MySQL 5.7：JSON 列可查询但不走索引，高频筛选字段按需加生成列（本文件不默认建）
-- ============================================================
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `form_metadata` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `form_key` varchar(64) NOT NULL COMMENT '表单标识（全链路唯一，发布后不可改）',
  `version` int(11) NOT NULL DEFAULT 1 COMMENT '版本号，同 form_key 内只增',
  `title` varchar(128) NOT NULL COMMENT '表单标题',
  `schema_json` json NOT NULL COMMENT '归一化元数据：{layout, fields[{prop,label,type,required,options,...}]}',
  `status` varchar(20) NOT NULL DEFAULT 'draft' COMMENT 'draft草稿/published已发布/archived已归档',
  `change_note` varchar(500) NOT NULL DEFAULT '' COMMENT '版本变更说明',
  `created_by` int(11) DEFAULT NULL,
  `published_at` datetime DEFAULT NULL COMMENT '发布时间',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_form_key_version` (`form_key`,`version`),
  KEY `idx_form_key_status` (`form_key`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='DIY表单元数据（每版本一行）';

CREATE TABLE IF NOT EXISTS `form_records` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `form_key` varchar(64) NOT NULL COMMENT '所属表单',
  `form_version` int(11) NOT NULL DEFAULT 1 COMMENT '写入时的表单版本（宽容渲染依据）',
  `biz_ref` varchar(64) NOT NULL DEFAULT '' COMMENT '可选挂接核心单号（如盘点单号/入库单号）',
  `ext_attrs` json NOT NULL COMMENT 'DIY 字段值 JSON，键 = 元数据 fields[].prop',
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL COMMENT '软删除时间',
  PRIMARY KEY (`id`),
  KEY `idx_form_key_deleted_created` (`form_key`,`deleted_at`,`created_at`),
  KEY `idx_form_key_creator` (`form_key`,`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='DIY表单记录（数据全进 ext_attrs）';

-- 演示表单：基站巡检单 v1（已发布）。重复执行时靠 uk_form_key_version 幂等跳过
INSERT INTO `form_metadata`
  (`form_key`,`version`,`title`,`schema_json`,`status`,`change_note`,`created_by`,`published_at`,`created_at`,`updated_at`)
SELECT 'site_patrol', 1, '基站巡检单',
  '{"layout":{"columns":2},"fields":[{"prop":"site_code","label":"基站编码","type":"text","required":true,"maxLen":64},{"prop":"patrol_date","label":"巡检日期","type":"date","required":true},{"prop":"patrol_result","label":"巡检结果","type":"select","required":true,"options":[{"label":"正常","value":"OK"},{"label":"异常","value":"ABNORMAL"}]},{"prop":"sn_check","label":"在网设备SN","type":"sn-scan","multiple":true},{"prop":"photos","label":"现场照片","type":"file","accept":"image/*","max":6},{"prop":"remark","label":"备注","type":"textarea","maxLen":5000}]}',
  'published', '初始版本', 1, NOW(), NOW(), NOW()
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `form_metadata` WHERE `form_key` = 'site_patrol'
);

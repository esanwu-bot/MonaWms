-- 报废申请支持多图上传
ALTER TABLE `scrap_applications`
  ADD COLUMN `images` JSON DEFAULT NULL COMMENT '报废图片 URL 列表' AFTER `description`;

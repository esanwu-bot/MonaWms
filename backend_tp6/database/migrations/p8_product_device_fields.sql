-- P8 设备字段并入产品主数据：品牌 / 生产日期 / 保修期 / 条码图片
ALTER TABLE products
  ADD COLUMN brand varchar(100) NULL COMMENT '品牌' AFTER model_number,
  ADD COLUMN production_date date NULL COMMENT '生产日期' AFTER brand,
  ADD COLUMN warranty_months int(11) NULL DEFAULT 0 COMMENT '保修期（月）' AFTER production_date,
  ADD COLUMN barcode_image varchar(255) NULL COMMENT '条码图片URL' AFTER barcode;

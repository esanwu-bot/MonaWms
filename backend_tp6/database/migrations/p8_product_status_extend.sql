-- 产品状态扩展：正常在用(active) / 返修中(repairing) / 待报废(to_scrap)，保留旧值兼容历史数据
ALTER TABLE products
  MODIFY status enum('active','inactive','discontinued','repairing','to_scrap') NOT NULL DEFAULT 'active';

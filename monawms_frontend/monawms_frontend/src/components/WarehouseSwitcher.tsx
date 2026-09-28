import { useEffect } from 'react';
import { Select, Space, Tag, Typography } from 'antd';
import { ShopOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';

import { useAuthStore } from '../stores/auth';
import { useWarehouseStore } from '../stores/warehouse';
import { fetchMyWarehouses } from '../api/grants';
import { ROLE_LABEL } from '../api/permission';

/**
 * 顶栏仓库切换器
 *
 * 只展示当前账号被授权的仓库（数据源 GET /api/grants/user/:id）。
 * 切换后写入 useWarehouseStore，axios 拦截器自动给所有请求带 warehouse_id。
 *
 * 关键：授权被撤销时，setList 会自动把 currentId 清空或切到第一个可用仓库，
 * 避免用户卡在一个 403 的仓库里看到满屏「没有权限」。
 */
export default function WarehouseSwitcher() {
  const user = useAuthStore((s) => s.user);
  const { currentId, list, setList, setCurrent, setLoading } = useWarehouseStore();

  const { data, isLoading } = useQuery({
    queryKey: ['my-warehouses', user?.id],
    queryFn: () => fetchMyWarehouses(user!.id),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (data) setList(data);
  }, [data, setList]);

  useEffect(() => {
    setLoading(isLoading);
  }, [isLoading, setLoading]);

  // 无任何授权
  if (!isLoading && list.length === 0) {
    return (
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        未授权任何仓库
      </Typography.Text>
    );
  }

  const current = list.find((w) => w.warehouseId === currentId);

  return (
    <Space size={8}>
      <ShopOutlined style={{ color: 'rgba(255,255,255,0.65)' }} />
      <Select
        size="small"
        style={{ minWidth: 200 }}
        value={currentId ?? undefined}
        loading={isLoading}
        placeholder="选择仓库"
        onChange={(v) => setCurrent(v)}
        options={list.map((w) => ({
          value: w.warehouseId,
          label: `${w.warehouseCode} ${w.warehouseName}`,
        }))}
      />
      {current && (
        <Tag color={current.grantRole === 'manager' ? 'gold' : 'blue'} style={{ marginInlineEnd: 0 }}>
          {ROLE_LABEL[current.grantRole]}
        </Tag>
      )}
    </Space>
  );
}

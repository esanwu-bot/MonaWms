import React from 'react';
import { Select, Spin } from 'antd';
import { BankOutlined } from '@ant-design/icons';
import { useWarehouseStore } from '../store/warehouseStore';
import type { Warehouse } from '../types/api';

const WarehouseSwitcher: React.FC = () => {
  const { currentWarehouse, warehouses, isLoading, setCurrentWarehouse } = useWarehouseStore();

  const handleChange = (value: number) => {
    const selected = warehouses.find((w) => w.id === value);
    if (selected) {
      setCurrentWarehouse(selected);
    }
  };

  if (isLoading) {
    return <Spin size="small" />;
  }

  if (warehouses.length === 0) {
    return <span style={{ color: '#999', fontSize: 14 }}>未授权仓库</span>;
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <BankOutlined />
      <Select
        value={currentWarehouse?.id}
        onChange={handleChange}
        options={warehouses.map((w) => ({ label: `${w.name} (${w.code})`, value: w.id }))}
        placeholder="选择仓库"
        style={{ minWidth: 180 }}
        size="small"
      />
    </div>
  );
};

export default WarehouseSwitcher;

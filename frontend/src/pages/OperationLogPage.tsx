import React, { useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import { Card, Table, Input, DatePicker, Button, Spin, Alert, Tag, Space } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { operationLogService } from '../services/operationLogService';
import type { OperationLog } from '../types/api';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

// 动作 -> 中文
const ACTION_LABELS: Record<string, string> = {
  create: '创建',
  update: '更新',
  delete: '删除',
  approve: '审核',
  reject: '驳回',
  check: '盘点',
  post: '过账',
  receive: '收货',
  ship: '发货',
  'grant:grant': '授予权限',
  'grant:revoke': '撤销权限',
  'grant:change_role': '调整角色',
};

// 目标类型 -> 中文
const TARGET_LABELS: Record<string, string> = {
  api: '接口',
  inbound_order: '入库单',
  outbound_order: '出库单',
  inventory: '库存',
  inventory_transaction: '库存流水',
  scrap_application: '报废申请',
  user_warehouse_grant: '仓库授权',
  product: '商品',
  category: '商品分类',
  warehouse: '仓库',
  project: '项目',
  serial_number: '序列号',
  wireless_spare_part: '无线备件',
  bom_header: 'BOM',
  user: '用户',
};

// 变更字段 -> 中文
const FIELD_LABELS: Record<string, string> = {
  status: '状态',
  sku: 'SKU',
  quantity: '数量',
  received_quantity: '已收数量',
  picked: '已拣货数量',
  picked_quantity: '已拣货数量',
  actual_loss: '实际损失',
  estimated_loss: '预估损失',
  reason_type: '报废原因',
  grant_role: '仓库角色',
  warehouse_id: '仓库',
  location_id: '库位',
  product_id: '商品',
  device_id: '设备',
  project_id: '项目',
  order_number: '单号',
  batch_number: '批次号',
  notes: '备注',
  priority: '优先级',
  expected_date: '预计日期',
  tracking_number: '运单号',
};

// 变更取值 -> 中文
const VALUE_LABELS: Record<string, string> = {
  pending: '待处理',
  receiving: '收货中',
  picking: '拣货中',
  packed: '已打包',
  shipped: '已发货',
  delivered: '已送达',
  completed: '已完成',
  approved: '已审核',
  rejected: '已驳回',
  cancelled: '已取消',
  active: '启用',
  inactive: '停用',
  discontinued: '已停用',
  admin: '管理员',
  manager: '仓库主管',
  operator: '操作员',
  viewer: '只读',
  damage: '损坏',
  obsolete: '淘汰',
  expired: '过期',
  other: '其他',
  manual: '手工操作',
  in: '入库',
  out: '出库',
  adjust: '调整',
  check: '盘点',
  purchase: '采购入库',
  sale: '销售出库',
};

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? '是' : '否';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return VALUE_LABELS[value] ?? value;
  if (Array.isArray(value)) {
    return value.length ? value.map((item) => formatValue(item)).join('、') : '—';
  }
  if (typeof value === 'object') {
    const parts = Object.entries(value as Record<string, unknown>).map(
      ([key, val]) => `${FIELD_LABELS[key] ?? key} ${formatValue(val)}`
    );
    return parts.length ? parts.join('，') : '—';
  }
  return String(value);
};

// 变更内容按「字段：值」逐行展示，不展示 JSON 结构
const renderChanges = (changes?: Record<string, any> | null) => {
  if (!changes || typeof changes !== 'object' || Array.isArray(changes)) {
    return <span className="wm-log-empty">—</span>;
  }

  const entries = Object.entries(changes);
  if (entries.length === 0) return <span className="wm-log-empty">—</span>;

  return (
    <div className="wm-log-changes">
      {entries.map(([key, value]) => (
        <div className="wm-log-kv" key={key}>
          <span className="k">{FIELD_LABELS[key] ?? key}：</span>
          <span className="v">{formatValue(value)}</span>
        </div>
      ))}
    </div>
  );
};

const OperationLogPage: React.FC = () => {
  const [params, setParams] = useState({
    page: 1,
    limit: 15,
    action: '',
    operator_id: undefined as number | undefined,
    start_time: '',
    end_time: '',
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['operationLogs', params],
    queryFn: () => operationLogService.getLogs(params),
  });

  const columns: ColumnsType<OperationLog> = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 80,
    },
    {
      title: '操作人',
      dataIndex: 'operator_name',
      width: 120,
    },
    {
      title: '动作',
      dataIndex: 'action',
      width: 120,
      render: (action: string) => <Tag>{ACTION_LABELS[action] ?? action}</Tag>,
    },
    {
      title: '目标类型',
      dataIndex: 'target_type',
      width: 120,
      render: (targetType: string) => TARGET_LABELS[targetType] ?? targetType,
    },
    {
      title: '目标ID',
      dataIndex: 'target_id',
      width: 90,
    },
    {
      title: '变更前',
      dataIndex: 'before',
      width: 200,
      render: (before: Record<string, any> | null) => renderChanges(before),
    },
    {
      title: '变更后',
      dataIndex: 'after',
      width: 200,
      render: (after: Record<string, any> | null) => renderChanges(after),
    },
    {
      title: 'IP',
      dataIndex: 'ip',
      width: 140,
    },
    {
      title: '时间',
      dataIndex: 'created_at',
      width: 180,
    },
  ];

  const handleSearch = () => {
    setParams((prev) => ({ ...prev, page: 1 }));
  };

  const handleReset = () => {
    setParams({ page: 1, limit: 15, action: '', operator_id: undefined, start_time: '', end_time: '' });
  };

  return (
    <div>
      <PageHeader title="操作日志" sub="只读审计流水：谁、在何时、对什么做了什么" />
      <Card>
      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder="动作"
          value={params.action}
          onChange={(e) => setParams((prev) => ({ ...prev, action: e.target.value }))}
          style={{ width: 160 }}
        />
        <Input
          placeholder="操作人ID"
          value={params.operator_id || ''}
          onChange={(e) => {
            const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
            setParams((prev) => ({ ...prev, operator_id: val }));
          }}
          style={{ width: 120 }}
        />
        <DatePicker
          placeholder="开始日期"
          value={params.start_time ? dayjs(params.start_time) : null}
          onChange={(d) => setParams((prev) => ({ ...prev, start_time: d ? d.format('YYYY-MM-DD') : '' }))}
        />
        <DatePicker
          placeholder="结束日期"
          value={params.end_time ? dayjs(params.end_time) : null}
          onChange={(d) => setParams((prev) => ({ ...prev, end_time: d ? d.format('YYYY-MM-DD') : '' }))}
        />
        <Button icon={<SearchOutlined />} type="primary" onClick={handleSearch}>
          查询
        </Button>
        <Button icon={<ReloadOutlined />} onClick={handleReset}>
          重置
        </Button>
      </Space>

      {isLoading && <Spin tip="加载中..." fullscreen />}
      {error && <Alert type="error" message={(error as Error).message || '加载失败'} style={{ marginBottom: 16 }} />}

      <Table
        rowKey="id"
        dataSource={data?.list || []}
        columns={columns}
        loading={isLoading}
        pagination={{
          current: params.page,
          pageSize: params.limit,
          total: data?.pagination?.total || 0,
          onChange: (page, pageSize) => setParams((prev) => ({ ...prev, page, limit: pageSize || 15 })),
        }}
        size="small"
      />
      </Card>
    </div>
  );
};

export default OperationLogPage;

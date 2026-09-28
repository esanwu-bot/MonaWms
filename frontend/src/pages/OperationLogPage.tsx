import React, { useState } from 'react';
import { Card, Table, Input, DatePicker, Button, Spin, Alert, Tag, Space } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { operationLogService } from '../services/operationLogService';
import type { OperationLog } from '../types/api';
import dayjs from 'dayjs';

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

  const columns = [
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
      width: 140,
      render: (action: string) => <Tag>{action}</Tag>,
    },
    {
      title: '目标类型',
      dataIndex: 'target_type',
      width: 120,
    },
    {
      title: '目标ID',
      dataIndex: 'target_id',
      width: 100,
    },
    {
      title: '变更后',
      dataIndex: 'after',
      ellipsis: true,
      render: (after: Record<string, any> | null) =>
        after ? <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(after, null, 2)}</pre> : '-',
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
    <Card title="操作日志">
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

      {isLoading && <Spin tip="加载中..." />}
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
  );
};

export default OperationLogPage;

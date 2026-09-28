import React, { useMemo, useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import { Card, Table, Select, Spin, Alert, Tag, message } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { grantService } from '../services/grantService';
import type { GrantRole } from '../types/api';

const ROLE_OPTIONS: { label: string; value: GrantRole | '' }[] = [
  { label: '无', value: '' },
  { label: '录入员', value: 'operator' },
  { label: '仓库管理员', value: 'manager' },
];

interface GrantMatrixCell {
  warehouse_id: number;
  grant_role: GrantRole | null;
}

interface GrantMatrixRow {
  user_id: number;
  username: string;
  global_role: string;
  vendor_id: number | null;
  cells: GrantMatrixCell[];
}

interface GrantMatrixWarehouse {
  id: number;
  code: string;
  name: string;
}

interface GrantMatrixResponse {
  warehouses: GrantMatrixWarehouse[];
  rows: GrantMatrixRow[];
}

const GrantMatrixPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();

  const { data, isLoading, error } = useQuery<GrantMatrixResponse>({
    queryKey: ['grants', 'matrix'],
    queryFn: grantService.getMatrix,
  });

  // 构建查找表：userId -> warehouseId -> grant_role
  const roleMap = useMemo(() => {
    const map: Record<number, Record<number, GrantRole | null>> = {};
    data?.rows?.forEach((row) => {
      map[row.user_id] = {};
      row.cells.forEach((c) => {
        map[row.user_id][c.warehouse_id] = c.grant_role;
      });
    });
    return map;
  }, [data]);

  const grantMutation = useMutation({
    mutationFn: (payload: { user_id: number; warehouse_id: number; grant_role: GrantRole }) =>
      grantService.grant({ ...payload, remark: '' }),
    onSuccess: () => {
      messageApi.success('授权成功');
      queryClient.invalidateQueries({ queryKey: ['grants', 'matrix'] });
    },
    onError: (err: any) => {
      messageApi.error(err?.response?.data?.message || '授权失败');
    },
  });

  const changeRoleMutation = useMutation({
    mutationFn: (payload: { user_id: number; warehouse_id: number; grant_role: GrantRole }) =>
      grantService.changeRole(payload),
    onSuccess: () => {
      messageApi.success('角色已更新');
      queryClient.invalidateQueries({ queryKey: ['grants', 'matrix'] });
    },
    onError: (err: any) => {
      messageApi.error(err?.response?.data?.message || '更新失败');
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (payload: { user_id: number; warehouse_id: number }) =>
      grantService.revoke({ ...payload, remark: '' }),
    onSuccess: () => {
      messageApi.success('已撤销授权');
      queryClient.invalidateQueries({ queryKey: ['grants', 'matrix'] });
    },
    onError: (err: any) => {
      messageApi.error(err?.response?.data?.message || '撤销失败');
    },
  });

  const handleRoleChange = (userId: number, warehouseId: number, value: GrantRole | '') => {
    const current = roleMap[userId]?.[warehouseId] ?? null;

    if (!value) {
      if (current) {
        revokeMutation.mutate({ user_id: userId, warehouse_id: warehouseId });
      }
      return;
    }

    if (!current) {
      grantMutation.mutate({ user_id: userId, warehouse_id: warehouseId, grant_role: value });
    } else if (current !== value) {
      changeRoleMutation.mutate({ user_id: userId, warehouse_id: warehouseId, grant_role: value });
    }
  };

  const columns = useMemo(() => {
    const baseColumns = [
      {
        title: '账号',
        dataIndex: 'username',
        key: 'username',
        fixed: 'left' as const,
        width: 130,
      },
      {
        title: '全局角色',
        dataIndex: 'global_role',
        key: 'global_role',
        width: 110,
        render: (role: string) => (
          <Tag color={role === 'admin' ? 'red' : 'blue'}>
            {role === 'admin' ? '管理员' : '录入员'}
          </Tag>
        ),
      },
    ];

    const warehouseColumns =
      data?.warehouses.map((wh) => ({
        title: `${wh.name} (${wh.code})`,
        key: `wh-${wh.id}`,
        width: 160,
        render: (_: unknown, row: GrantMatrixRow) => {
          const current = roleMap[row.user_id]?.[wh.id] ?? null;
          return (
            <Select
              value={current || ''}
              options={ROLE_OPTIONS}
              onChange={(v) => handleRoleChange(row.user_id, wh.id, v as GrantRole | '')}
              style={{ width: 130 }}
              size="small"
              disabled={grantMutation.isPending || changeRoleMutation.isPending || revokeMutation.isPending}
            />
          );
        },
      })) || [];

    return [...baseColumns, ...warehouseColumns];
  }, [data, roleMap, grantMutation.isPending, changeRoleMutation.isPending, revokeMutation.isPending]);

  if (isLoading) {
    return (
      <div>
        <PageHeader title="仓库授权" sub="角色 × 仓库 二维授权：默认无权限，需显式授予" />
        <Card>
          <Spin tip="加载授权矩阵中..." />
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader title="仓库授权" sub="角色 × 仓库 二维授权：默认无权限，需显式授予；撤销走 revoked 留痕" />
        <Card>
          <Alert type="error" message={(error as Error).message || '加载失败'} />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="仓库授权" sub="角色 × 仓库 二维授权：默认无权限，需显式授予；撤销走 revoked 留痕" />
      <Card>
        {contextHolder}
        <Table
          rowKey="user_id"
          dataSource={data?.rows || []}
          columns={columns}
          scroll={{ x: 'max-content' }}
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  );
};

export default GrantMatrixPage;

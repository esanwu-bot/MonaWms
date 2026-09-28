import React, { useMemo, useState } from 'react';
import { Card, Table, Select, Spin, Alert, Tag, message } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { grantService } from '../services/grantService';
import type { GrantMatrix, GrantRole, GrantMatrixUser, GrantMatrixWarehouse } from '../types/api';

const ROLE_OPTIONS: { label: string; value: GrantRole | '' }[] = [
  { label: '无', value: '' },
  { label: '录入员', value: 'operator' },
  { label: '仓库管理员', value: 'manager' },
];

const GrantMatrixPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();

  const { data, isLoading, error } = useQuery<GrantMatrix>({
    queryKey: ['grants', 'matrix'],
    queryFn: grantService.getMatrix,
  });

  const grantMutation = useMutation({
    mutationFn: (payload: { user_id: number; warehouse_id: number; grant_role: GrantRole }) =>
      grantService.grant({ ...payload, remark: '' }),
    onSuccess: () => {
      messageApi.success('授权成功');
      queryClient.invalidateQueries({ queryKey: ['grants', 'matrix'] });
    },
    onError: (err: any) => {
      messageApi.error(err.message || '授权失败');
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
      messageApi.error(err.message || '更新失败');
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
      messageApi.error(err.message || '撤销失败');
    },
  });

  const handleRoleChange = (userId: number, warehouseId: number, value: GrantRole | '') => {
    const current = data?.matrix?.[userId]?.[warehouseId];

    if (!value) {
      // 撤销
      if (current && current.status === 'active') {
        revokeMutation.mutate({ user_id: userId, warehouse_id: warehouseId });
      }
      return;
    }

    if (!current || current.status !== 'active') {
      // 新增授权
      grantMutation.mutate({ user_id: userId, warehouse_id: warehouseId, grant_role: value });
    } else if (current.grant_role !== value) {
      // 变更角色
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
        width: 120,
      },
      {
        title: '全局角色',
        dataIndex: 'role',
        key: 'role',
        width: 120,
        render: (role: string) => <Tag>{role}</Tag>,
      },
    ];

    const warehouseColumns =
      data?.warehouses.map((wh: GrantMatrixWarehouse) => ({
        title: `${wh.name} (${wh.code})`,
        key: `wh-${wh.id}`,
        width: 180,
        render: (_: unknown, user: GrantMatrixUser) => {
          const cell = data.matrix?.[user.id]?.[wh.id];
          const value = cell?.status === 'active' ? cell.grant_role : '';
          return (
            <Select
              value={value}
              options={ROLE_OPTIONS}
              onChange={(v) => handleRoleChange(user.id, wh.id, v as GrantRole | '')}
              style={{ width: 140 }}
              size="small"
              disabled={grantMutation.isPending || changeRoleMutation.isPending || revokeMutation.isPending}
            />
          );
        },
      })) || [];

    return [...baseColumns, ...warehouseColumns];
  }, [data, grantMutation.isPending, changeRoleMutation.isPending, revokeMutation.isPending]);

  if (isLoading) {
    return (
      <Card>
        <Spin tip="加载授权矩阵中..." />
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <Alert type="error" message={(error as Error).message || '加载失败'} />
      </Card>
    );
  }

  return (
    <Card title="仓库授权矩阵">
      {contextHolder}
      <Table
        rowKey="id"
        dataSource={data?.users || []}
        columns={columns}
        scroll={{ x: 'max-content' }}
        pagination={false}
        size="small"
      />
    </Card>
  );
};

export default GrantMatrixPage;

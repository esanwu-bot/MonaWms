import { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  batchGrant,
  changeGrantRole,
  fetchGrantMatrix,
  grantWarehouse,
  revokeByVendor,
  revokeWarehouse,
} from '../../api/grants';
import { ROLE_LABEL } from '../../api/permission';
import { useAuthStore } from '../../stores/auth';
import type { GrantMatrix, GrantRole, MatrixRow } from '../../types/grant';

/**
 * 授权矩阵页（仅系统管理员可见）
 *
 * 行 = 账号，列 = 仓库，交叉点 = 该账号在该仓库的授权角色。
 * 空单元格 = 未授权（默认无权限原则的可视化）。
 *
 * 支持：单格授予/改角色/撤销、按代维方筛选、批量授权、按代维方整体收回。
 */
export default function GrantMatrixPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const [vendorId, setVendorId] = useState<number | undefined>(undefined);
  const [keyword, setKeyword] = useState('');
  const [onlyGranted, setOnlyGranted] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['grant-matrix', vendorId],
    queryFn: () => fetchGrantMatrix(vendorId),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['grant-matrix'] });

  const grantMut = useMutation({
    mutationFn: (p: { user_id: number; warehouse_id: number; grant_role: GrantRole }) =>
      grantWarehouse(p),
    onSuccess: () => {
      message.success('已授权');
      invalidate();
      // 授权变更会影响切换器，一并刷新
      queryClient.invalidateQueries({ queryKey: ['my-warehouses'] });
    },
  });

  const revokeMut = useMutation({
    mutationFn: (p: { user_id: number; warehouse_id: number }) =>
      revokeWarehouse(p.user_id, p.warehouse_id),
    onSuccess: () => {
      message.success('已撤销');
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['my-warehouses'] });
    },
  });

  // 切换仓库角色走专用接口：语义清晰、幂等、且单独记 operation_log
  const roleMut = useMutation({
    mutationFn: (p: { user_id: number; warehouse_id: number; grant_role: GrantRole }) =>
      changeGrantRole(p.user_id, p.warehouse_id, p.grant_role),
    onSuccess: () => {
      message.success('角色已更新');
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['my-warehouses'] });
    },
  });

  const rows = useMemo(() => {
    if (!data) return [];
    let list = data.rows as MatrixRow[];
    if (keyword.trim()) {
      const kw = keyword.trim().toLowerCase();
      list = list.filter((r) => r.username.toLowerCase().includes(kw));
    }
    if (onlyGranted) {
      list = list.filter((r) => r.cells.some((c) => c.grantRole !== null));
    }
    return list;
  }, [data, keyword, onlyGranted]);

  const columns = useMemo<ColumnsType<MatrixRow>>(() => {
    const base: ColumnsType<MatrixRow> = [
      {
        title: '账号',
        dataIndex: 'username',
        fixed: 'left',
        width: 160,
        render: (v: string, row) => (
          <Space direction="vertical" size={0}>
            <span>{v}</span>
            <Tag color={row.globalRole === 'admin' ? 'red' : 'default'} style={{ marginInlineEnd: 0 }}>
              {ROLE_LABEL[row.globalRole]}
            </Tag>
          </Space>
        ),
      },
    ];

    const warehouseCols: ColumnsType<MatrixRow> = (data?.warehouses ?? []).map((w) => ({
      title: (
        <Tooltip title={`${w.code} ${w.name}`}>
          <span style={{ fontSize: 12 }}>{w.name}</span>
        </Tooltip>
      ),
      dataIndex: ['cells'],
      width: 130,
      align: 'center',
      render: (_: unknown, row) => {
        const cell = row.cells.find((c) => c.warehouseId === w.id);
        const role = cell?.grantRole ?? null;

        if (!role) {
          return (
            <Button
              size="small"
              type="dashed"
              loading={grantMut.isPending}
              onClick={() =>
                grantMut.mutate({
                  user_id: row.userId,
                  warehouse_id: w.id,
                  grant_role: 'operator',
                })
              }
            >
              授予
            </Button>
          );
        }

        return (
          <Space direction="vertical" size={4}>
            <Tag
              color={role === 'manager' ? 'gold' : 'blue'}
              style={{ cursor: 'pointer', marginInlineEnd: 0 }}
              onClick={() =>
                roleMut.mutate({
                  user_id: row.userId,
                  warehouse_id: w.id,
                  grant_role: role === 'manager' ? 'operator' : 'manager',
                })
              }
            >
              {ROLE_LABEL[role]} ⇄
            </Tag>
            <Popconfirm
              title="确认撤销该仓库授权？"
              description="撤销后该账号立即失去此仓库的所有访问与操作权限。"
              okText="撤销"
              cancelText="取消"
              okButtonProps={{ danger: true }}
              onConfirm={() => revokeMut.mutate({ user_id: row.userId, warehouse_id: w.id })}
            >
              <Button size="small" type="link" danger>
                撤销
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    }));

    return [...base, ...warehouseCols];
  }, [data, grantMut, roleMut, revokeMut]);

  // 非管理员不允许访问（后端也会 403，这里只是提前挡一下体验）
  if (user && user.role !== 'admin') {
    return <Alert type="error" message="仅系统管理员可访问授权管理" showIcon />;
  }

  return (
    <Card
      title="账号 × 仓库 授权矩阵"
      extra={
        <Space>
          <Select
            allowClear
            placeholder="按代维方筛选"
            style={{ width: 180 }}
            value={vendorId}
            onChange={setVendorId}
            options={[
              { value: 1, label: '示例代维方 A' }, // 实际从 /api/vendors 拉
              { value: 2, label: '示例代维方 B' },
            ]}
          />
          <Input.Search
            placeholder="搜索账号"
            allowClear
            style={{ width: 180 }}
            onSearch={setKeyword}
            onChange={(e) => !e.target.value && setKeyword('')}
          />
          <Space size={4}>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              仅看已授权
            </Typography.Text>
            <Switch size="small" checked={onlyGranted} onChange={setOnlyGranted} />
          </Space>
          <Button onClick={() => setBatchOpen(true)}>批量授权</Button>
          <Popconfirm
            title="按代维方整体收回？"
            description="将撤销该代维方下所有账号的全部仓库授权。"
            okText="确认收回"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={async () => {
              if (!vendorId) {
                message.warning('请先选择代维方');
                return;
              }
              const res = await revokeByVendor(vendorId, '代维方整体收回');
              message.success(`已撤销 ${res.count} 条授权`);
              invalidate();
              queryClient.invalidateQueries({ queryKey: ['my-warehouses'] });
            }}
          >
            <Button danger disabled={!vendorId}>
              整体收回
            </Button>
          </Popconfirm>
        </Space>
      }
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="默认无权限：空白单元格表示该账号未授权此仓库，不可访问、不可录入"
        description="点击角色标签可切换「仓库管理员 / 录入员」；仓库管理员可过账、调整、盘点过账、红冲，录入员仅可录入。全局录入员即使被授予仓库管理员，也不能做用户与授权管理。"
      />

      <Table<MatrixRow>
        rowKey="userId"
        size="small"
        bordered
        loading={isLoading}
        columns={columns}
        dataSource={rows}
        scroll={{ x: 'max-content' }}
        pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 个账号` }}
      />

      <BatchGrantModal
        open={batchOpen}
        warehouses={(data as GrantMatrix | undefined)?.warehouses ?? []}
        rows={rows}
        onClose={() => setBatchOpen(false)}
        onDone={() => {
          invalidate();
          queryClient.invalidateQueries({ queryKey: ['my-warehouses'] });
        }}
      />
    </Card>
  );
}

/** 批量授权弹窗：新增/更换代维方时一次配好 账号 × 仓库 */
function BatchGrantModal({
  open,
  warehouses,
  rows,
  onClose,
  onDone,
}: {
  open: boolean;
  warehouses: { id: number; code: string; name: string }[];
  rows: MatrixRow[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [userIds, setUserIds] = useState<number[]>([]);
  const [warehouseIds, setWarehouseIds] = useState<number[]>([]);
  const [role, setRole] = useState<GrantRole>('operator');

  const mut = useMutation({
    mutationFn: () => batchGrant({ user_ids: userIds, warehouse_ids: warehouseIds, grant_role: role }),
    onSuccess: (res) => {
      message.success(`批量授权完成，共 ${res.count} 条`);
      setUserIds([]);
      setWarehouseIds([]);
      onDone();
      onClose();
    },
  });

  return (
    <Modal
      title="批量授权"
      open={open}
      onCancel={onClose}
      onOk={() => mut.mutate()}
      confirmLoading={mut.isPending}
      okText="确认授权"
      cancelText="取消"
      okButtonProps={{ disabled: !userIds.length || !warehouseIds.length }}
      width={640}
    >
      <Space direction="vertical" size={16} style={{ width: '100%', marginTop: 16 }}>
        <div>
          <div style={{ marginBottom: 8 }}>选择账号</div>
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder="可多选，建议按代维方成批选择"
            value={userIds}
            onChange={setUserIds}
            options={rows.map((r) => ({
              value: r.userId,
              label: `${r.username}（${ROLE_LABEL[r.globalRole]}）`,
            }))}
          />
        </div>

        <div>
          <div style={{ marginBottom: 8 }}>选择仓库</div>
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder="可多选"
            value={warehouseIds}
            onChange={setWarehouseIds}
            options={warehouses.map((w) => ({
              value: w.id,
              label: `${w.code} ${w.name}`,
            }))}
          />
        </div>

        <div>
          <div style={{ marginBottom: 8 }}>仓库角色</div>
          <Select
            style={{ width: 200 }}
            value={role}
            onChange={setRole}
            options={[
              { value: 'operator', label: '录入员（仅录入）' },
              { value: 'manager', label: '仓库管理员（可过账）' },
            ]}
          />
        </div>
      </Space>
    </Modal>
  );
}

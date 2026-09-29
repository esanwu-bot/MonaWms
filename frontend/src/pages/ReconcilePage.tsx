import React, { useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import {
  Card,
  Table,
  Button,
  Space,
  Select,
  Row,
  Col,
  Statistic,
  Typography,
  Alert,
  Tag,
  Empty,
  Modal,
  Tabs,
  message,
  Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SyncOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  DatabaseOutlined,
  FileSearchOutlined,
  DownloadOutlined,
  RedoOutlined,
  LinkOutlined,
  HistoryOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { stocktakeService, type ReconcileDiff } from '../services/stocktakeService';
import {
  stocktakeEnhance,
  type OrphanSn,
  type StatusDiffRow,
} from '../services/stocktakeEnhance';
import { warehouseService } from '../services/warehouseService';
import { useWarehouseStore } from '../store/warehouseStore';
import { useAuthStore } from '../store/authStore';

const { Text } = Typography;
const { Option } = Select;

const ReconcilePage: React.FC = () => {
  const queryClient = useQueryClient();
  const { currentWarehouse } = useWarehouseStore();
  const user = useAuthStore((s) => s.user);
  const operator = user?.fullName || user?.username || '-';
  const [warehouseId, setWarehouseId] = useState<string>(
    currentWarehouse?.id ? String(currentWarehouse.id) : ''
  );

  // 绑定弹窗状态
  const [bindVisible, setBindVisible] = useState(false);
  const [bindSelected, setBindSelected] = useState<React.Key[]>([]);
  const [bindWarehouseId, setBindWarehouseId] = useState<string | undefined>(undefined);

  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses', 'active'],
    queryFn: async () => warehouseService.getActiveWarehouses(),
  });

  // 对账快照（B1：本次对账时间 run_at + 操作人，取自最新 reconcile_snapshots 的 mock）
  const { data: snapshot } = useQuery({
    queryKey: ['reconcile', 'snapshot'],
    queryFn: async () => stocktakeEnhance.getReconcileSnapshot(),
  });

  // 无归属 SN（B3：绑定后计数实时减少）
  const { data: orphanSns } = useQuery({
    queryKey: ['reconcile', 'orphans'],
    queryFn: async () => stocktakeEnhance.getOrphanSns(),
  });
  const orphans: OrphanSn[] = orphanSns ?? [];

  // R3 状态差异
  const { data: statusDiffs } = useQuery({
    queryKey: ['reconcile', 'statusDiffs'],
    queryFn: async () => stocktakeEnhance.getStatusDiffs(),
  });
  const statusDiffRows: StatusDiffRow[] = statusDiffs ?? [];

  // 重新对账（B5）：真实 R1 优先（不可达用内置样例），更新快照时间戳
  const rerunMutation = useMutation({
    mutationFn: async () => {
      let realResult: any = null;
      try {
        const res = await stocktakeService.reconcile(warehouseId || undefined);
        realResult = res.data.data;
      } catch {
        realResult = null; // TODO(backend): 后端不可达时使用内置样例差异
      }
      return stocktakeEnhance.runReconcile(operator, realResult);
    },
    onSuccess: (snap) => {
      message.success(`本次对账完成，差异数：${snap.diff_count}（无归属SN：${snap.orphan_sn}）`);
      queryClient.invalidateQueries({ queryKey: ['reconcile'] });
    },
    onError: () => {
      message.error('对账失败');
    },
  });

  // 首次进入无快照时自动跑一次
  const hasRunRef = React.useRef(false);
  useEffect(() => {
    if (!hasRunRef.current && !snapshot && !rerunMutation.isPending) {
      hasRunRef.current = true;
      rerunMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot]);

  // B3：批量绑定仓库
  const bindMutation = useMutation({
    mutationFn: async ({ sns, wid, wname }: { sns: string[]; wid: number; wname: string }) =>
      stocktakeEnhance.bindOrphanSns(sns, wid, wname, operator),
    onSuccess: (remaining) => {
      message.success(`绑定成功，剩余无归属SN：${remaining}（已记操作日志）`);
      setBindVisible(false);
      setBindSelected([]);
      setBindWarehouseId(undefined);
      queryClient.invalidateQueries({ queryKey: ['reconcile'] });
    },
    onError: () => {
      message.error('绑定失败');
    },
  });

  const handleBind = () => {
    if (bindSelected.length === 0) {
      message.warning('请先在左侧勾选需要绑定的 SN');
      return;
    }
    if (!bindWarehouseId) {
      message.warning('请选择右侧目标仓库');
      return;
    }
    const wid = Number(bindWarehouseId);
    const wname =
      (Array.isArray(warehousesData)
        ? warehousesData.find((w: any) => Number(w.id) === wid)?.name
        : undefined) ?? `仓库#${wid}`;
    bindMutation.mutate({
      sns: bindSelected.map(String),
      wid,
      wname,
    });
  };

  // B4：导出差异明细 CSV
  const handleExport = () => {
    const warehouseLabel =
      (Array.isArray(warehousesData)
        ? warehousesData.find((w: any) => String(w.id) === warehouseId)?.name
        : undefined) ?? '全部仓库';
    const filename = stocktakeEnhance.exportReconcileCsv(warehouseLabel);
    message.success(`差异明细已导出：${filename}`);
  };

  const warehouseNameById = (wid: number | string) => {
    const hit = Array.isArray(warehousesData)
      ? warehousesData.find((w: any) => String(w.id) === String(wid))
      : undefined;
    return hit?.name ?? `仓库#${wid}`;
  };

  const r1Columns: ColumnsType<ReconcileDiff> = [
    {
      title: '商品',
      key: 'product',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.product_name}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            SKU: {record.sku}
          </Text>
        </div>
      ),
    },
    {
      title: '对账口径',
      dataIndex: 'ledger_type',
      key: 'ledger_type',
      width: 120,
      render: (type) => (
        <Tag color={type === 'sn' ? 'cyan' : 'blue'}>
          {type === 'sn' ? 'SN台账' : '批次台账'}
        </Tag>
      ),
    },
    {
      title: '仓库',
      dataIndex: 'warehouse_id',
      key: 'warehouse_id',
      width: 130,
      render: (wid: number) => warehouseNameById(wid),
    },
    {
      title: '总账数量',
      dataIndex: 'inventory_qty',
      key: 'inventory_qty',
      width: 130,
      align: 'right',
      render: (text) => <Text code>{text}</Text>,
    },
    {
      title: '明细数量',
      dataIndex: 'detail_qty',
      key: 'detail_qty',
      width: 130,
      align: 'right',
      render: (text) => <Text code>{text}</Text>,
    },
    {
      title: '差异',
      dataIndex: 'diff',
      key: 'diff',
      width: 120,
      align: 'right',
      render: (text) => {
        const num = Number(text);
        return (
          <Text type={num > 0 ? 'warning' : 'danger'} strong>
            {num > 0 ? '+' : ''}
            {text}
          </Text>
        );
      },
    },
  ];

  const orphanColumns: ColumnsType<OrphanSn> = [
    {
      title: 'SN',
      dataIndex: 'sn',
      key: 'sn',
      render: (text) => <Text code copyable>{text}</Text>,
    },
    {
      title: '商品',
      key: 'product',
      render: (_, record) => (
        <div>
          <div>{record.product_name}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            SKU: {record.sku}
          </Text>
        </div>
      ),
    },
    {
      title: '系统状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (s) => (s === 'in_stock' ? <Tag color="green">在库</Tag> : <Tag>{s}</Tag>),
    },
    {
      title: '归属仓库',
      key: 'bound',
      width: 120,
      render: (_, record) =>
        record.bound_warehouse_id ? (
          <Tag color="cyan">{record.bound_warehouse_name}</Tag>
        ) : (
          <Tag color="red">无归属</Tag>
        ),
    },
  ];

  const statusDiffColumns: ColumnsType<StatusDiffRow> = [
    {
      title: 'SN',
      dataIndex: 'sn',
      key: 'sn',
      render: (text) => <Text code copyable>{text}</Text>,
    },
    {
      title: '商品',
      dataIndex: 'product_name',
      key: 'product_name',
    },
    {
      title: '仓库',
      dataIndex: 'warehouse_name',
      key: 'warehouse_name',
      width: 120,
    },
    {
      title: '系统状态',
      key: 'sys_status',
      width: 100,
      render: () => <Tag color="green">在库</Tag>,
    },
    {
      title: '差异问题',
      dataIndex: 'issue',
      key: 'issue',
      width: 150,
      render: (text, record) => (
        <Tooltip title={`最后出库/在站时间：${record.last_out_at}`}>
          <Tag color="volcano">{text}（超{record.days_over}天）</Tag>
        </Tooltip>
      ),
    },
    {
      title: '最后出库/在站时间',
      dataIndex: 'last_out_at',
      key: 'last_out_at',
      width: 170,
    },
  ];

  const r1Diffs = snapshot?.r1_diffs ?? [];
  const totalDiffCount =
    (snapshot?.diff_count ?? 0) + orphans.length + statusDiffRows.length;

  return (
    <div>
      <PageHeader
        title="库存对账"
        sub="总账↔明细账（R1）、归属完整性（R2）、状态一致（R3）三规则对账，差异供盘点消化"
      />

      {/* B1：本次对账时间 + 操作人（取自最新 reconcile_snapshots） */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space size="large" wrap>
          <Space size={6}>
            <HistoryOutlined style={{ color: 'var(--cyan)' }} />
            <Text type="secondary">本次对账时间：</Text>
            <Text strong>{snapshot?.run_at ?? '尚未对账'}</Text>
          </Space>
          <Space size={6}>
            <UserOutlined style={{ color: 'var(--cyan)' }} />
            <Text type="secondary">操作人：</Text>
            <Text strong>{snapshot?.operator ?? '-'}</Text>
          </Space>
          <Space size={6}>
            <Text type="secondary">快照来源：</Text>
            <Tag color="violet">reconcile_snapshots</Tag>
            <Tooltip title="TODO(backend)：快照目前落前端增强层，后端建表后自动切换">
              <Text type="secondary" style={{ fontSize: 12 }}>
                mock
              </Text>
            </Tooltip>
          </Space>
        </Space>
      </Card>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="已对账组合"
              value={snapshot?.checked ?? 0}
              prefix={<FileSearchOutlined style={{ color: 'var(--cyan)' }} />}
              valueStyle={{ color: 'var(--cyan)' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="差异数"
              value={snapshot?.diff_count ?? 0}
              prefix={<WarningOutlined style={{ color: 'var(--amber)' }} />}
              valueStyle={{ color: 'var(--amber)' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="是否平衡"
              value={snapshot ? (snapshot.is_balanced && orphans.length === 0 && statusDiffRows.length === 0 ? '是' : '否') : '-'}
              prefix={
                snapshot?.is_balanced && orphans.length === 0 && statusDiffRows.length === 0 ? (
                  <CheckCircleOutlined style={{ color: 'var(--green)' }} />
                ) : (
                  <WarningOutlined style={{ color: 'var(--red)' }} />
                )
              }
              valueStyle={{
                color:
                  snapshot?.is_balanced && orphans.length === 0 && statusDiffRows.length === 0
                    ? 'var(--green)'
                    : 'var(--red)',
              }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="无归属SN"
              value={orphans.length}
              prefix={<DatabaseOutlined style={{ color: 'var(--violet)' }} />}
              valueStyle={{ color: 'var(--violet)' }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="对账结果（三规则分组）"
        extra={
          <Space>
            <Select
              placeholder="选择仓库"
              value={warehouseId || undefined}
              onChange={(v) => setWarehouseId(v)}
              style={{ width: 200 }}
              allowClear
            >
              {Array.isArray(warehousesData)
                ? warehousesData.map((w: any) => (
                    <Option key={w.id} value={String(w.id)}>
                      {w.name}
                    </Option>
                  ))
                : null}
            </Select>
            <Button icon={<SyncOutlined />} onClick={() => queryClient.invalidateQueries({ queryKey: ['reconcile'] })}>
              刷新
            </Button>
            <Button
              type="primary"
              icon={<RedoOutlined />}
              loading={rerunMutation.isPending}
              onClick={() => rerunMutation.mutate()}
            >
              重新对账
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              导出差异明细
            </Button>
          </Space>
        }
      >
        {!snapshot ? (
          <Empty description="尚未对账，点击「重新对账」生成快照" />
        ) : (
          <>
            {snapshot.is_balanced && orphans.length === 0 && statusDiffRows.length === 0 ? (
              <Alert
                type="success"
                message="对账平衡"
                description="三规则全部通过：总账=明细账、归属完整、状态一致。"
                showIcon
                style={{ marginBottom: 16 }}
              />
            ) : (
              <Alert
                type="warning"
                message="发现差异"
                description={`R1 差异 ${snapshot.diff_count} 处 · R2 无归属SN ${orphans.length} 条 · R3 状态差异 ${statusDiffRows.length} 条，建议创建盘点单消化差异。`}
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}

            <Tabs
              defaultActiveKey="r1"
              items={[
                {
                  key: 'r1',
                  label: (
                    <span>
                      R1 总账 vs 明细
                      {r1Diffs.length > 0 && <Tag color="amber" style={{ marginLeft: 8 }}>{r1Diffs.length}</Tag>}
                    </span>
                  ),
                  children: (
                    <Table
                      columns={r1Columns}
                      dataSource={r1Diffs}
                      rowKey={(record) => `${record.product_id}-${record.warehouse_id}`}
                      pagination={false}
                      scroll={{ x: 800 }}
                      size="small"
                      locale={{ emptyText: <Empty description="无差异数据" /> }}
                    />
                  ),
                },
                {
                  key: 'r2',
                  label: (
                    <span>
                      R2 归属完整性
                      {orphans.length > 0 && <Tag color="red" style={{ marginLeft: 8 }}>{orphans.length}</Tag>}
                    </span>
                  ),
                  children: (
                    <>
                      <Alert
                        type="info"
                        message={`存在 ${orphans.length} 条无仓库归属的在库 SN`}
                        description="这些 SN 在库但缺 warehouse_id，未参与 R1 对账；绑定归属仓库后将计入对账口径并记操作日志。"
                        showIcon
                        style={{ marginBottom: 12 }}
                        action={
                          <Button icon={<LinkOutlined />} onClick={() => setBindVisible(true)}>
                            批量绑定仓库
                          </Button>
                        }
                      />
                      <Table
                        columns={orphanColumns}
                        dataSource={orphans}
                        rowKey="sn"
                        pagination={false}
                        size="small"
                        locale={{ emptyText: <Empty description="无无归属SN" /> }}
                      />
                    </>
                  ),
                },
                {
                  key: 'r3',
                  label: (
                    <span>
                      R3 状态一致
                      {statusDiffRows.length > 0 && <Tag color="volcano" style={{ marginLeft: 8 }}>{statusDiffRows.length}</Tag>}
                    </span>
                  ),
                  children: (
                    <Table
                      columns={statusDiffColumns}
                      dataSource={statusDiffRows}
                      rowKey="sn"
                      pagination={false}
                      size="small"
                      locale={{ emptyText: <Empty description="无状态差异" /> }}
                    />
                  ),
                },
              ]}
            />
          </>
        )}
      </Card>

      {/* B3：批量绑定仓库弹窗（左：无归属SN多选表；右：仓库下拉） */}
      <Modal
        title="批量绑定无归属 SN"
        open={bindVisible}
        onCancel={() => {
          setBindVisible(false);
          setBindSelected([]);
          setBindWarehouseId(undefined);
        }}
        onOk={handleBind}
        okText="确认绑定"
        confirmLoading={bindMutation.isPending}
        width={760}
      >
        <Row gutter={16}>
          <Col span={15}>
            <Card
              size="small"
              title={`无归属 SN（${bindSelected.length}/${orphans.length} 已选）`}
              styles={{ body: { maxHeight: 360, overflowY: 'auto' } }}
            >
              <Table
                size="small"
                columns={[
                  { title: 'SN', dataIndex: 'sn', key: 'sn', render: (t) => <Text code>{t}</Text> },
                  { title: '商品', dataIndex: 'product_name', key: 'product_name' },
                ]}
                dataSource={orphans}
                rowKey="sn"
                pagination={false}
                rowSelection={{
                  selectedRowKeys: bindSelected,
                  onChange: (keys) => setBindSelected(keys),
                }}
                locale={{ emptyText: <Empty description="无未绑定 SN" /> }}
              />
            </Card>
          </Col>
          <Col span={9}>
            <Card size="small" title="目标仓库">
              <Select
                placeholder="选择归属仓库"
                style={{ width: '100%' }}
                value={bindWarehouseId}
                onChange={setBindWarehouseId}
                showSearch
                optionFilterProp="children"
              >
                {Array.isArray(warehousesData)
                  ? warehousesData.map((w: any) => (
                      <Option key={w.id} value={String(w.id)}>
                        {w.name}
                      </Option>
                    ))
                  : null}
              </Select>
              <Alert
                type="info"
                showIcon
                style={{ marginTop: 12 }}
                message="确认后写入 warehouse_id，并记操作日志；无归属SN卡片计数将实时减少。"
              />
            </Card>
          </Col>
        </Row>
      </Modal>
    </div>
  );
};

export default ReconcilePage;

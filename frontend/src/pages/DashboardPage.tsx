import React, { useState } from 'react';
import { Button, Form, Input, Modal, Select, Spin, Table } from 'antd';
import {
  BarcodeOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  EyeOutlined,
  HomeOutlined,
  ImportOutlined,
  ExportOutlined,
  LineChartOutlined,
  PieChartOutlined,
  PlusOutlined,
  ProjectOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { queryKeys } from '../utils/queryClient';
import { api } from '../services/api';
import type { DashboardStats } from '../types/api';
import { CapacityBar, DonutChart, PageHeader, Panel, StatCard, TrendChart } from '../components/ui';

/** 兜底演示数据：接口未返回时保持界面可读（原型口径） */
const FALLBACK: DashboardStats = {
  stats: {
    total_warehouses: 6,
    total_products: 1258,
    total_inventory: 856,
    low_stock_count: 24,
    pending_inbound: 142,
    pending_outbound: 98,
  },
  daily_orders: {
    inbound_orders: 4,
    outbound_orders: 4,
    completed_inbound: 12,
    completed_outbound: 7,
  },
  monthly_trends: [],
  low_stock_products: [],
  popular_products: [],
  warehouse_utilization: [],
  recent_transactions: [],
};

const TREND_FALLBACK_IN = [12, 18, 14, 22, 19, 26, 24, 30, 27, 34, 31, 38, 35, 42];
const TREND_FALLBACK_OUT = [8, 11, 9, 14, 12, 16, 15, 19, 17, 22, 20, 24, 22, 26];
const TREND_LABELS = Array.from({ length: 14 }, (_, i) => `${i + 17}日`);

const QUICK_ACTIONS = [
  { key: '/inbound', label: '新增入库', icon: <ImportOutlined />, color: 'var(--cyan-dim)', fg: 'var(--cyan)' },
  { key: '/outbound', label: '设备出库', icon: <ExportOutlined />, color: 'var(--amber-dim)', fg: 'var(--amber)' },
  { key: '/devices', label: '查找设备', icon: <SearchOutlined />, color: 'var(--violet-dim)', fg: 'var(--violet)' },
  { key: '/warehouses', label: '仓库管理', icon: <HomeOutlined />, color: 'var(--green-dim)', fg: 'var(--green)' },
  { key: '/inventory', label: '库存查询', icon: <DashboardOutlined />, color: 'rgba(248,113,113,.12)', fg: '#f87171' },
  { key: '/scrap', label: '报废申请', icon: <DeleteOutlined />, color: 'rgba(148,163,184,.1)', fg: '#94a3b8' },
];

const WAREHOUSE_COLORS = ['var(--cyan)', 'var(--green)', 'var(--violet)', 'var(--amber)', 'var(--red)'];

const DEVICE_ROWS = [
  {
    key: '1',
    deviceId: 'DEV2024010001',
    deviceType: '5G基站',
    model: 'AAU5613',
    warehouse: '主仓库A区',
    status: 'in_stock',
  },
  {
    key: '2',
    deviceId: 'DEV2024010002',
    deviceType: '核心网设备',
    model: 'NE9000',
    warehouse: '主仓库B区',
    status: 'outbound',
  },
  {
    key: '3',
    deviceId: 'DEV2024010003',
    deviceType: '光传输设备',
    model: 'OTN9800',
    warehouse: '备用仓库',
    status: 'in_stock',
  },
  {
    key: '4',
    deviceId: 'DEV2023120015',
    deviceType: '路由器',
    model: 'AR6100',
    warehouse: '主仓库A区',
    status: 'scrap',
  },
];

const STATUS_MAP: Record<string, { tone: string; text: string }> = {
  in_stock: { tone: 'done', text: '在库' },
  outbound: { tone: 'processing', text: '出库' },
  scrap: { tone: 'urgent', text: '报废' },
};

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [isScrapModalVisible, setIsScrapModalVisible] = useState(false);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const [form] = Form.useForm();

  const { data: stats, isLoading } = useQuery({
    queryKey: queryKeys.reports.dashboard(),
    queryFn: async () => {
      const response = await api.get<DashboardStats>('/reports/dashboard');
      return response.data.data;
    },
  });

  const s = stats ?? FALLBACK;
  const trends = stats?.monthly_trends?.length ? stats.monthly_trends : [];
  const trendIn = trends.length ? trends.map((t) => Number(t.inbound) || 0) : TREND_FALLBACK_IN;
  const trendOut = trends.length ? trends.map((t) => Number(t.outbound) || 0) : TREND_FALLBACK_OUT;
  const trendLabels = trends.length ? trends.map((t) => t.month) : TREND_LABELS;

  const utilization = Array.isArray(stats?.warehouse_utilization) ? stats.warehouse_utilization : [];

  const handleScrapClick = (record: any) => {
    setSelectedDevice(record);
    setIsScrapModalVisible(true);
  };

  const handleScrapConfirm = async () => {
    try {
      const values = await form.validateFields();
      console.log('报废申请数据:', { deviceId: selectedDevice?.deviceId, ...values });
      setIsScrapModalVisible(false);
      form.resetFields();
      setSelectedDevice(null);
    } catch {
      /* 校验失败保持弹窗 */
    }
  };

  const handleViewClick = (record: any) => {
    setSelectedDevice(record);
    setIsDetailModalVisible(true);
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '120px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="通信设备仓储中心"
        sub="实时掌握库存动态 · 数据每 30 秒自动同步"
        live
      />

      {/* 统计卡 */}
      <div className="wm-stat-grid">
        <StatCard
          label="总设备数"
          value={(s.stats?.total_products ?? 0).toLocaleString()}
          unit="台"
          tone="cyan"
          icon={<DatabaseOutlined />}
          delta={{ value: '▲ +5%', up: true }}
          vs="较上月"
          spark={[30, 42, 38, 50, 45, 60, 55, 68, 62, 75]}
        />
        <StatCard
          label="在库设备"
          value={(s.stats?.total_inventory ?? 0).toLocaleString()}
          unit="台"
          tone="green"
          icon={<HomeOutlined />}
          delta={{ value: '92%', up: true }}
          vs="库位占用率"
          spark={[60, 55, 62, 58, 64, 60, 66, 63, 68, 65]}
          delay={0.06}
        />
        <StatCard
          label="本月入库"
          value={(s.stats?.pending_inbound ?? 0).toLocaleString()}
          unit="台"
          tone="violet"
          icon={<ImportOutlined />}
          delta={{ value: '▲ +12%', up: true }}
          vs="较上月"
          spark={[20, 35, 28, 42, 38, 50, 46, 58, 52, 64]}
          delay={0.12}
        />
        <StatCard
          label="本月出库"
          value={(s.stats?.pending_outbound ?? 0).toLocaleString()}
          unit="台"
          tone="amber"
          icon={<ExportOutlined />}
          delta={{ value: '▼ -3%', up: false }}
          vs="较上月"
          spark={[50, 45, 52, 48, 40, 44, 38, 42, 36, 40]}
          delay={0.18}
        />
      </div>

      {/* 快捷操作 */}
      <div className="wm-quick-grid">
        {QUICK_ACTIONS.map((q) => (
          <div key={q.key} className="wm-quick-item" onClick={() => navigate(q.key)}>
            <div className="qi-icon" style={{ background: q.color, color: q.fg }}>
              {q.icon}
            </div>
            <div className="qi-name">{q.label}</div>
          </div>
        ))}
      </div>

      {/* 趋势 + 容量 */}
      <div className="wm-grid-dash">
        <Panel
          title="出入库趋势（近14天）"
          icon={<LineChartOutlined />}
          legend={[
            { color: 'var(--cyan)', label: '入库' },
            { color: 'var(--amber)', label: '出库' },
          ]}
        >
          <TrendChart
            series={[
              { name: '入库', color: '#22d3ee', data: trendIn },
              { name: '出库', color: '#fbbf24', data: trendOut },
            ]}
            labels={trendLabels}
          />
        </Panel>

        <Panel title="仓库容量" icon={<HomeOutlined />}>
          {utilization.length > 0 ? (
            utilization.slice(0, 6).map((w: any, i: number) => (
              <CapacityBar
                key={w.id ?? i}
                label={w.name ?? w.warehouse_name ?? `仓库 ${i + 1}`}
                percent={Number(w.utilization ?? w.rate ?? 0)}
                color={WAREHOUSE_COLORS[i % WAREHOUSE_COLORS.length]}
              />
            ))
          ) : (
            <>
              <CapacityBar label="A区 · 核心网络设备" percent={92} color="var(--cyan)" />
              <CapacityBar label="B区 · 传输与接入" percent={78} color="var(--green)" />
              <CapacityBar label="C区 · 无线与终端" percent={64} color="var(--violet)" />
              <CapacityBar label="D区 · 备件耗材" percent={45} color="var(--amber)" />
              <CapacityBar label="维修区" percent={30} color="var(--red)" />
            </>
          )}
        </Panel>
      </div>

      {/* 活动 + 设备分布 */}
      <div className="wm-grid-2">
        <Panel
          title="最近活动"
          icon={<ProjectOutlined />}
          extra={
            <Button size="small" onClick={() => navigate('/operation-logs')}>
              查看全部
            </Button>
          }
        >
          {DEVICE_ROWS.slice(0, 4).map((r, i) => (
            <div className="wm-activity-item" key={r.key}>
              <div
                className="wm-act-dot"
                style={{
                  background: i % 2 === 0 ? 'var(--green-dim)' : 'var(--cyan-dim)',
                  color: i % 2 === 0 ? 'var(--green)' : 'var(--cyan)',
                }}
              >
                {i % 2 === 0 ? <PlusOutlined /> : <BarcodeOutlined />}
              </div>
              <div className="wm-act-body">
                <div className="wm-act-title">
                  {r.deviceType} {r.model} 库存变动
                </div>
                <div className="wm-act-time">
                  {r.deviceId} · {r.warehouse}
                </div>
              </div>
              <span className={`wm-status ${STATUS_MAP[r.status]?.tone ?? 'muted'}`}>
                {STATUS_MAP[r.status]?.text ?? r.status}
              </span>
            </div>
          ))}
        </Panel>

        <Panel title="设备类型分布" icon={<PieChartOutlined />}>
          <DonutChart
            centerLabel="设备总数"
            data={[
              { label: '路由器', value: 412, color: '#22d3ee' },
              { label: '交换机', value: 356, color: '#34d399' },
              { label: '基站设备', value: 218, color: '#a78bfa' },
              { label: '防火墙', value: 145, color: '#fbbf24' },
              { label: '无线AP', value: 127, color: '#f472b6' },
            ]}
          />
        </Panel>
      </div>

      {/* 设备列表 */}
      <Panel title="设备列表" icon={<DatabaseOutlined />}>
        <Table
          dataSource={DEVICE_ROWS}
          columns={[
            { title: '设备编号', dataIndex: 'deviceId', key: 'deviceId', render: (v: string) => <span className="wm-mono">{v}</span> },
            { title: '设备类型', dataIndex: 'deviceType', key: 'deviceType' },
            { title: '型号', dataIndex: 'model', key: 'model', render: (v: string) => <span className="wm-mono">{v}</span> },
            { title: '所属仓库', dataIndex: 'warehouse', key: 'warehouse' },
            {
              title: '状态',
              dataIndex: 'status',
              key: 'status',
              render: (status: string) => (
                <span className={`wm-status ${STATUS_MAP[status]?.tone ?? 'muted'}`}>
                  {STATUS_MAP[status]?.text ?? status}
                </span>
              ),
            },
            {
              title: '操作',
              key: 'action',
              render: (_, record: any) => (
                <div style={{ display: 'flex', gap: 4 }}>
                  <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewClick(record)}>
                    查看
                  </Button>
                  {record.status !== 'scrap' && (
                    <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleScrapClick(record)}>
                      报废
                    </Button>
                  )}
                </div>
              ),
            },
          ]}
          pagination={{ pageSize: 4, size: 'small' }}
        />
      </Panel>

      <Modal
        title="设备详情"
        open={isDetailModalVisible}
        onCancel={() => {
          setIsDetailModalVisible(false);
          setSelectedDevice(null);
        }}
        footer={[
          <Button key="close" onClick={() => setIsDetailModalVisible(false)}>
            知道了
          </Button>,
        ]}
        width={600}
      >
        {selectedDevice && (
          <div>
            <div className="wm-oc-meta">
              {[
                { k: '设备编号', v: selectedDevice.deviceId },
                { k: '状态', v: STATUS_MAP[selectedDevice.status]?.text ?? selectedDevice.status },
                { k: '设备类型', v: selectedDevice.deviceType },
                { k: '型号', v: selectedDevice.model },
                { k: '所属仓库', v: selectedDevice.warehouse },
                { k: '序列号', v: `HW${selectedDevice.deviceId}` },
              ].map((row) => (
                <div className="m" key={row.k}>
                  <div className="k">{row.k}</div>
                  <div className="v">{row.v}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        title="设备报废确认"
        open={isScrapModalVisible}
        onOk={handleScrapConfirm}
        onCancel={() => {
          setIsScrapModalVisible(false);
          form.resetFields();
          setSelectedDevice(null);
        }}
        okText="确认报废"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <p>
          确定要将设备 <strong>{selectedDevice?.deviceId}</strong> 标记为报废吗？
        </p>
        <Form form={form} layout="vertical">
          <Form.Item name="reason" label="报废原因" rules={[{ required: true, message: '请选择报废原因' }]}>
            <Select
              placeholder="请选择报废原因"
              options={['设备老化', '技术淘汰', '损坏无法修复', '其他原因'].map((v) => ({ label: v, value: v }))}
            />
          </Form.Item>
          <Form.Item name="remark" label="备注信息">
            <Input.TextArea rows={3} placeholder="请输入备注信息" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DashboardPage;

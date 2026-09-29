import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader';
import {
  Card,
  Button,
  Space,
  Tag,
  Input,
  Table,
  Modal,
  Select,
  InputNumber,
  Row,
  Col,
  Statistic,
  Typography,
  message,
  Alert,
  Empty,
  Tooltip,
  Divider,
  AutoComplete,
  Descriptions,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ArrowLeftOutlined,
  ScanOutlined,
  CheckSquareOutlined,
  AuditOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeInvisibleOutlined,
  EditOutlined,
  ImportOutlined,
  ExportOutlined,
  IdcardOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { stocktakeService, getStocktakeStatusText } from '../services/stocktakeService';
import {
  stocktakeEnhance,
  diffRate,
  DIFF_REASON_RATE_THRESHOLD,
  DIFF_REASON_OPTIONS,
  type EnhanceStocktakeItem,
  type StocktakeAdjustmentOrder,
} from '../services/stocktakeEnhance';
import { useAuthStore } from '../store/authStore';
import { usePermission } from '../hooks/usePermission';

const { Text } = Typography;

const STATUS_COLORS: Record<string, string> = {
  draft: 'default',
  counting: 'processing',
  pending_review: 'warning',
  completed: 'success',
  cancelled: 'error',
};

const StocktakeCountPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const orderId = Number(id);
  const user = useAuthStore((s) => s.user);
  const operator = user?.fullName || user?.username || '-';
  const { can } = usePermission();
  const scanInputRef = useRef<any>(null);

  // 增强层为 localStorage 同步存储：tick 驱动重读
  const [tick, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  const [scanValue, setScanValue] = useState('');
  const [scanMsg, setScanMsg] = useState<{ type: 'success' | 'warning' | 'error'; text: string } | null>(null);
  const [reasons, setReasons] = useState<Record<number, string>>({});
  const [reviewNotes, setReviewNotes] = useState('');
  const [rejectVisible, setRejectVisible] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');
  const [deviceTag] = useState('PC-盘点端');

  const isMockOrder = useMemo(() => !!stocktakeEnhance.getMockOrder(orderId), [orderId]);

  // 后端单详情/明细（mock 单不拉后端）
  const { data: backendOrder } = useQuery({
    queryKey: ['stocktakes', 'detail', orderId],
    queryFn: async () => {
      try {
        const res = await stocktakeService.getStocktake(orderId);
        return res.data.data;
      } catch {
        return null;
      }
    },
    enabled: !!orderId && !isMockOrder,
    retry: false,
  });

  const { data: backendItems } = useQuery({
    queryKey: ['stocktakes', 'items', orderId],
    queryFn: async () => {
      try {
        const res = await stocktakeService.getItems(orderId, { limit: 1000 });
        return res.data.data.list || [];
      } catch {
        return [];
      }
    },
    enabled: !!orderId && !isMockOrder,
    retry: false,
  });

  // 首次进入：把后端快照明细转换入增强层统一结构（盲盘/实盘/双签走增强层）
  useEffect(() => {
    if (!orderId || isMockOrder) return;
    if (stocktakeEnhance.getItems(orderId).length > 0) return;
    if (backendItems && backendItems.length > 0) {
      stocktakeEnhance.ensureItemsFromBackend(orderId, backendItems);
      refresh();
    }
  }, [orderId, isMockOrder, backendItems]);

  // 页面数据（增强层）
  const data = useMemo(() => {
    const mockOrder = stocktakeEnhance.getMockOrder(orderId);
    const meta = stocktakeEnhance.getMeta(orderId);
    const items = stocktakeEnhance.getItems(orderId);
    const orderNumber = mockOrder?.order_number || backendOrder?.order_number || `#${orderId}`;
    const warehouseName = mockOrder?.warehouse_name || backendOrder?.warehouse_name || '';
    const status = (meta?.status ?? mockOrder?.status ?? backendOrder?.status ?? 'draft') as string;
    const blindFlag = meta?.blind_flag ?? 1;
    return {
      mockOrder,
      meta,
      items,
      orderNumber,
      warehouseName,
      status,
      blindFlag: blindFlag === 1,
      snapshotAt: mockOrder?.snapshot_at || backendOrder?.snapshot_at || meta && undefined,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, tick, backendOrder]);

  const { meta, items, orderNumber, warehouseName, status, blindFlag } = data;

  // 差异原因本地态（审核通过时以 store 为准，onChange 即写 store）
  useEffect(() => {
    const initial: Record<number, string> = {};
    items.forEach((i) => {
      if (i.reason) initial[i.id] = i.reason;
    });
    setReasons(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, status]);

  const countedRows = items.filter((i) => i.counted_qty != null);
  const pendingRows = items.filter((i) => i.counted_qty == null);
  const diffRows = items.filter((i) => Number(i.diff_qty ?? 0) !== 0);

  // ---------- 动作 ----------

  const handleStart = () => {
    try {
      stocktakeEnhance.startCounting(orderId, operator);
      message.success('盘点已开始，账面已冻结');
      refresh();
    } catch (e: any) {
      message.error(e?.message || '开始失败');
    }
  };

  const handleScan = () => {
    const sn = scanValue.trim();
    if (!sn) return;
    if (status !== 'counting') {
      message.warning('盘点单不在盘点中状态，无法扫码');
      return;
    }
    const r = stocktakeEnhance.scanSn(orderId, sn, operator, deviceTag);
    if (r.result === 'matched') {
      setScanMsg({ type: 'success', text: r.message });
      message.success(r.message);
    } else if (r.result === 'duplicate') {
      setScanMsg({ type: 'warning', text: r.message });
      message.warning(r.message);
    } else {
      setScanMsg({ type: 'error', text: r.message });
      message.error(r.message);
    }
    setScanValue('');
    refresh();
    setTimeout(() => scanInputRef.current?.focus(), 50);
  };

  const handleRecord = (item: EnhanceStocktakeItem, value: number | null) => {
    if (value === null || value === undefined) return;
    try {
      stocktakeEnhance.recordCounted(orderId, item.id, String(value), operator, deviceTag);
      message.success(`${item.sn || item.batch_no} 已记录实盘 ${value} ${item.unit}`);
      refresh();
    } catch (e: any) {
      message.error(e?.message || '录盘失败');
    }
  };

  const handleSign = (role: 'keeper' | 'supervisor') => {
    const roleText = role === 'keeper' ? '代维负责人' : '移动主管';
    Modal.confirm({
      title: `${roleText}手写签字确认`,
      content: `确认以「${operator}」身份为盘点单 ${orderNumber} 签字？签字后将记录时间戳。`,
      okText: '确认签字',
      cancelText: '取消',
      onOk: () => {
        try {
          stocktakeEnhance.signOrder(orderId, role, operator);
          message.success(`${roleText}签字成功`);
          refresh();
        } catch (e: any) {
          message.error(e?.message || '签字失败');
        }
      },
    });
  };

  const handleSubmit = () => {
    try {
      stocktakeEnhance.submitCounting(orderId, operator);
      message.success('实盘已提交，服务层比对生成差异，待审核');
      refresh();
    } catch (e: any) {
      message.error(e?.message || '提交失败');
    }
  };

  const handleReviewPass = () => {
    try {
      const result = stocktakeEnhance.reviewOrder(orderId, operator, reviewNotes);
      Modal.success({
        title: '审核通过，调整单已生成',
        content: (
          <div>
            <p>
              调整单号：<Text strong copyable>{result.adjustment_number}</Text>
            </p>
            <p>
              {result.surplus_order && (
                <span>
                  盘盈 → 其他入库单（SURPLUS_IN）{result.surplus_order.order_number}，已写入入库管理；
                </span>
              )}
            </p>
            <p>
              {result.deficit_order && (
                <span>
                  盘亏 → 其他出库单（DEFICIT_OUT）{result.deficit_order.order_number}，已写出库管理。
                </span>
              )}
            </p>
          </div>
        ),
      });
      refresh();
    } catch (e: any) {
      message.error(e?.message || '审核失败');
    }
  };

  const handleReviewReject = () => {
    try {
      stocktakeEnhance.rejectOrder(orderId, rejectNotes, operator);
      message.success('已驳回，盘点单回到盘点中（保留实盘数据，差异原因已清空待修正）');
      setRejectVisible(false);
      setRejectNotes('');
      refresh();
    } catch (e: any) {
      message.error(e?.message || '驳回失败');
    }
  };

  // ---------- 表格 ----------

  /** 盲盘执行列：不渲染账面（book_qty）列 */
  const countingColumns: ColumnsType<EnhanceStocktakeItem> = [
    {
      title: '类型',
      dataIndex: 'row_type',
      key: 'row_type',
      width: 80,
      render: (t) => (t === 'sn' ? <Tag color="cyan">普件SN</Tag> : <Tag color="blue">散料卷号</Tag>),
    },
    {
      title: 'SN / 卷号',
      key: 'sn_batch',
      width: 190,
      render: (_, item) => (
        <Text code copyable={!!(item.sn || item.batch_no)}>
          {item.sn || item.batch_no || '-'}
        </Text>
      ),
    },
    {
      title: '产品',
      key: 'product',
      render: (_, item) => (
        <div>
          <div>{item.product_name}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            SKU: {item.product_sku || '-'}
          </Text>
        </div>
      ),
    },
    ...(blindFlag
      ? []
      : [
          {
            title: '账面',
            dataIndex: 'book_qty',
            key: 'book_qty',
            width: 110,
            align: 'right' as const,
            render: (v: string, item: EnhanceStocktakeItem) => `${v} ${item.unit}`,
          },
        ]),
    {
      title: '实盘录入',
      key: 'counted',
      width: 180,
      render: (_, item) => (
        <InputNumber
          style={{ width: 150 }}
          min={0}
          step={item.measure_type === 'count' ? 1 : 0.0001}
          precision={item.measure_type === 'count' ? 0 : 4}
          addonAfter={item.unit}
          value={item.counted_qty != null ? Number(item.counted_qty) : undefined}
          disabled={item.counted_qty != null || status !== 'counting'}
          onBlur={(e) => handleRecord(item, Number((e.target as HTMLInputElement).value))}
          onPressEnter={(e: any) => handleRecord(item, Number(e.target.value))}
        />
      ),
    },
    {
      title: '盘点时间 / 设备',
      key: 'trace',
      width: 220,
      render: (_, item) =>
        item.counted_at ? (
          <div>
            <div style={{ fontSize: 12 }}>{item.counted_at}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {item.counted_by || '-'}
            </Text>
          </div>
        ) : (
          <Tag>未盘</Tag>
        ),
    },
  ];

  const reviewColumns: ColumnsType<EnhanceStocktakeItem> = [
    {
      title: '类型',
      dataIndex: 'row_type',
      key: 'row_type',
      width: 80,
      render: (t) => (t === 'sn' ? <Tag color="cyan">普件SN</Tag> : <Tag color="blue">散料卷号</Tag>),
    },
    {
      title: 'SN / 卷号',
      key: 'sn_batch',
      width: 190,
      render: (_, item) => (
        <Text code copyable={!!(item.sn || item.batch_no)}>
          {item.sn || item.batch_no || '-'}
        </Text>
      ),
    },
    {
      title: '产品',
      dataIndex: 'product_name',
      key: 'product_name',
      render: (v: string, item) => (
        <div>
          <div>{v}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            SKU: {item.product_sku || '-'}
          </Text>
        </div>
      ),
    },
    {
      title: '账面',
      dataIndex: 'book_qty',
      key: 'book_qty',
      width: 110,
      align: 'right',
      render: (v: string, item: EnhanceStocktakeItem) => `${v} ${item.unit}`,
    },
    {
      title: '实盘',
      dataIndex: 'counted_qty',
      key: 'counted_qty',
      width: 110,
      align: 'right',
      render: (v: string | null, item: EnhanceStocktakeItem) => `${v ?? '-'} ${item.unit}`,
    },
    {
      title: '差异',
      dataIndex: 'diff_qty',
      key: 'diff_qty',
      width: 100,
      align: 'right',
      render: (v: string) => {
        const n = Number(v ?? 0);
        return (
          <Text type={n > 0 ? 'success' : n < 0 ? 'danger' : 'secondary'} strong>
            {n > 0 ? '+' : ''}
            {v}
          </Text>
        );
      },
    },
    {
      title: '差异率',
      key: 'rate',
      width: 90,
      align: 'right',
      render: (_, item) => {
        const rate = diffRate(item.book_qty, item.diff_qty ?? '0');
        const pct = (rate * 100).toFixed(1) + '%';
        const over = rate > DIFF_REASON_RATE_THRESHOLD && Number(item.diff_qty ?? 0) !== 0;
        return over ? <Text type="danger" strong>{pct} · 必填</Text> : <Text type="secondary">{pct}</Text>;
      },
    },
    {
      title: '差异原因',
      key: 'reason',
      width: 200,
      render: (_, item) => {
        const need =
          Number(item.diff_qty ?? 0) !== 0 && diffRate(item.book_qty, item.diff_qty ?? '0') > DIFF_REASON_RATE_THRESHOLD;
        if (status !== 'pending_review') {
          return item.reason || (need ? <Text type="danger">未填</Text> : '-');
        }
        return (
          <AutoComplete
            style={{ width: 180 }}
            value={reasons[item.id] ?? item.reason}
            options={DIFF_REASON_OPTIONS.map((r) => ({ value: r }))}
            placeholder={need ? '差异率>3%，必填' : '选填'}
            status={need && !(reasons[item.id] ?? item.reason) ? 'error' : undefined}
            onChange={(val) => {
              setReasons((prev) => ({ ...prev, [item.id]: val }));
              stocktakeEnhance.setReason(orderId, item.id, val);
            }}
            disabled={!can('stocktake:post')}
          />
        );
      },
    },
  ];

  // ---------- 渲染 ----------

  if (!orderId || Number.isNaN(orderId)) {
    return <Alert type="error" message="盘点单ID无效" />;
  }

  const bothSigned = !!meta?.keeper_sign_at && !!meta?.supervisor_sign_at;

  return (
    <div style={{ paddingBottom: 88 }}>
      <PageHeader
        title="盘点执行（盲盘）"
        sub={`${orderNumber} · ${warehouseName || '-'} · ${meta?.vendor_name ?? ''} ${getStocktakeStatusText(status)}`}
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={refresh}>
              刷新
            </Button>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/stocktakes')}>
              返回列表
            </Button>
          </Space>
        }
      />

      {/* 盘点单信息 + 双签 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col xs={24} lg={14}>
            <Descriptions column={2} size="small">
              <Descriptions.Item label="盘点单号">{orderNumber}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={STATUS_COLORS[status]}>{getStocktakeStatusText(status)}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="仓库">{warehouseName || '-'}</Descriptions.Item>
              <Descriptions.Item label="代维公司">{meta?.vendor_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="代维负责人">{meta?.vendor_keeper || '-'}</Descriptions.Item>
              <Descriptions.Item label="移动主管">{meta?.cmcc_supervisor || '-'}</Descriptions.Item>
              <Descriptions.Item label="盲盘">
                {blindFlag ? (
                  <Tag icon={<EyeInvisibleOutlined />} color="cyan">
                    盲盘（不显示账面）
                  </Tag>
                ) : (
                  <Tag>明盘</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="账面快照时间">
                {(data.mockOrder as any)?.snapshot_at || backendOrder?.snapshot_at || '-'}
              </Descriptions.Item>
            </Descriptions>
          </Col>
          <Col xs={24} lg={10}>
            <Card
              size="small"
              title="双签（两签齐全才允许提交审核）"
              extra={
                status === 'counting' && can('stocktake:write') ? (
                  <Space>
                    <Button size="small" icon={<EditOutlined />} onClick={() => handleSign('keeper')}>
                      代维签字
                    </Button>
                    <Button size="small" icon={<IdcardOutlined />} onClick={() => handleSign('supervisor')}>
                      移动签字
                    </Button>
                  </Space>
                ) : null
              }
            >
              <Space direction="vertical" style={{ width: '100%' }} size={4}>
                <div>
                  代维负责人签字：
                  {meta?.keeper_sign_at ? (
                    <Text type="success" strong>
                      已签 {meta.keeper_sign_at}
                    </Text>
                  ) : (
                    <Text type="warning">未签字</Text>
                  )}
                </div>
                <div>
                  移动主管签字：
                  {meta?.supervisor_sign_at ? (
                    <Text type="success" strong>
                      已签 {meta.supervisor_sign_at}
                    </Text>
                  ) : (
                    <Text type="warning">未签字</Text>
                  )}
                </div>
              </Space>
            </Card>
          </Col>
        </Row>
      </Card>

      {/* 状态视图 */}
      {status === 'draft' && (
        <Card>
          <Alert
            type="info"
            showIcon
            message="盘点单尚未开始"
            description={`账面快照已于 ${data.mockOrder ? (data.mockOrder as any).snapshot_at : backendOrder?.snapshot_at ?? '-'} 生成，开始后将冻结该仓库账面。`}
            action={
              can('stocktake:write') && (
                <Button type="primary" onClick={handleStart}>
                  开始盘点
                </Button>
              )
            }
          />
        </Card>
      )}

      {status === 'cancelled' && (
        <Card>
          <Alert
            type="error"
            showIcon
            message="盘点单已取消"
            description={meta?.cancel_reason || '-'}
          />
        </Card>
      )}

      {status === 'counting' && (
        <Card
          title={
            <Space>
              <ScanOutlined />
              <span>盘点执行</span>
              {blindFlag && (
                <Tooltip title="盲盘：页面不显示账面数量，提交后由服务层比对生成差异">
                  <Tag icon={<EyeInvisibleOutlined />} color="cyan">
                    盲盘模式
                  </Tag>
                </Tooltip>
              )}
            </Space>
          }
        >
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="普件扫 SN 码即计已盘（同一 SN 重复提交会报错）；散料（米）按卷号录入实盘米数。未扫到的普件提交时按实盘 0 处理。"
          />
          <Space direction="vertical" style={{ width: '100%', maxWidth: 640 }} size="middle">
            <Input.Search
              ref={scanInputRef}
              placeholder="扫描设备 SN 码，回车提交"
              enterButton={<><ScanOutlined /> 扫码</>}
              size="large"
              value={scanValue}
              onChange={(e) => setScanValue(e.target.value)}
              onSearch={handleScan}
              onPressEnter={handleScan}
              autoFocus
            />
            {scanMsg && <Alert type={scanMsg.type} message={scanMsg.text} showIcon />}
          </Space>

          <Divider orientation="left">盘点范围清单（{items.length} 行）</Divider>
          <Table
            rowKey="id"
            size="small"
            columns={countingColumns}
            dataSource={items}
            pagination={false}
            scroll={{ x: 1000 }}
            locale={{ emptyText: <Empty description="快照明细为空（范围无账面）" /> }}
          />
        </Card>
      )}

      {status === 'pending_review' && (
        <Card
          title={
            <Space>
              <AuditOutlined />
              <span>差异审核（待审核）</span>
            </Space>
          }
        >
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            message={`共 ${diffRows.length} 行差异；差异率 > ${(DIFF_REASON_RATE_THRESHOLD * 100).toFixed(0)}% 的行差异原因必填`}
          />
          <Table
            rowKey="id"
            size="small"
            columns={reviewColumns}
            dataSource={items}
            pagination={false}
            scroll={{ x: 1100 }}
            locale={{ emptyText: <Empty description="无盘点明细" /> }}
          />
          {can('stocktake:post') && (
            <>
              <Divider />
              <Space direction="vertical" style={{ width: '100%' }}>
                <Input.TextArea
                  rows={2}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="审核备注（选填）"
                  maxLength={500}
                />
                <Space>
                  <Button type="primary" icon={<CheckCircleOutlined />} onClick={handleReviewPass}>
                    审核通过（生成调整单并回写单号）
                  </Button>
                  <Button danger icon={<CloseCircleOutlined />} onClick={() => setRejectVisible(true)}>
                    审核驳回（回盘点中）
                  </Button>
                </Space>
              </Space>
            </>
          )}
        </Card>
      )}

      {status === 'completed' && (
        <>
          <Card
            title={
              <Space>
                <CheckCircleOutlined style={{ color: 'var(--green)' }} />
                <span>盘点已完成 · 调整单</span>
              </Space>
            }
            style={{ marginBottom: 16 }}
          >
            {meta?.adjustment_number ? (
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  调整单号：
                  <Text strong copyable>
                    {meta.adjustment_number}
                  </Text>
                </div>
                <AdjustmentList orderId={orderId} />
              </Space>
            ) : (
              <Text type="secondary">无差异，未生成调整单</Text>
            )}
            {meta?.review_notes && (
              <div style={{ marginTop: 8 }}>
                审核备注：<Text type="secondary">{meta.review_notes}</Text>（{meta.reviewed_at}）
              </div>
            )}
          </Card>
          <Card title="差异明细（留档）">
            <Table
              rowKey="id"
              size="small"
              columns={reviewColumns}
              dataSource={items}
              pagination={false}
              scroll={{ x: 1100 }}
              locale={{ emptyText: <Empty description="无盘点明细" /> }}
            />
          </Card>
        </>
      )}

      {/* 底部固定操作栏 */}
      {status === 'counting' && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 'var(--sidebar-w)',
            right: 0,
            padding: '12px 24px',
            background: 'var(--surface)',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 50,
          }}
        >
          <Space size="large">
            <Statistic title="已盘行" value={countedRows.length} valueStyle={{ fontSize: 18 }} />
            <Statistic title="未盘行" value={pendingRows.length} valueStyle={{ fontSize: 18 }} />
            <Text type="secondary">
              {blindFlag ? '盲盘：账面数不显示' : `账面合计 ${items.reduce((s, i) => s + Number(i.book_qty), 0).toFixed(4)}`}
            </Text>
          </Space>
          <Space>
            {can('stocktake:write') && (
              <Tooltip title={bothSigned ? '提交后由服务层比对生成差异' : '双签未齐全，不能提交审核'}>
                <Button
                  type="primary"
                  icon={<CheckSquareOutlined />}
                  disabled={!bothSigned}
                  onClick={() =>
                    Modal.confirm({
                      title: '确认提交实盘结果？',
                      content: '普件未扫到的行将按实盘 0（盘亏）处理；散料未录的卷视为与账面一致。提交后进入差异审核。',
                      onOk: handleSubmit,
                    })
                  }
                >
                  提交实盘（进入待审核）
                </Button>
              </Tooltip>
            )}
          </Space>
        </div>
      )}

      {/* 驳回弹窗 */}
      <Modal
        title="审核驳回"
        open={rejectVisible}
        onCancel={() => {
          setRejectVisible(false);
          setRejectNotes('');
        }}
        onOk={handleReviewReject}
        okText="确认驳回"
        okButtonProps={{ danger: true }}
      >
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message="驳回后盘点单回到「盘点中」，保留实盘数据，差异原因清空待修正。"
        />
        <Input.TextArea
          rows={3}
          value={rejectNotes}
          onChange={(e) => setRejectNotes(e.target.value)}
          placeholder="驳回备注（必填）"
          maxLength={500}
          showCount
        />
      </Modal>
    </div>
  );
};

/** 调整单列表（已完成视图）：盘盈→其他入库 / 盘亏→其他出库 */
const AdjustmentList: React.FC<{ orderId: number }> = ({ orderId }) => {
  const rows = useMemo(() => {
    const all: StocktakeAdjustmentOrder[] = [
      ...stocktakeEnhance.getAdjustmentOrdersByType('SURPLUS_IN'),
      ...stocktakeEnhance.getAdjustmentOrdersByType('DEFICIT_OUT'),
    ];
    return all.filter((a) => a.stocktake_order_id === orderId);
  }, [orderId]);

  if (rows.length === 0) return null;

  return (
    <Row gutter={12}>
      {rows.map((adj) => (
        <Col key={adj.id} xs={24} md={12}>
          <Card size="small" title={
            <Space>
              {adj.type === 'SURPLUS_IN' ? (
                <Tag icon={<ImportOutlined />} color="success">盘盈 · 其他入库单 SURPLUS_IN</Tag>
              ) : (
                <Tag icon={<ExportOutlined />} color="error">盘亏 · 其他出库单 DEFICIT_OUT</Tag>
              )}
              <Text strong>{adj.order_number}</Text>
            </Space>
          }>
            {adj.items.map((it, idx) => (
              <div key={idx} style={{ fontSize: 12 }}>
                {it.sn_or_batch} · {it.product_name} · {it.qty} {it.unit}
                {it.reason ? ` · ${it.reason}` : ''}
              </div>
            ))}
          </Card>
        </Col>
      ))}
    </Row>
  );
};

export default StocktakeCountPage;

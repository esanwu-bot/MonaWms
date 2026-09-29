import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader';
import {
  Card,
  Button,
  Space,
  Tag,
  Input,
  Table,
  Tabs,
  Modal,
  Form,
  Select,
  InputNumber,
  Row,
  Col,
  Statistic,
  Typography,
  message,
  Alert,
  Empty,
  Badge,
  Tooltip,
  Divider,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ArrowLeftOutlined,
  ScanOutlined,
  CheckSquareOutlined,
  AuditOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  ContainerOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  stocktakeService,
  type StocktakeOrder,
  type StocktakeItem,
  type StocktakeRowType,
  type ScanSnResult,
  type ReviewStocktakeResult,
  getStocktakeStatusText,
} from '../services/stocktakeService';
import { productService } from '../services/productService';
import { usePermission } from '../hooks/usePermission';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Search } = Input;
const { Option } = Select;
const { TextArea } = Input;

const STATUS_COLORS: Record<string, string> = {
  draft: 'default',
  counting: 'processing',
  pending_review: 'warning',
  completed: 'success',
  cancelled: 'error',
};

const DIFF_REASONS = [
  { value: '录入错误', label: '录入错误' },
  { value: '遗失', label: '遗失' },
  { value: '损坏', label: '损坏' },
  { value: '自然损耗', label: '自然损耗' },
  { value: '借出未还', label: '借出未还' },
  { value: '其他', label: '其他' },
];

const StocktakeExecutePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isReviewMode = searchParams.get('review') === '1';
  const queryClient = useQueryClient();
  const { can } = usePermission();

  const orderId = Number(id);
  const scanInputRef = useRef<any>(null);

  const [scanValue, setScanValue] = useState('');
  const [scanResult, setScanResult] = useState<ScanSnResult | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [unknownSn, setUnknownSn] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<number | undefined>(undefined);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reasons, setReasons] = useState<Record<number, string>>({});
  const [reviewResult, setReviewResult] = useState<ReviewStocktakeResult | null>(null);

  // 盘点单详情
  const {
    data: orderData,
    isLoading: orderLoading,
    refetch: refetchOrder,
  } = useQuery({
    queryKey: ['stocktakes', 'detail', orderId],
    queryFn: async () => {
      const res = await stocktakeService.getStocktake(orderId);
      return res.data.data;
    },
    enabled: !!orderId,
  });

  // 盘点明细
  const {
    data: itemsData,
    isLoading: itemsLoading,
    refetch: refetchItems,
  } = useQuery({
    queryKey: ['stocktakes', 'items', orderId],
    queryFn: async () => {
      const res = await stocktakeService.getItems(orderId, { limit: 1000 });
      return res.data.data;
    },
    enabled: !!orderId,
  });

  // 差异明细（审核用）
  const { data: diffItemsData, refetch: refetchDiffItems } = useQuery({
    queryKey: ['stocktakes', 'diffItems', orderId],
    queryFn: async () => {
      const res = await stocktakeService.getItems(orderId, { diff_only: 1, limit: 1000 });
      return res.data.data;
    },
    enabled: !!orderId && isReviewMode,
  });

  // 产品选项（陌生SN盘盈用 + 审核页展示）
  const { data: productsData } = useQuery({
    queryKey: ['products', 'all'],
    queryFn: async () => {
      const res = await productService.getProducts({ page: 1, pageSize: 1000 });
      return res.list;
    },
  });

  const order = orderData;
  const items = itemsData?.list || [];
  const summary = order?.summary || itemsData?.summary;
  const diffItems = diffItemsData?.list || [];

  const pieceItems = useMemo(() => items.filter((i) => i.is_piece === 1), [items]);
  const bulkItems = useMemo(() => items.filter((i) => i.is_piece === 0), [items]);
  const scannedItems = useMemo(() => pieceItems.filter((i) => i.status === 'counted'), [pieceItems]);
  const pendingSnItems = useMemo(() => pieceItems.filter((i) => i.status === 'pending'), [pieceItems]);

  // 扫码
  const scanMutation = useMutation({
    mutationFn: async (sn: string) => {
      const res = await stocktakeService.scanSn(orderId, sn, selectedProductId);
      return res.data.data;
    },
    onSuccess: (data) => {
      setScanResult(data);
      setLastError(null);
      setScanValue('');
      setUnknownSn(null);
      setSelectedProductId(undefined);
      queryClient.invalidateQueries({ queryKey: ['stocktakes', 'items', orderId] });
      queryClient.invalidateQueries({ queryKey: ['stocktakes', 'diffItems', orderId] });
      queryClient.invalidateQueries({ queryKey: ['stocktakes', 'detail', orderId] });
      if (data.result === 'matched') {
        message.success(data.message);
      } else if (data.result === 'duplicate') {
        message.warning(data.message);
      } else if (data.result === 'surplus') {
        message.success(data.message);
      }
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || error?.message || '扫码失败';
      const code = error?.response?.data?.code;
      setLastError(msg);
      setScanResult(null);
      if (code === 'SN_UNKNOWN') {
        setUnknownSn(scanValue);
      } else {
        setScanValue('');
      }
    },
  });

  const handleScan = () => {
    const sn = scanValue.trim();
    if (!sn) return;
    if (order?.status !== 'counting') {
      message.warning('盘点单不在盘点中状态，无法扫码');
      return;
    }
    scanMutation.mutate(sn);
  };

  // 录盘
  const recordMutation = useMutation({
    mutationFn: async ({ itemId, qty, reason }: { itemId: number; qty: string; reason?: string }) => {
      const res = await stocktakeService.recordCounted(orderId, itemId, qty, reason);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stocktakes', 'items', orderId] });
      queryClient.invalidateQueries({ queryKey: ['stocktakes', 'diffItems', orderId] });
      queryClient.invalidateQueries({ queryKey: ['stocktakes', 'detail', orderId] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || error?.message || '录盘失败');
    },
  });

  const handleRecord = (item: StocktakeItem, value: string | number | null) => {
    if (value === null || value === undefined || value === '') return;
    recordMutation.mutate({ itemId: item.id, qty: String(value), reason: reasons[item.id] });
  };

  // 提交
  const submitMutation = useMutation({
    mutationFn: () => stocktakeService.submitStocktake(orderId),
    onSuccess: () => {
      message.success('盘点结果已提交，待差异审核');
      queryClient.invalidateQueries({ queryKey: ['stocktakes'] });
      refetchOrder();
      refetchItems();
      refetchDiffItems();
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || error?.message || '提交失败');
    },
  });

  // 审核
  const reviewMutation = useMutation({
    mutationFn: () => stocktakeService.reviewStocktake(orderId, reviewNotes, reasons),
    onSuccess: (data) => {
      message.success(`审核通过，调整单号 ${data.data.data.adjustment_number}`);
      setReviewResult(data.data.data);
      queryClient.invalidateQueries({ queryKey: ['stocktakes'] });
      refetchOrder();
      refetchItems();
      refetchDiffItems();
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || error?.message || '审核失败');
    },
  });

  useEffect(() => {
    if (scanInputRef.current && order?.status === 'counting') {
      scanInputRef.current.focus();
    }
  }, [order?.status]);

  // 自动聚焦扫码框（非审核模式）
  useEffect(() => {
    if (!isReviewMode && scanInputRef.current) {
      const timer = setTimeout(() => scanInputRef.current?.focus(), 200);
      return () => clearTimeout(timer);
    }
  }, [isReviewMode]);

  const getRowTypeText = (rowType: StocktakeRowType) => {
    switch (rowType) {
      case 'sn':
        return 'SN行';
      case 'piece_remainder':
        return '普件余数行';
      case 'batch':
        return '批次行';
      default:
        return rowType;
    }
  };

  // 普件盲盘已扫列表
  const scannedColumns: ColumnsType<StocktakeItem> = [
    {
      title: 'SN码',
      dataIndex: 'serial_number',
      key: 'serial_number',
      render: (text, record) => (
        <Space>
          <Text code copyable={{ text }}>
            {text}
          </Text>
          {record.is_surplus === 1 && <Tag color="success">盘盈</Tag>}
        </Space>
      ),
    },
    {
      title: '产品',
      key: 'product',
      render: (_, record) => (
        <div>
          <div>{record.product_name}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            SKU: {record.product_sku}
          </Text>
        </div>
      ),
    },
    {
      title: '库位',
      dataIndex: 'location_code',
      key: 'location_code',
      render: (text) => text || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) =>
        status === 'counted' ? (
          <Tag color="success" icon={<CheckCircleOutlined />}>
            已盘
          </Tag>
        ) : (
          <Tag color="default">未盘</Tag>
        ),
    },
    {
      title: '盘点时间',
      dataIndex: 'counted_at',
      key: 'counted_at',
      render: (text) => text || '-',
    },
  ];

  // 散料明盘表格
  const bulkColumns: ColumnsType<StocktakeItem> = [
    {
      title: '产品',
      key: 'product',
      render: (_, record) => (
        <div>
          <div>{record.product_name}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            SKU: {record.product_sku}
          </Text>
        </div>
      ),
    },
    {
      title: '类型',
      dataIndex: 'row_type',
      key: 'row_type',
      width: 100,
      render: (t) => getRowTypeText(t),
    },
    {
      title: '批次/卷号',
      dataIndex: 'batch_no',
      key: 'batch_no',
      width: 150,
      render: (text) => text || <Text type="secondary">无批次余数</Text>,
    },
    {
      title: '库位',
      dataIndex: 'location_code',
      key: 'location_code',
      width: 120,
      render: (text) => text || '-',
    },
    {
      title: '账面数量',
      dataIndex: 'snapshot_qty',
      key: 'snapshot_qty',
      width: 120,
      align: 'right',
      render: (text, record) => `${text} ${record.unit}`,
    },
    {
      title: '实盘数量',
      key: 'counted_qty',
      width: 160,
      align: 'right',
      render: (_, record) => {
        const isCount = record.measure_type === 'count';
        const disabled = isReviewMode || order?.status !== 'counting';
        return (
          <InputNumber
            style={{ width: 130 }}
            min={0}
            step={isCount ? 1 : 0.0001}
            precision={isCount ? 0 : 4}
            defaultValue={record.counted_qty === null ? undefined : Number(record.counted_qty)}
            value={record.counted_qty === null ? undefined : Number(record.counted_qty)}
            onBlur={(e) => handleRecord(record, e.target.value)}
            onPressEnter={(e: any) => handleRecord(record, e.target.value)}
            disabled={disabled}
            addonAfter={record.unit}
          />
        );
      },
    },
    {
      title: '差异',
      dataIndex: 'diff_qty',
      key: 'diff_qty',
      width: 120,
      align: 'right',
      render: (text) => {
        const num = Number(text);
        return (
          <Text type={num > 0 ? 'success' : num < 0 ? 'danger' : 'secondary'} strong>
            {num > 0 ? '+' : ''}
            {text}
          </Text>
        );
      },
    },
    {
      title: '原因',
      key: 'reason',
      width: 160,
      render: (_, record) => {
        if (isReviewMode || order?.status !== 'counting') {
          return record.reason || '-';
        }
        return (
          <Select
            placeholder="差异原因"
            style={{ width: 140 }}
            value={reasons[record.id] || record.reason || undefined}
            onChange={(value) => setReasons((prev) => ({ ...prev, [record.id]: value }))}
            allowClear
          >
            {DIFF_REASONS.map((r) => (
              <Option key={r.value} value={r.value}>
                {r.label}
              </Option>
            ))}
          </Select>
        );
      },
    },
  ];

  // 差异审核表格（审核模式专用）
  const diffColumns: ColumnsType<StocktakeItem> = [
    {
      title: '产品',
      key: 'product',
      render: (_, record) => (
        <div>
          <div>{record.product_name}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            SKU: {record.product_sku}
          </Text>
        </div>
      ),
    },
    {
      title: '类型',
      dataIndex: 'row_type',
      key: 'row_type',
      width: 100,
      render: (t) => getRowTypeText(t),
    },
    {
      title: 'SN/批次',
      key: 'sn_batch',
      width: 180,
      render: (_, record) => (
        <Text code>{record.serial_number || record.batch_no || '-'}</Text>
      ),
    },
    {
      title: '账面',
      dataIndex: 'snapshot_qty',
      key: 'snapshot_qty',
      width: 100,
      align: 'right',
      render: (text, record) => `${text} ${record.unit}`,
    },
    {
      title: '实盘',
      dataIndex: 'counted_qty',
      key: 'counted_qty',
      width: 100,
      align: 'right',
      render: (text, record) => `${text ?? '-'} ${record.unit}`,
    },
    {
      title: '差异',
      dataIndex: 'diff_qty',
      key: 'diff_qty',
      width: 100,
      align: 'right',
      render: (text) => {
        const num = Number(text);
        return (
          <Text type={num > 0 ? 'success' : 'danger'} strong>
            {num > 0 ? '+' : ''}
            {text}
          </Text>
        );
      },
    },
    {
      title: '差异原因',
      key: 'reason',
      width: 180,
      render: (_, record) => (
        <Select
          placeholder="请选择差异原因"
          style={{ width: 160 }}
          value={reasons[record.id] || record.reason || undefined}
          onChange={(value) => setReasons((prev) => ({ ...prev, [record.id]: value }))}
          allowClear
          disabled={order?.status !== 'pending_review'}
        >
          {DIFF_REASONS.map((r) => (
            <Option key={r.value} value={r.value}>
              {r.label}
            </Option>
          ))}
        </Select>
      ),
    },
  ];

  if (!orderId) {
    return <Alert message="盘点单ID无效" type="error" />;
  }

  const isCounting = order?.status === 'counting';
  const isPendingReview = order?.status === 'pending_review';
  const isCompleted = order?.status === 'completed';
  const canWrite = can('stocktake:write');
  const canPost = can('stocktake:post');

  return (
    <div style={{ paddingBottom: 80 }}>
      <PageHeader
        title={isReviewMode ? '盘点差异审核' : '盘点执行'}
        sub={
          order
            ? `${order.order_number} · ${order.warehouse_name} · ${getStocktakeStatusText(order.status)}`
            : '盘点执行'
        }
        extra={
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/stocktakes')}>
            返回列表
          </Button>
        }
      />

      {/* 盘点单信息 */}
      {order && (
        <Card style={{ marginBottom: 16 }} loading={orderLoading}>
          <Row gutter={16} align="middle">
            <Col xs={24} lg={12}>
              <Space size="large">
                <Text strong style={{ fontSize: 16 }}>
                  {order.order_number}
                </Text>
                <Tag color={STATUS_COLORS[order.status]}>{getStocktakeStatusText(order.status)}</Tag>
                <Text type="secondary">仓库：{order.warehouse_name || '-'}</Text>
                <Text type="secondary">负责人：{order.keeper_name || '-'}</Text>
              </Space>
            </Col>
            <Col xs={24} lg={12}>
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic title="总行数" value={summary?.total_rows || 0} />
                </Col>
                <Col span={6}>
                  <Statistic title="已盘" value={summary?.counted_rows || 0} />
                </Col>
                <Col span={6}>
                  <Statistic title="未盘" value={summary?.pending_rows || 0} />
                </Col>
                <Col span={6}>
                  <Statistic title="差异行" value={summary?.diff_rows || 0} />
                </Col>
              </Row>
            </Col>
          </Row>
        </Card>
      )}

      {isReviewMode ? (
        // 审核视图
        <Card
          title={
            <Space>
              <AuditOutlined />
              <span>差异明细与审核</span>
              {order?.adjustment_number && (
                <Tag color="success">调整单号：{order.adjustment_number}</Tag>
              )}
            </Space>
          }
          loading={itemsLoading}
        >
          {isCompleted ? (
            <Alert
              type="success"
              message="盘点已完成"
              description={`已生成调整单 ${order?.adjustment_number || '-'}，库存、SN台账、批次台账已同步。`}
              showIcon
              style={{ marginBottom: 16 }}
            />
          ) : (
            <Alert
              type="warning"
              message="审核说明"
              description="请逐条核对差异原因，确认后点击「审核过账」生成盘盈/盘亏调整单，系统将自动更新库存总账、SN台账和批次台账。"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          {reviewResult && (
            <Alert
              type="success"
              message="审核通过"
              description={
                <Space direction="vertical">
                  <Text>调整单号：{reviewResult.adjustment_number}</Text>
                  <Text>
                    调整组数 {reviewResult.adjusted_groups} · SN盘亏 {reviewResult.sn_lost} · SN盘盈{' '}
                    {reviewResult.sn_gain} · 批次调整 {reviewResult.batch_touched}
                  </Text>
                </Space>
              }
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          <Table
            columns={diffColumns}
            dataSource={diffItems}
            rowKey="id"
            pagination={false}
            scroll={{ x: 900 }}
            locale={{ emptyText: <Empty description="无差异行" /> }}
            summary={() =>
              diffItems.length ? (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={3}>
                    <Text strong>合计</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={3} align="right">
                    <Text strong>{summary?.snapshot_qty || '0'}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={4} align="right">
                    <Text strong>{summary?.counted_qty || '0'}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={5} align="right">
                    <Text strong type={Number(summary?.diff_qty || 0) >= 0 ? 'success' : 'danger'}>
                      {summary?.diff_qty || '0'}
                    </Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={6} />
                </Table.Summary.Row>
              ) : null
            }
          />

          {isPendingReview && (
            <>
              <Divider />
              <Form layout="vertical">
                <Form.Item label="审核备注">
                  <TextArea
                    rows={3}
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="可选：填写审核说明"
                    maxLength={500}
                    showCount
                  />
                </Form.Item>
              </Form>
            </>
          )}
        </Card>
      ) : (
        // 执行视图
        <Card loading={itemsLoading}>
          <Tabs defaultActiveKey="piece">
            <TabPane
              tab={
                <span>
                  <ScanOutlined />
                  普件盲盘（SN）
                  <Badge
                    count={pendingSnItems.length}
                    style={{ marginLeft: 8, backgroundColor: 'var(--amber)' }}
                    overflowCount={999}
                  />
                </span>
              }
              key="piece"
            >
              <Alert
                type="info"
                message="盲盘模式"
                description="不显示系统账面数量，扫描在库SN即视为已盘；未扫到的SN提交后将自动记为盘亏；扫描陌生SN可选择商品后登记为盘盈。"
                showIcon
                style={{ marginBottom: 16 }}
              />

              <Space direction="vertical" style={{ width: '100%' }}>
                <Search
                  ref={scanInputRef}
                  placeholder="请扫描设备SN码，按回车提交"
                  enterButton={<><ScanOutlined /> 扫码</>}
                  size="large"
                  value={scanValue}
                  onChange={(e) => setScanValue(e.target.value)}
                  onSearch={handleScan}
                  onPressEnter={handleScan}
                  loading={scanMutation.isPending}
                  disabled={!isCounting || !canWrite}
                  style={{ maxWidth: 600 }}
                />

                {scanResult?.result === 'matched' && (
                  <Alert type="success" message={scanResult.message} showIcon />
                )}
                {scanResult?.result === 'duplicate' && (
                  <Alert type="warning" message={scanResult.message} showIcon />
                )}
                {scanResult?.result === 'surplus' && (
                  <Alert type="success" message={scanResult.message} description="已登记为盘盈行" showIcon />
                )}
                {lastError && <Alert type="error" message={lastError} showIcon />}
              </Space>

              <Divider orientation="left">已扫SN记录 ({scannedItems.length})</Divider>
              <Table
                columns={scannedColumns}
                dataSource={scannedItems}
                rowKey="id"
                pagination={false}
                scroll={{ x: 800 }}
                locale={{ emptyText: <Empty description="暂无已扫SN，请扫码" /> }}
              />
            </TabPane>

            <TabPane
              tab={
                <span>
                  <ContainerOutlined />
                  散料明盘（批次/余量）
                </span>
              }
              key="bulk"
            >
              <Alert
                type="info"
                message="明盘模式"
                description="显示系统账面数量，录入实际清点数量后自动计算差异；未录的散料行提交时将视为与账面一致。"
                showIcon
                style={{ marginBottom: 16 }}
              />
              <Table
                columns={bulkColumns}
                dataSource={bulkItems}
                rowKey="id"
                pagination={false}
                scroll={{ x: 1000 }}
                locale={{ emptyText: <Empty description="无散料盘点项" /> }}
              />
            </TabPane>
          </Tabs>
        </Card>
      )}

      {/* 陌生SN盘盈弹窗 */}
      <Modal
        title="盘盈登记：选择归属商品"
        open={!!unknownSn}
        onCancel={() => {
          setUnknownSn(null);
          setSelectedProductId(undefined);
          setScanValue('');
        }}
        onOk={() => {
          if (!selectedProductId) {
            message.warning('请选择商品');
            return;
          }
          scanMutation.mutate(unknownSn!);
        }}
        confirmLoading={scanMutation.isPending}
      >
        <Alert
          type="info"
          message={`陌生SN：${unknownSn || ''}`}
          description="该SN不在系统台账中，请选择其归属商品后继续扫码。"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Select
          placeholder="请选择商品"
          style={{ width: '100%' }}
          showSearch
          optionFilterProp="label"
          value={selectedProductId}
          onChange={(v) => setSelectedProductId(v)}
          options={Array.isArray(productsData)
            ? productsData.map((p: any) => ({ value: Number(p.id), label: `${p.name} (${p.sku})` }))
            : []}
        />
      </Modal>

      {/* 底部固定操作栏 */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 248,
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
          <Statistic title="已盘行" value={summary?.counted_rows || 0} />
          <Statistic title="未盘行" value={summary?.pending_rows || 0} />
          <Statistic title="差异行" value={summary?.diff_rows || 0} />
          <Text type="secondary">
            账面 {summary?.snapshot_qty || 0} / 实盘 {summary?.counted_qty || 0} / 差异{' '}
            {summary?.diff_qty || 0}
          </Text>
        </Space>
        <Space>
          {!isReviewMode && isCounting && canWrite && (
            <>
              <Button icon={<ReloadOutlined />} onClick={() => refetchItems()}>
                刷新
              </Button>
              <Button icon={<ThunderboltOutlined />} onClick={() => setScanValue('')}>
                清空扫码
              </Button>
              <Button
                type="primary"
                icon={<CheckSquareOutlined />}
                onClick={() =>
                  Modal.confirm({
                    title: '确认提交盘点结果？',
                    content: '普件未扫SN将记为盘亏，散料未录行将视为与账面一致。',
                    onOk: () => submitMutation.mutate(),
                  })
                }
                loading={submitMutation.isPending}
              >
                提交盘点结果
              </Button>
            </>
          )}
          {isReviewMode && isPendingReview && canPost && (
            <Button
              type="primary"
              icon={<AuditOutlined />}
              onClick={() =>
                Modal.confirm({
                  title: '确认差异审核过账？',
                  content: '审核后将自动生成盘盈/盘亏调整单并更新库存台账，不可撤销。',
                  onOk: () => reviewMutation.mutate(),
                })
              }
              loading={reviewMutation.isPending}
            >
              审核过账
            </Button>
          )}
          {(isCounting || isPendingReview) && canWrite && (
            <Button icon={<CloseCircleOutlined />} danger onClick={() => navigate('/stocktakes')}>
              返回
            </Button>
          )}
        </Space>
      </div>
    </div>
  );
};

export default StocktakeExecutePage;

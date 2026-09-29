import React, { useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import {
  Card,
  Form,
  Input,
  Button,
  Typography,
  Alert,
  Spin,
  Divider,
  Space,
  Row,
  Col,
  InputNumber,
  Table,
  Select,
  Tag,
  Modal,
  Steps,
  Descriptions,
  Badge,
  FloatButton,
  DatePicker,
  message
} from 'antd';
import dayjs from 'dayjs';
import { getDictionaryItemsByTypeCode } from '../services/dictionaryService';
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  CheckOutlined,
  FilterOutlined,
  FileTextOutlined,
  HomeOutlined,
  ShoppingOutlined,
  CalendarOutlined,
  ReloadOutlined,
  CloseOutlined,
  PlayCircleOutlined,
  StopOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { queryKeys } from '../utils/queryClient';
import { api } from '../services/api';
import { userService, type UserOption } from '../services/userService';
import type {
  InboundOrder,
  Product,
  Supplier,
  CreateInboundOrderRequest,
  UpdateInboundOrderRequest,
  InboundOrderQueryParams,
} from '../types/api';
import BatchImportDialog from '../components/BatchImportDialog';

const { Title, Text } = Typography;
const { Option } = Select;
const { Step } = Steps;

// P8 I1：入库来源（字典 inbound_source，后端可维护，这里做兜底）
const INBOUND_SOURCE_FALLBACK = [
  { code: 'purchase', name: '采购入库' },
  { code: 'transfer_in', name: '调拨入库' },
  { code: 'return_in', name: '归还入库' },
  { code: 'project_return', name: '项目退回' },
  { code: 'borrow_return', name: '借用归还' },
  { code: 'inventory_gain', name: '盘盈' },
  { code: 'other', name: '其他' },
];

// 入库来源 -> 单据类型（后端 type 为必填枚举）
const SOURCE_TO_TYPE: Record<string, string> = {
  purchase: 'purchase',
  transfer_in: 'transfer',
  return_in: 'return',
  project_return: 'return',
  borrow_return: 'return',
  inventory_gain: 'other',
  other: 'other',
};

// 来源编码 -> 中文（P8 I3）
const getSourceText = (code?: string) => {
  if (!code) return '-';
  const hit = INBOUND_SOURCE_FALLBACK.find((s) => s.code === code);
  return hit ? hit.name : code;
};

// 入库单项验证
const inboundOrderItemSchema = z.object({
  productId: z.string().min(1, '请选择产品'),
  // A4：数量允许小数（长度/重量类 4 位小数）；计件类在提交前按物资计量方式校验为正整数
  quantity: z.number().positive('数量必须大于0'),
  unitPrice: z.number().min(0, '单价不能小于0'),
  batchNumber: z.string().optional(),
  expiryDate: z.string().optional(),
  location: z.string().optional(),
});

// 入库单验证
const inboundOrderSchema = z.object({
  orderNumber: z.string().min(1, '请输入订单号'),
  warehouseId: z.string().min(1, '请选择仓库'),
  source: z.string().default('purchase'),   // I2：来源
  supplierId: z.string().optional(),
  receivedAt: z.string().optional(),        // C1：入库时间
  notes: z.string().optional(),
  items: z.array(inboundOrderItemSchema).min(1, '至少添加一个商品'),
}).superRefine((data, ctx) => {
  // I4：来源为采购入库时供应商必填，其他来源可选
  if ((data.source || 'purchase') === 'purchase' && !data.supplierId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['supplierId'],
      message: '来源为采购入库时，供应商必填'
    });
  }
});

type InboundOrderFormData = z.infer<typeof inboundOrderSchema>;

interface InboundOrderDialogProps {
  open: boolean;
  order?: InboundOrder;
  onClose: () => void;
  onSubmit: (data: InboundOrderFormData) => void;
  loading?: boolean;
}

const InboundOrderDialog: React.FC<InboundOrderDialogProps> = ({
  open,
  order,
  onClose,
  onSubmit,
  loading = false,
}) => {

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<InboundOrderFormData>({
    resolver: zodResolver(inboundOrderSchema),
    defaultValues: {
      orderNumber: order?.orderNumber || '',
      warehouseId: order?.warehouseId || '',
      source: (order as any)?.source || 'purchase',        // I2
      receivedAt: (order as any)?.receivedAt || '',         // C1
      supplierId: order?.supplierId || '',
      notes: order?.notes || '',
      items: order?.items || [{
        productId: '',
        quantity: 1,
        unitPrice: 0,
        batchNumber: '',
        expiryDate: '',
        location: '',
      }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  // 获取仓库列表
  const { data: warehousesData } = useQuery({
    queryKey: queryKeys.warehouses.all,
    queryFn: async () => {
      const response = await api.get('/warehouses');
      return response.data.data;
    },
  });

  // 获取供应商列表
  const { data: suppliersData } = useQuery({
    queryKey: queryKeys.suppliers.all,
    queryFn: async () => {
      const response = await api.get<Supplier[]>('/suppliers');
      return Array.isArray(response.data.data) ? response.data.data : [];
    },
  });

  // 获取产品列表
  const { data: productsData } = useQuery({
    queryKey: queryKeys.products.all,
    queryFn: async () => {
      const response = await api.get<Product[]>('/products');
      return response.data.data;
    },
  });

  // 获取入库来源字典（I1：字典可后台维护，失败时用内置兜底）
  const { data: sourceDictData } = useQuery({
    queryKey: ['dictionary', 'items', 'inbound_source'],
    queryFn: async () => {
      const response = await getDictionaryItemsByTypeCode('inbound_source');
      return Array.isArray(response?.data) ? response.data : [];
    },
    retry: false,
  });
  const sourceOptions = Array.isArray(sourceDictData) && sourceDictData.length > 0
    ? sourceDictData.filter((item: any) => item.status !== 'inactive')
    : INBOUND_SOURCE_FALLBACK;

  // 监听来源与明细，用于条件必填与按计量方式控制数量精度
  const watchSource = watch('source');
  const watchItems = watch('items');
  const isPurchaseSource = (watchSource || 'purchase') === 'purchase';

  const productMap = React.useMemo(() => {
    const map: Record<string, Product> = {};
    if (Array.isArray(productsData)) {
      (productsData as Product[]).forEach((p) => { map[String(p.id)] = p; });
    }
    return map;
  }, [productsData]);

  // A4：计件类数量必须为正整数，长度/重量类允许 4 位小数
  const quantityMetaOf = (index: number) => {
    const pid = String(watchItems?.[index]?.productId || '');
    const product = productMap[pid];
    const isCount = (product?.measure_type || 'count') === 'count';
    return {
      isCount,
      unit: product?.unit || '件',
      precision: isCount ? 0 : 4,
      step: isCount ? 1 : 0.0001,
    };
  };

  React.useEffect(() => {
    if (open) {
      reset({
        orderNumber: order?.orderNumber || '',
        warehouseId: order?.warehouseId || '',
        source: (order as any)?.source || 'purchase',        // I2
        receivedAt: (order as any)?.receivedAt || '',         // C1
        supplierId: order?.supplierId || '',
        notes: order?.notes || '',
        items: order?.items || [{
          productId: '',
          quantity: 1,
          unitPrice: 0,
          batchNumber: '',
          expiryDate: '',
          location: '',
        }],
      });
    }
  }, [open, order, reset]);

  const handleFormSubmit = (data: InboundOrderFormData) => {
    // A4：计件类物资数量必须为正整数（后端同样校验，这里做即时反馈）
    for (let i = 0; i < data.items.length; i++) {
      const meta = quantityMetaOf(i);
      const qty = data.items[i].quantity;
      if (meta.isCount && !Number.isInteger(qty)) {
        message.error(`第 ${i + 1} 行：按「${meta.unit}」计件，数量必须为正整数`);
        return;
      }
      if (!meta.isCount && qty <= 0) {
        message.error(`第 ${i + 1} 行：数量必须大于 0`);
        return;
      }
    }
    onSubmit(data);
  };

  const addItem = () => {
    append({
      productId: '',
      quantity: 1,
      unitPrice: 0,
      batchNumber: '',
      expiryDate: '',
      location: '',
    });
  };

  const removeItem = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width="80%"
      title={
        <Space>
          <FileTextOutlined />
          {order ? '编辑入库单' : '新增入库单'}
        </Space>
      }
      footer={[
        <Button key="cancel" onClick={onClose} disabled={loading}>
          取消
        </Button>,
        <Button
          key="submit"
          type="primary"
          onClick={handleSubmit(handleFormSubmit)}
          loading={loading}
        >
          {loading ? '保存中...' : '保存'}
        </Button>,
      ]}
    >
      <Form layout="vertical" onFinish={handleSubmit(handleFormSubmit)}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="入库单号"
              validateStatus={errors.orderNumber ? 'error' : ''}
              help={errors.orderNumber?.message}
            >
              <Controller
                name="orderNumber"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="请输入入库单号"
                    disabled={loading || !!order}
                  />
                )}
              />
            </Form.Item>
          </Col>

        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="仓库"
              validateStatus={errors.warehouseId ? 'error' : ''}
              help={errors.warehouseId?.message}
            >
              <Controller
                name="warehouseId"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    placeholder="请选择仓库"
                    disabled={loading}
                  >
                    {Array.isArray(warehousesData) ? warehousesData.map((warehouse) => (
                      <Option key={warehouse.id} value={warehouse.id}>
                        <Space>
                          {warehouse.name}
                          <Tag>{warehouse.code}</Tag>
                        </Space>
                      </Option>
                    )) : []}
                  </Select>
                )}
              />
            </Form.Item>
          </Col>
        </Row>

        {/* I2 入库来源 + C1 入库时间 */}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="来源"
              validateStatus={errors.source ? 'error' : ''}
              help={errors.source?.message}
            >
              <Controller
                name="source"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    placeholder="请选择入库来源"
                    disabled={loading}
                  >
                    {sourceOptions.map((item: any) => (
                      <Option key={item.code} value={item.code}>{item.name}</Option>
                    ))}
                  </Select>
                )}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="入库时间"
              validateStatus={errors.receivedAt ? 'error' : ''}
              help={errors.receivedAt?.message}
            >
              <Controller
                name="receivedAt"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    showTime
                    style={{ width: '100%' }}
                    placeholder="业务发生时间（精确到时分秒）"
                    disabled={loading}
                    value={field.value ? dayjs(field.value) : null}
                    onChange={(v) => field.onChange(v ? v.format('YYYY-MM-DD HH:mm:ss') : '')}
                  />
                )}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="供应商"
              required={isPurchaseSource}
              validateStatus={errors.supplierId ? 'error' : ''}
              help={errors.supplierId?.message}
            >
              <Controller
                name="supplierId"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    placeholder="请选择供应商"
                    disabled={loading}
                  >
                    {Array.isArray(suppliersData) ? suppliersData.map((supplier) => (
                      <Option key={supplier.id} value={supplier.id}>
                        <Space>
                          {supplier.name}
                          <Tag>{supplier.code}</Tag>
                        </Space>
                      </Option>
                    )) : []}
                  </Select>
                )}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="备注">
          <Controller
            name="notes"
            control={control}
            render={({ field }) => (
              <Input.TextArea
                {...field}
                rows={2}
                placeholder="请输入备注"
                disabled={loading}
              />
            )}
          />
        </Form.Item>

        <Divider />

        <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
          <Title level={5} style={{ margin: 0 }}>产品明细</Title>
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={addItem}
            disabled={loading}
          >
            添加产品
          </Button>
        </Space>

        {fields.map((field, index) => (
          <Card key={field.id} style={{ marginBottom: 16 }}>
            <Row gutter={16} align="middle">
              <Col span={8}>
                <Form.Item
                  label="产品"
                  validateStatus={errors.items?.[index]?.productId ? 'error' : ''}
                  help={errors.items?.[index]?.productId?.message}
                >
                  <Controller
                    name={`items.${index}.productId`}
                    control={control}
                    render={({ field }) => (
                      <Select
                        {...field}
                        placeholder="请选择产品"
                        disabled={loading}
                      >
                        {Array.isArray(productsData) ? productsData.map((product) => (
                          <Option key={product.id} value={product.id}>
                            <div>
                              <div>{product.name}</div>
                              <Text type="secondary">SKU: {product.sku}</Text>
                            </div>
                          </Option>
                        )) : []}
                      </Select>
                    )}
                  />
                </Form.Item>
              </Col>
              <Col span={4}>
                <Form.Item
                  label="数量"
                  validateStatus={errors.items?.[index]?.quantity ? 'error' : ''}
                  help={errors.items?.[index]?.quantity?.message}
                >
                  <Controller
                    name={`items.${index}.quantity`}
                    control={control}
                    render={({ field }) => (
                      <InputNumber
                        {...field}
                        style={{ width: '100%' }}
                        min={0}
                        // A4：计件类 step=1 无小数，长度/重量类允许 4 位小数
                        step={quantityMetaOf(index).step}
                        precision={quantityMetaOf(index).precision}
                        addonAfter={quantityMetaOf(index).unit}
                        disabled={loading}
                      />
                    )}
                  />
                </Form.Item>
              </Col>

              <Col span={4}>
                <Form.Item
                  label="单价"
                  validateStatus={errors.items?.[index]?.unitPrice ? 'error' : ''}
                  help={errors.items?.[index]?.unitPrice?.message}
                >
                  <Controller
                    name={`items.${index}.unitPrice`}
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        type="number"
                        prefix="¥"
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        disabled={loading}
                      />
                    )}
                  />
                </Form.Item>
              </Col>
              <Col span={4}>
                <Form.Item label="备注">
                  <Controller
                    name={`items.${index}.batchNumber`}
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        placeholder="批次号"
                        disabled={loading}
                      />
                    )}
                  />
                </Form.Item>
              </Col>
              <Col span={1}>
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => removeItem(index)}
                  disabled={loading || fields.length === 1}
                />
              </Col>
            </Row>
          </Card>
        ))}

        {errors.items && (
          <Alert
            message={errors.items.message}
            type="error"
            showIcon
            style={{ marginTop: 16 }}
          />
        )}
      </Form>
    </Modal>
  );
};

interface InboundOrderDetailDialogProps {
  open: boolean;
  order?: InboundOrder;
  onClose: () => void;
  onApprove?: (orderId: string) => void;
  onReject?: (orderId: string) => void;
  onReceive?: (orderId: string) => void;
  loading?: boolean;
}

const InboundOrderDetailDialog: React.FC<InboundOrderDetailDialogProps> = ({
  open,
  order,
  onClose,
  onApprove,
  onReject,
  onReceive,
  loading = false,
}) => {
  if (!order) return null;

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'pending': return <Tag icon={<ClockCircleOutlined />} color="warning">待审核</Tag>;
      case 'approved': return <Tag icon={<CheckCircleOutlined />} color="processing">已审核</Tag>;
      case 'received': return <Tag icon={<CheckOutlined />} color="success">已收货</Tag>;
      case 'rejected': return <Tag icon={<CloseCircleOutlined />} color="error">已拒绝</Tag>;
      default: return <Tag>{status}</Tag>;
    }
  };

  const steps = [
    { title: '创建', status: 'finish' },
    { title: '审核', status: order.status_text === 'PENDING' ? 'wait' : 'finish' },
    { title: '收货', status: order.status_text === 'COMPLETED' ? 'finish' : 'wait' },
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width="80%"
      title={
        <Space>
          <FileTextOutlined />
          入库单详情
        </Space>
      }
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>,
        order.status_text === 'PENDING' && onApprove && onReject && (
          <>
            <Button
              key="reject"
              danger
              onClick={() => onReject(order.id)}
              loading={loading}
            >
              拒绝
            </Button>,
            <Button
              key="approve"
              type="primary"
              onClick={() => onApprove(order.id)}
              loading={loading}
            >
              审核通过
            </Button>
          </>
        ),
        order.status_text === 'IN_PROGRESS' && onReceive && (
          <Button
            key="receive"
            type="primary"
            onClick={() => onReceive(order.id)}
            loading={loading}
          >
            确认收货
          </Button>
        )
      ].filter(Boolean)}
    >
      <Card title="基本信息" style={{ marginBottom: 24 }}>
        <Descriptions column={2}>
          <Descriptions.Item label="入库单号">{order.orderNumber}</Descriptions.Item>
          <Descriptions.Item label="仓库">{order.warehouse?.name}</Descriptions.Item>
          <Descriptions.Item label="来源">{getSourceText(order.source)}</Descriptions.Item>
          <Descriptions.Item label="入库时间">
            {order.receivedAt ? new Date(order.receivedAt).toLocaleString() : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="供应商">{order.supplierId}</Descriptions.Item>
          {order.notes && (
            <Descriptions.Item label="备注" span={2}>
              {order.notes}
            </Descriptions.Item>
          )}
          <Descriptions.Item label="状态">
            {getStatusTag(order.status_text)}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="处理流程" style={{ marginBottom: 24 }}>
        <Steps current={order.status_text === 'PENDING' ? 0 : order.status_text === 'IN_PROGRESS' ? 1 : 2}>
          {steps.map((step, index) => (
            <Step key={index} title={step.title} status={step.status as any} />
          ))}
        </Steps>
      </Card>

      <Card title="产品明细">
        <Table
          size="small"
          dataSource={order.items}
          pagination={false}
          columns={[
            {
              title: '产品',
              dataIndex: ['product', 'name'],
              render: (text, record) => (
                <div>
                  <div>{text}</div>
                  <Text type="secondary">SKU: {record.product?.sku}</Text>
                </div>
              ),
            },
            {
              title: '数量',
              dataIndex: 'quantity',
              align: 'right',
              render: (text, record) => `${text} ${record.product?.unit || '件'}`,
            },
            {
              title: '单价',
              dataIndex: 'unitPrice',
              align: 'right',
              render: (text) => `¥${text.toFixed(2)}`,
            },
            {
              title: '金额',
              align: 'right',
              render: (_, record) => 
                `¥${(record.quantity * record.unitPrice).toFixed(2)}`,
            },
            {
              title: '批次号',
              dataIndex: 'batchNumber',
              render: (text) => text || '-',
            },
          ]}
        />
      </Card>
    </Modal>
  );
};

const InboundPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [archivedFilter, setArchivedFilter] = useState<'' | 'archived' | 'all'>('');
  const [operatorFilter, setOperatorFilter] = useState<number | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<InboundOrder | undefined>();
  const [batchImportOpen, setBatchImportOpen] = useState(false);

  const queryClient = useQueryClient();

  // 构建查询参数（与后端 snake_case 参数对齐：order_number/limit/warehouse_id/archived/operator_id）
  const queryParams: InboundOrderQueryParams = {
    page,
    limit: pageSize,
    order_number: search || undefined,
    status: statusFilter || undefined,
    warehouse_id: warehouseFilter || undefined,
    archived: archivedFilter || undefined,
    operator_id: operatorFilter,
  };

  // 获取入库单列表
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['inbound-orders', queryParams],
    queryFn: async () => {
      const response = await api.get<{
        list: InboundOrder[];
        pagination: {
          total: number;
          page: number;
          limit: number;
        };
      }>('/inbound-orders', { params: queryParams });
      return response.data.data;
    },
  });

  // 获取仓库列表
  const { data: warehousesData } = useQuery({
    queryKey: queryKeys.warehouses.all,
    queryFn: async () => {
        const response = await api.get('/warehouses');
        return response.data.data;
      },
  });

  // 获取负责人（经办人）选项：归档/负责人筛选下拉
  const { data: operatorOptions } = useQuery({
    queryKey: ['user-options'],
    queryFn: async () => {
      const response = await userService.getOptions();
      return response.data.data as UserOption[];
    },
  });

  // 创建入库单
  const createMutation = useMutation({
    mutationFn: async (data: CreateInboundOrderRequest) => {
      const response = await api.post<InboundOrder>('/inbound-orders', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbound-orders'] });
      setDialogOpen(false);
      setSelectedOrder(undefined);
      message.success('入库单创建成功');
    },
  });

  // 更新入库单
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateInboundOrderRequest }) => {
      const response = await api.put<InboundOrder>(`/inbound-orders/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbound-orders'] });
      setDialogOpen(false);
      setSelectedOrder(undefined);
      message.success('入库单更新成功');
    },
  });

  // 审核入库单
  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/inbound-orders/${id}/approve`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbound-orders'] });
      setDetailDialogOpen(false);
      message.success('入库单审核通过');
    },
  });

  // 拒绝入库单
  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/inbound-orders/${id}/reject`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbound-orders'] });
      setDetailDialogOpen(false);
      message.success('入库单已拒绝');
    },
  });

  // 确认收货
  const receiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/inbound-orders/${id}/receive`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbound-orders'] });
      setDetailDialogOpen(false);
      message.success('入库单收货成功');
    },
  });

  const handleCreate = () => {
    setSelectedOrder(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (order: InboundOrder) => {
    setSelectedOrder(order);
    setDialogOpen(true);
  };

  const handleView = (order: InboundOrder) => {
    setSelectedOrder(order);
    setDetailDialogOpen(true);
  };

  const handleSubmit = (data: InboundOrderFormData) => {
    // 后端接口字段为 snake_case（warehouse_id / supplier_id / items[].product_id ...）
    const payload: Record<string, any> = {
      warehouse_id: Number(data.warehouseId),
      supplier_id: data.supplierId ? Number(data.supplierId) : null,
      source: data.source || 'purchase',                 // I2
      received_at: data.receivedAt || null,              // C1
      type: SOURCE_TO_TYPE[data.source || 'purchase'] || 'purchase',
      expected_date: data.receivedAt
        ? String(data.receivedAt).slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      notes: data.notes || '',
      items: data.items.map((it) => ({
        product_id: Number(it.productId),
        quantity: it.quantity,
        unit_price: it.unitPrice ?? 0,
        batch_number: it.batchNumber || '',
        expiry_date: it.expiryDate || null,
        notes: '',
      })),
    };

    if (selectedOrder) {
      updateMutation.mutate({ id: selectedOrder.id, data: payload as any });
    } else {
      createMutation.mutate(payload as any);
    }
  };

  const handlePageChange = (newPage: number, newPageSize: number) => {
    setPage(newPage);
    setPageSize(newPageSize);
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('/api/inbound-orders/template');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = '入库单导入模板.xlsx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        message.success('模板下载成功');
      } else {
        message.error('模板下载失败');
      }
    } catch (error) {
      message.error('模板下载失败');
    }
  };

  const handleBatchImport = () => {
    setBatchImportOpen(true);
  };

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'pending': return <Tag icon={<ClockCircleOutlined />} color="warning">待审核</Tag>;
      case 'approved': return <Tag icon={<CheckCircleOutlined />} color="processing">已审核</Tag>;
      case 'received': return <Tag icon={<CheckOutlined />} color="success">已收货</Tag>;
      case 'rejected': return <Tag icon={<CloseCircleOutlined />} color="error">已拒绝</Tag>;
      default: return <Tag>{status}</Tag>;
    }
  };

  const orders = ordersData?.list || [];
  const total = ordersData?.pagination?.total || 0;

  return (
    <div>
      <PageHeader title="入库管理" sub="跟踪供应商到货、验收与上架全流程" />

      {/* 操作栏 */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 15]} align="middle">
          <Col xs={24} sm={12} md={8} lg={6}>
            <Input
              placeholder="搜索入库单号..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              prefix={<SearchOutlined />}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Select
              style={{ width: '100%' }}
              placeholder="状态"
              value={statusFilter}
              onChange={setStatusFilter}
              allowClear
            >
              <Option value="pending">待审核</Option>
              <Option value="approved">已审核</Option>
              <Option value="received">已收货</Option>
              <Option value="rejected">已拒绝</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Select
              style={{ width: '100%' }}
              placeholder="仓库"
              value={warehouseFilter}
              onChange={setWarehouseFilter}
              allowClear
            >
              {Array.isArray(warehousesData) ? warehousesData.map((warehouse) => (
                <Option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </Option>
              )) : []}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Select
              style={{ width: '100%' }}
              placeholder="归档状态"
              value={archivedFilter}
              onChange={(v) => setArchivedFilter((v as '' | 'archived' | 'all') ?? '')}
              allowClear
            >
              <Option value="">未归档</Option>
              <Option value="archived">已归档</Option>
              <Option value="all">全部</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Select
              style={{ width: '100%' }}
              placeholder="负责人"
              value={operatorFilter}
              onChange={(v) => setOperatorFilter(v ?? undefined)}
              allowClear
              showSearch
              optionFilterProp="children"
            >
              {(operatorOptions || []).map((user) => (
                <Option key={user.id} value={user.id}>
                  {user.real_name || user.username}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Button
              icon={<FilterOutlined />}
              onClick={() => {
                setSearch('');
                setStatusFilter('');
                setWarehouseFilter('');
                setArchivedFilter('');
                setOperatorFilter(undefined);
              }}
              block
            >
              重置
            </Button>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreate}
              block
            >
              新增入库单
            </Button>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Button
              icon={<FileTextOutlined />}
              onClick={handleDownloadTemplate}
              block
            >
              下载模板
            </Button>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Button
              type="default"
              icon={<ShoppingOutlined />}
              onClick={handleBatchImport}
              block
            >
              批量导入
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 入库单列表 */}
      <Card>
        <Table
          loading={isLoading}
          dataSource={orders}
          columns={[
            {
              title: '入库单号',
              dataIndex: 'orderNumber',
              render: (text, record) => (
                <Space>
                  <Text strong>{text}</Text>
                  {record.is_archived && <Tag color="default">已归档</Tag>}
                </Space>
              ),
            },
            {
              title: '仓库',
              dataIndex: ['warehouse', 'name'],
            },
            {
              title: '来源',
              dataIndex: 'source',
              render: (text) => getSourceText(text),
            },
            {
              title: '供应商',
              dataIndex: ['supplier', 'name'],
            },
            {
              title: '入库时间',
              dataIndex: 'receivedAt',
              render: (text) => (text ? new Date(text).toLocaleString() : '-'),
            },
            {
              title: '预期到货日期',
              dataIndex: 'expectedDate',
              render: (text) => new Date(text).toLocaleDateString(),
            },
            {
              title: '状态',
              dataIndex: 'status',
              render: (status) => getStatusTag(status),
            },
            {
              title: '创建时间',
              dataIndex: 'createdAt',
              render: (text) => new Date(text).toLocaleDateString(),
            },
            {
              title: '操作',
              align: 'center',
              render: (_, record) => (
                <Space>
                  <Button
                    type="text"
                    icon={<EyeOutlined />}
                    onClick={() => handleView(record)}
                  />
                  {record.status_text === 'PENDING' && (
                    <Button
                      type="text"
                      icon={<EditOutlined />}
                      onClick={() => handleEdit(record)}
                    />
                  )}
                </Space>
              ),
            },
          ]}
          pagination={{
            current: page,
            pageSize,
            total,
            onChange: handlePageChange,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          locale={{
            emptyText: (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <Text type="secondary">暂无入库单数据</Text>
              </div>
            )
          }}
        />
      </Card>

      {/* 新增/编辑对话框 */}
      <InboundOrderDialog
        open={dialogOpen}
        order={selectedOrder}
        onClose={() => {
          setDialogOpen(false);
          setSelectedOrder(undefined);
        }}
        onSubmit={handleSubmit}
        loading={createMutation.isPending || updateMutation.isPending}
      />

      {/* 详情对话框 */}
      <InboundOrderDetailDialog
        open={detailDialogOpen}
        order={selectedOrder}
        onClose={() => {
          setDetailDialogOpen(false);
          setSelectedOrder(undefined);
        }}
        onApprove={(id) => approveMutation.mutate(id)}
        onReject={(id) => rejectMutation.mutate(id)}
        onReceive={(id) => receiveMutation.mutate(id)}
        loading={approveMutation.isPending || rejectMutation.isPending || receiveMutation.isPending}
      />

      {/* 批量导入对话框 */}
      <BatchImportDialog
        open={batchImportOpen}
        onClose={() => setBatchImportOpen(false)}
        onSuccess={() => {
          setBatchImportOpen(false);
          queryClient.invalidateQueries({ queryKey: ['inbound-orders'] });
        }}
      />

      {/* 悬浮按钮 */}
      <FloatButton
        type="primary"
        icon={<PlusOutlined />}
        onClick={handleCreate}
      />
    </div>
  );
};

export default InboundPage;
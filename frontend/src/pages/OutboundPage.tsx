import React, { useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  Button,
  Input,
  Table,
  Tag,
  Modal,
  Form,
  Select,
  Space,
  Typography,
  Tooltip,
  message,
  Row,
  Col,
  Divider,
  Steps,
  Progress,
  Alert,
  Checkbox,
  DatePicker,
  Badge,
  Avatar,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  ShoppingOutlined,
  EnvironmentOutlined,
  UserOutlined,
  PhoneOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  CarOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  AppstoreAddOutlined,
} from '@ant-design/icons';
import BatchPickingDialog from '../components/BatchPickingDialog';
import { queryKeys } from '../utils/queryClient';
import { api } from '../services/api';
import type {
  OutboundOrder,
  OutboundOrderItem,
  Warehouse,
  Product,
  Customer,
  CreateOutboundOrderRequest,
  UpdateOutboundOrderRequest,
  OutboundOrderQueryParams,
} from '../types/api';

const { Text, Title } = Typography;
const { Option } = Select;
const { Step } = Steps;
const { confirm } = Modal;

// 出库单项验证
const outboundItemSchema = z.object({
  productId: z.string().min(1, '请选择产品'),
  quantity: z.number().min(1, '请求数量必须大于0'),
  pickedQuantity: z.number().min(0, '拣货数量不能小于0').optional(),
  unitPrice: z.number().min(0, '单价不能小于0'),
  remark: z.string().optional(),
});

// 出库单验证
const outboundOrderSchema = z.object({
  orderNumber: z.string().min(1, '请输入出库单号'),
  warehouseId: z.string().min(1, '请选择仓库'),
  customerId: z.string().min(1, '请选择客户'),
  expectedDate: z.string().min(1, '请选择预期发货日期'),
  shippingAddress: z.string().min(1, '请输入收货地址'),
  contactPerson: z.string().min(1, '请输入联系人'),
  contactPhone: z.string().min(1, '请输入联系电话'),
  remark: z.string().optional(),
  items: z.array(outboundItemSchema).min(1, '至少添加一个产品'),
});

type OutboundOrderFormData = z.infer<typeof outboundOrderSchema>;

interface OutboundOrderDialogProps {
  open: boolean;
  order?: OutboundOrder;
  onClose: () => void;
  onSubmit: (data: OutboundOrderFormData) => void;
  loading?: boolean;
}

const OutboundOrderDialog: React.FC<OutboundOrderDialogProps> = ({
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
    formState: { errors },
  } = useForm<OutboundOrderFormData>({
    resolver: zodResolver(outboundOrderSchema),
    defaultValues: {
      orderNumber: order?.orderNumber || '',
      warehouseId: order?.warehouseId || '',
      customerId: order?.customerId || '',
      shippingAddress: (order as any)?.shippingAddress || '',
      items: order?.items || [{
        productId: '',
        quantity: 1,
        pickedQuantity: 0,
        unitPrice: 0,
        remark: '',
      }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const selectedCustomerId = useWatch({
    control,
    name: 'customerId',
    defaultValue: ''
  });

  // 获取仓库列表
  const { data: warehousesData } = useQuery({
    queryKey: queryKeys.warehouses.all,
    queryFn: async () => {
      const response = await api.get('/warehouses');
      return response.data.data;
    },
  });

  // 获取客户列表
  const { data: customersData } = useQuery({
    queryKey: queryKeys.customers.all,
    queryFn: async () => {
      const response = await api.get<Customer[]>('/customers');
      return response.data.data;
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

  // 获取选中客户的详细信息
  const { data: selectedCustomer } = useQuery({
    queryKey: ['customers', selectedCustomerId],
    queryFn: async () => {
      if (!selectedCustomerId) return null;
      const response = await api.get<Customer>(`/customers/${selectedCustomerId}`);
      return response.data.data;
    },
    enabled: !!selectedCustomerId,
  });

  React.useEffect(() => {
    if (open) {
      reset({
        orderNumber: order?.orderNumber || `OUT${Date.now()}`,
        warehouseId: order?.warehouseId || '',
        customerId: order?.customerId || '',
        expectedDate: order?.expectedDate ? (order as any).expectedDate.split('T')[0] : '',
        shippingAddress: (order as any)?.shippingAddress || '',
        contactPerson: order?.contactPerson || '',
        contactPhone: order?.contactPhone || '',
        remark: order?.remark || '',
        items: order?.items || [{
          productId: '',
          quantity: 1,
          pickedQuantity: 0,
          unitPrice: 0,
          remark: '',
        }],
      });
    }
  }, [open, order, reset]);

  // 当选择客户时，自动填充地址和联系信息
  React.useEffect(() => {
    if (selectedCustomer && !order) {
      reset((prev) => ({
        ...prev,
        shippingAddress: selectedCustomer.address || '',
        contactPerson: selectedCustomer.contactPerson || '',
        contactPhone: selectedCustomer.contactPhone || '',
      }));
    }
  }, [selectedCustomer, order, reset]);

  const handleFormSubmit = (data: OutboundOrderFormData) => {
    onSubmit(data);
  };

  const addItem = () => {
    append({
      productId: '',
      quantity: 1,
      pickedQuantity: 0,
      unitPrice: 0,
      remark: '',
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
      title={
        <Space>
          <ShoppingOutlined />
          {order ? '编辑出库单' : '新增出库单'}
        </Space>
      }
      onCancel={onClose}
      footer={null}
      width={1000}
      confirmLoading={loading}
    >
      <Form
        layout="vertical"
        onFinish={handleSubmit(handleFormSubmit)}
        initialValues={{
          orderNumber: order?.orderNumber || `OUT${Date.now()}`,
          warehouseId: order?.warehouseId || '',
          customerId: order?.customerId || '',
          notes: order?.notes || '',
          items: order?.items || [{
            productId: '',
            quantity: 1,
            pickedQuantity: 0,
            unitPrice: 0,
            remark: '',
          }],
        }}
      >
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Form.Item
              label="出库单号"
              required
              validateStatus={errors.orderNumber ? 'error' : ''}
              help={errors.orderNumber?.message}
            >
              <Controller
                name="orderNumber"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="请输入出库单号"
                    disabled={loading || !!order}
                  />
                )}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="预期发货日期"
              required
              validateStatus={errors.expectedDate ? 'error' : ''}
              help={errors.expectedDate?.message}
            >
              <Controller
                name="expectedDate"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    {...field}
                    style={{ width: '100%' }}
                    disabled={loading}
                  />
                )}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="仓库"
              required
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
                    showSearch
                    optionFilterProp="children"
                    filterOption={(input, option) =>
                      (option?.children as string)?.toLowerCase().indexOf(input.toLowerCase()) >= 0
                    }
                  >
                    {Array.isArray(warehousesData) ? warehousesData.map((warehouse) => (
                      <Option key={warehouse.id} value={warehouse.id}>
                        {warehouse.name} (编码: {warehouse.code})
                      </Option>
                    )) : []}
                  </Select>
                )}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="客户"
              required
              validateStatus={errors.customerId ? 'error' : ''}
              help={errors.customerId?.message}
            >
              <Controller
                name="customerId"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    placeholder="请选择客户"
                    disabled={loading}
                    showSearch
                    optionFilterProp="children"
                    filterOption={(input, option) =>
                      (option?.children as string)?.toLowerCase().indexOf(input.toLowerCase()) >= 0
                    }
                  >
                    {Array.isArray(customersData) ? customersData.map((customer) => (
                      <Option key={customer.id} value={customer.id}>
                        {customer.name} (编码: {customer.code})
                      </Option>
                    )) : []}
                  </Select>
                )}
              />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item
              label="收货地址"
              required
              validateStatus={errors.shippingAddress ? 'error' : ''}
              help={errors.shippingAddress?.message}
            >
              <Controller
                name="shippingAddress"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="请输入收货地址"
                    disabled={loading}
                    prefix={<EnvironmentOutlined />}
                  />
                )}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="联系人"
              required
              validateStatus={errors.contactPerson ? 'error' : ''}
              help={errors.contactPerson?.message}
            >
              <Controller
                name="contactPerson"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="请输入联系人"
                    disabled={loading}
                    prefix={<UserOutlined />}
                  />
                )}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="联系电话"
              required
              validateStatus={errors.contactPhone ? 'error' : ''}
              help={errors.contactPhone?.message}
            >
              <Controller
                name="contactPhone"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="请输入联系电话"
                    disabled={loading}
                    prefix={<PhoneOutlined />}
                  />
                )}
              />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item
              label="备注"
              validateStatus={errors.remark ? 'error' : ''}
              help={errors.remark?.message}
            >
              <Controller
                name="remark"
                control={control}
                render={({ field }) => (
                  <Input.TextArea
                    {...field}
                    placeholder="请输入备注"
                    rows={2}
                    disabled={loading}
                  />
                )}
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider style={{ margin: '24px 0' }} />

        {/* 产品列表 */}
        <Space style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
          <Card key={field.id} style={{ marginBottom: 16, padding: 16 }}>
            <Row gutter={[16, 16]} align="middle">
              <Col span={6}>
                <Form.Item
                  label="产品"
                  required
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
                        showSearch
                        optionFilterProp="children"
                        filterOption={(input, option) =>
                          (option?.children as string)?.toLowerCase().indexOf(input.toLowerCase()) >= 0
                        }
                      >
                        {Array.isArray(productsData) ? productsData.map((product) => (
                          <Option key={product.id} value={product.id}>
                            {product.name} (SKU: {product.sku})
                          </Option>
                        )) : []}
                      </Select>
                    )}
                  />
                </Form.Item>
              </Col>
              <Col span={4}>
                <Form.Item
                  label="请求数量"
                  required
                  validateStatus={errors.items?.[index]?.quantity ? 'error' : ''}
                  help={errors.items?.[index]?.quantity?.message}
                >
                  <Controller
                    name={`items.${index}.quantity`}
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        type="number"
                        placeholder="请输入请求数量"
                        disabled={loading}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    )}
                  />
                </Form.Item>
              </Col>
              {order && (
                <Col span={4}>
                  <Form.Item
                    label="拣货数量"
                    validateStatus={errors.items?.[index]?.pickedQuantity ? 'error' : ''}
                    help={errors.items?.[index]?.pickedQuantity?.message}
                  >
                    <Controller
                      name={`items.${index}.pickedQuantity`}
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          type="number"
                          placeholder="请输入拣货数量"
                          disabled={loading}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      )}
                    />
                  </Form.Item>
                </Col>
              )}
              <Col span={4}>
                <Form.Item
                  label="单价"
                  required
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
                        placeholder="请输入单价"
                        disabled={loading}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        prefix="¥"
                      />
                    )}
                  />
                </Form.Item>
              </Col>
              <Col span={order ? 4 : 6}>
                <Form.Item
                  label="备注"
                  validateStatus={errors.items?.[index]?.remark ? 'error' : ''}
                  help={errors.items?.[index]?.remark?.message}
                >
                  <Controller
                    name={`items.${index}.remark`}
                    control={control}
                    render={({ field }) => (
                      <Input.TextArea
                        {...field}
                        placeholder="请输入备注"
                        disabled={loading}
                        rows={1}
                      />
                    )}
                  />
                </Form.Item>
              </Col>
              <Col span={2}>
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
          <Alert message={errors.items.message} type="error" showIcon style={{ marginTop: 16 }} />
        )}

        <Form.Item style={{ marginTop: 24 }}>
          <Space>
            <Button onClick={onClose} disabled={loading}>
              取消
            </Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              {loading ? '保存中...' : '保存'}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

interface OutboundOrderDetailDialogProps {
  open: boolean;
  order?: OutboundOrder;
  onClose: () => void;
  onApprove?: (orderId: string) => void;
  onReject?: (orderId: string) => void;
  onPick?: (orderId: string) => void;
  onShip?: (orderId: string) => void;
  loading?: boolean;
}

const OutboundOrderDetailDialog: React.FC<OutboundOrderDetailDialogProps> = ({
  open,
  order,
  onClose,
  onApprove,
  onReject,
  onPick,
  onShip,
  loading = false,
}) => {
  if (!order) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'processing';
      case 'picking': return 'processing';
      case 'picked': return 'processing';
      case 'shipped': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '待审核';
      case 'approved': return '已审核';
      case 'picking': return '拣货中';
      case 'picked': return '已拣货';
      case 'shipped': return '已发货';
      case 'rejected': return '已拒绝';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <ClockCircleOutlined />;
      case 'approved': return <CheckCircleOutlined />;
      case 'picking': return <SyncOutlined spin />;
      case 'picked': return <CheckCircleOutlined />;
      case 'shipped': return <CarOutlined />;
      case 'rejected': return <CloseCircleOutlined />;
      default: return <InfoCircleOutlined />;
    }
  };

  const steps = ['创建', '审核', '拣货', '发货'];
  const getActiveStep = (status: string) => {
    switch (status) {
      case 'pending': return 0;
      case 'approved': return 1;
      case 'picking': return 2;
      case 'picked': return 2;
      case 'shipped': return 3;
      default: return 0;
    }
  };

  const activeStep = getActiveStep(order.status_text);

  // 计算拣货进度
  const calculatePickingProgress = () => {
    if (!order.items || order.items.length === 0) return 0;
    const totalItems = order.items.length;
    const pickedItems = order.items.filter(item => 
      (item.pickedQuantity || 0) >= item.quantity
    ).length;
    return (pickedItems / totalItems) * 100;
  };

  const pickingProgress = calculatePickingProgress();

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={1000}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShoppingOutlined />
          出库单详情
        </div>
      }
      destroyOnClose
      footer={
        <Space>
          <Button onClick={onClose}>
            关闭
          </Button>
          {order.status_text === 'PENDING' && onApprove && onReject && (
            <>
              <Button
                onClick={() => onReject(order.id)}
                danger
                disabled={loading}
              >
                拒绝
              </Button>
              <Button
                onClick={() => onApprove(order.id)}
                type="primary"
                loading={loading}
              >
                {loading ? '审核中...' : '审核通过'}
              </Button>
            </>
          )}
          {order.status_text === 'IN_PROGRESS' && onPick && (
            <Button
              onClick={() => onPick(order.id)}
              type="primary"
              loading={loading}
            >
              {loading ? '开始拣货...' : '开始拣货'}
            </Button>
          )}
          {order.status_text === 'COMPLETED' && onShip && (
            <Button
              onClick={() => onShip(order.id)}
              type="primary"
              loading={loading}
            >
              {loading ? '发货中...' : '确认发货'}
            </Button>
          )}
        </Space>
      }
    >
      <div style={{ padding: '24px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <Badge
            status={getStatusColor(order.status_text)}
            text={
              <Space>
                {getStatusIcon(order.status_text)}
                {getStatusText(order.status_text)}
              </Space>
            }
          />
        </div>
        
        {/* 基本信息 */}
        <Card style={{ marginBottom: 24 }}>
          <Title level={5}>
            基本信息
          </Title>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Text type="secondary">
                出库单号
              </Text>
              <br />
              <Text strong>
                {order.orderNumber}
              </Text>
            </Col>
            <Col span={12}>
              <Text type="secondary">
                仓库
              </Text>
              <br />
              <Text strong>
                {order.warehouse?.name}
              </Text>
            </Col>
            <Col span={12}>
              <Text type="secondary">
                客户
              </Text>
              <br />
              <Text strong>
                {order.customerId || '未指定'}
              </Text>
            </Col>
            {order.notes && (
              <Col span={24}>
                <Text type="secondary">
                  备注
                </Text>
                <br />
                <Text>
                  {order.notes}
                </Text>
              </Col>
            )}
          </Row>
        </Card>

        {/* 流程状态 */}
        <Card style={{ marginBottom: 24 }}>
          <Title level={5}>
            处理流程
          </Title>
          <Steps current={activeStep} labelPlacement="vertical">
            {steps.map((label) => (
              <Step key={label} title={label} />
            ))}
          </Steps>
          {((order as any).status === 'picking' || (order as any).status === 'picked') && (
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">
                拣货进度: {pickingProgress.toFixed(0)}%
              </Text>
              <Progress percent={pickingProgress} size="small" />
            </div>
          )}
        </Card>

        {/* 产品明细 */}
        <Card style={{ marginBottom: 24 }}>
          <Title level={5} style={{ padding: '16px 16px 0' }}>
            产品明细
          </Title>
          <Table
            dataSource={order.items}
            rowKey={(_, index) => `item-${index}`}
            pagination={false}
            scroll={{ x: 'max-content' }}
            columns={[
              {
                title: '产品名称',
                dataIndex: 'product',
                key: 'productName',
                render: (product) => (
                  <Space>
                    <Avatar src={product?.imageUrl || '/default-product.png'} shape="square" size="large" />
                    <Text strong>{product?.name}</Text>
                  </Space>
                ),
              },
              {
                title: 'SKU',
                dataIndex: ['product', 'sku'],
                key: 'sku',
              },
              {
                title: '请求数量',
                dataIndex: 'quantity',
        key: 'quantity',
                align: 'right',
              },
              {
                title: '拣货数量',
                dataIndex: 'pickedQuantity',
                key: 'pickedQuantity',
                align: 'right',
                render: (text) => text || 0,
              },
              {
                title: '单位',
                dataIndex: ['product', 'unit'],
                key: 'unit',
                align: 'right',
              },
              {
                title: '备注',
                dataIndex: 'remark',
                key: 'remark',
              },
            ]}
          />
        </Card>
      </div>
    </Modal>
  );
};

const OutboundPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OutboundOrder | undefined>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [batchPickingDialogOpen, setBatchPickingDialogOpen] = useState(false);

  const queryClient = useQueryClient();

  // 构建查询参数
  const queryParams: OutboundOrderQueryParams = {
    page,
    limit: pageSize,
    search,
    status: statusFilter as 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | undefined,
    warehouseId: warehouseFilter || undefined,
  };

  // 获取出库单列表
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['outbound-orders', queryParams],
    queryFn: async () => {
      const response = await api.get<{
        list: OutboundOrder[];
        pagination: {
          total: number;
          page: number;
          limit: number;
        };
      }>('/outbound-orders', { params: queryParams });
      return response.data.data;
    },
  });

  // 获取仓库列表
  const { data: warehousesData } = useQuery({
    queryKey: queryKeys.warehouses.all,
    queryFn: async () => {
      const response = await api.get('/warehouses');
      return response.data.data.list;
    },
  });

  // 创建出库单
  const createMutation = useMutation({
    mutationFn: async (data: CreateOutboundOrderRequest) => {
      const response = await api.post<OutboundOrder>('/outbound-orders', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outbound-orders'] });
      setDialogOpen(false);
      setSelectedOrder(undefined);
    },
  });

  // 更新出库单
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateOutboundOrderRequest }) => {
      const response = await api.put<OutboundOrder>(`/outbound-orders/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outbound-orders'] });
      setDialogOpen(false);
      setSelectedOrder(undefined);
    },
  });

  // 审核出库单
  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/outbound-orders/${id}/approve`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outbound-orders'] });
      setDetailDialogOpen(false);
    },
  });

  // 拒绝出库单
  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/outbound-orders/${id}/reject`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outbound-orders'] });
      setDetailDialogOpen(false);
    },
  });

  // 开始拣货
  const pickMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/outbound-orders/${id}/pick`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outbound-orders'] });
      setDetailDialogOpen(false);
    },
  });

  // 确认发货
  const shipMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/outbound-orders/${id}/ship`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outbound-orders'] });
      setDetailDialogOpen(false);
    },
  });

  const handleCreate = () => {
    setSelectedOrder(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (order: OutboundOrder) => {
    setSelectedOrder(order);
    setDialogOpen(true);
  };

  const handleView = (order: OutboundOrder) => {
    setSelectedOrder(order);
    setDetailDialogOpen(true);
  };

  const handleDelete = (order: OutboundOrder) => {
    confirm({
      title: '确认删除出库单?',
      icon: <ExclamationCircleOutlined />,
      content: `确定要删除出库单 ${order.orderNumber} 吗？此操作不可恢复。`,
      okText: '确认',
      okType: 'danger',
      cancelText: '取消',
      onOk() {
        return api.delete(`/outbound-orders/${order.id}`).then(() => {
          queryClient.invalidateQueries({ queryKey: ['outbound-orders'] });
          message.success('出库单删除成功');
        });
      },
    });
  };

  const handleSubmit = (data: OutboundOrderFormData) => {
    if (selectedOrder) {
      updateMutation.mutate({ id: selectedOrder.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handlePageChange = (newPage: number, newPageSize: number) => {
    setPage(newPage);
    setPageSize(newPageSize);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'processing';
      case 'picking': return 'processing';
      case 'picked': return 'processing';
      case 'shipped': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '待审核';
      case 'approved': return '已审核';
      case 'picking': return '拣货中';
      case 'picked': return '已拣货';
      case 'shipped': return '已发货';
      case 'rejected': return '已拒绝';
      default: return status;
    }
  };

  const orders = ordersData?.list || [];
  const total = ordersData?.pagination?.total || 0;

  return (
    <div>
      <PageHeader title="出库管理" sub="部门领用申请、拣货与发放登记" />

      {/* 操作栏 */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder="搜索出库单..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              prefix={<SearchOutlined />}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              value={statusFilter}
              onChange={(value) => setStatusFilter(value)}
              placeholder="选择状态"
              style={{ width: '100%' }}
            >
              <Option value="">全部状态</Option>
              <Option value="pending">待审核</Option>
              <Option value="approved">已审核</Option>
              <Option value="picking">拣货中</Option>
              <Option value="picked">已拣货</Option>
              <Option value="shipped">已发货</Option>
              <Option value="rejected">已拒绝</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              value={warehouseFilter}
              onChange={(value) => setWarehouseFilter(value)}
              placeholder="选择仓库"
              style={{ width: '100%' }}
            >
              <Option value="">全部仓库</Option>
              {Array.isArray(warehousesData) ? warehousesData.map((warehouse) => (
                <Option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </Option>
              )) : []}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Button
              type="default"
              icon={<ReloadOutlined />}
              onClick={() => {
                setSearch('');
                setStatusFilter('');
                setWarehouseFilter('');
              }}
              style={{ width: '100%' }}
            >
              重置
            </Button>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreate}
              style={{ width: '100%' }}
            >
              新增出库单
            </Button>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Button
              type="default"
              icon={<AppstoreAddOutlined />}
              onClick={() => {
                if (selectedRowKeys.length === 0) {
                  message.warning('请先选择要拣货的出库单');
                  return;
                }
                setBatchPickingDialogOpen(true);
              }}
              disabled={selectedRowKeys.length === 0}
              style={{ width: '100%' }}
            >
              批量拣货 ({selectedRowKeys.length})
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 出库单列表 */}
      <Card>
        <Table
          rowSelection={{
            selectedRowKeys,
            onChange: (newSelectedRowKeys: React.Key[]) => {
              setSelectedRowKeys(newSelectedRowKeys);
            },
            getCheckboxProps: (record: OutboundOrder) => ({
              disabled: !['PENDING', 'IN_PROGRESS'].includes(record.status_text),
            }),
          }}
          columns={[
            { 
              title: '出库单号', 
              dataIndex: 'orderNumber', 
              key: 'orderNumber',
              render: (text: string, record: OutboundOrder) => (
                <Button type="link" onClick={() => handleView(record)}>
                  {text}
                </Button>
              )
            },
            { 
              title: '仓库', 
              dataIndex: ['warehouse', 'name'], 
              key: 'warehouse' 
            },
            { 
              title: '客户', 
              dataIndex: ['customer', 'name'], 
              key: 'customer' 
            },
            { 
              title: '预期发货日期', 
              dataIndex: 'expectedDate', 
              key: 'expectedDate',
              render: (date: string) => new Date(date).toLocaleDateString()
            },
            { 
              title: '状态', 
              dataIndex: 'status', 
              key: 'status',
              render: (status: string) => (
                <Tag color={getStatusColor(status)}>
                  {getStatusText(status)}
                </Tag>
              )
            },
            { 
              title: '创建时间', 
              dataIndex: 'createdAt', 
              key: 'createdAt',
              render: (date: string) => new Date(date).toLocaleDateString()
            },
            { 
              title: '操作', 
              key: 'action',
              render: (_: any, record: OutboundOrder) => (
                <Space size="middle">
                  <Tooltip title="查看详情">
                    <Button
                      type="text"
                      icon={<InfoCircleOutlined />}
                      onClick={() => handleView(record)}
                    />
                  </Tooltip>
                  {record.status_text === 'PENDING' && (
                    <Tooltip title="编辑">
                      <Button
                        type="text"
                        icon={<EditOutlined />}
                        onClick={() => handleEdit(record)}
                      />
                    </Tooltip>
                  )}
                  <Tooltip title="删除">
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleDelete(record)}
                    />
                  </Tooltip>
                </Space>
              )
            }
          ]}
          dataSource={orders}
          rowKey="id"
          loading={isLoading}
          locale={{ emptyText: '暂无出库单数据' }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: handlePageChange,
            onShowSizeChange: handlePageChange,
          }}
        />
      </Card>

      {/* 新增/编辑对话框 */}
      <OutboundOrderDialog
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
      <OutboundOrderDetailDialog
        open={detailDialogOpen}
        order={selectedOrder}
        onClose={() => {
          setDetailDialogOpen(false);
          setSelectedOrder(undefined);
        }}
        onApprove={(id) => approveMutation.mutate(id)}
        onReject={(id) => rejectMutation.mutate(id)}
        onPick={(id) => pickMutation.mutate(id)}
        onShip={(id) => shipMutation.mutate(id)}
        loading={
          approveMutation.isPending || 
          rejectMutation.isPending || 
          pickMutation.isPending || 
          shipMutation.isPending
        }
      />

      {/* 批量拣货对话框 */}
      <BatchPickingDialog
        visible={batchPickingDialogOpen}
        onClose={() => {
          setBatchPickingDialogOpen(false);
          setSelectedRowKeys([]);
        }}
        selectedOrders={orders.filter(order => selectedRowKeys.includes(order.id))}
        onSuccess={() => {
          setSelectedRowKeys([]);
          setBatchPickingDialogOpen(false);
        }}
      />
    </div>
  );
};

export default OutboundPage;
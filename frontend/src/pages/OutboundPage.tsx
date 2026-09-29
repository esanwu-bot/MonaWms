import React, { useState } from 'react';
import dayjs from 'dayjs';
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
  Descriptions,
  InputNumber,
  Spin,
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
  CheckOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import BatchPickingDialog from '../components/BatchPickingDialog';
import { queryKeys } from '../utils/queryClient';
import { api } from '../services/api';
import { userService, type UserOption } from '../services/userService';
import { stocktakeEnhance } from '../services/stocktakeEnhance';
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
  orderNumber: z.string().optional(),        // 单号由后端自动生成（OUT+日期+流水号），前端只读
  warehouseId: z.string().min(1, '请选择仓库'),
  // D2：领用信息与「客户」并存，客户不再强制
  customerId: z.string().optional(),
  receiverUnit: z.string().optional(),   // 领用单位
  receiverName: z.string().optional(),   // 领用人
  // D4：手机号格式校验（客户明确要求该字段）
  receiverPhone: z.string().optional()
    .refine((v) => !v || /^1[3-9]\d{9}$/.test(v), '请输入正确的11位手机号'),
  shippedAt: z.string().optional(),      // C2：出库时间
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
        orderNumber: order?.orderNumber || '',
        warehouseId: order?.warehouseId || '',
        customerId: order?.customerId || '',
        receiverUnit: (order as any)?.receiverUnit || '',
        receiverName: (order as any)?.receiverName || '',
        receiverPhone: (order as any)?.receiverPhone || '',
        shippedAt: (order as any)?.shippedAt || '',
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
          orderNumber: order?.orderNumber || '',
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
              help="由系统自动生成，无需填写"
            >
              <Controller
                name="orderNumber"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="保存后由系统自动生成（OUT+日期+流水号）"
                    disabled
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
              label="客户（可选）"
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
        </Row>

        {/* D2 领用信息 */}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="领用单位"
              validateStatus={errors.receiverUnit ? 'error' : ''}
              help={errors.receiverUnit?.message}
            >
              <Controller
                name="receiverUnit"
                control={control}
                render={({ field }) => (
                  <Input {...field} placeholder="请输入领用单位" disabled={loading} />
                )}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="领用人"
              validateStatus={errors.receiverName ? 'error' : ''}
              help={errors.receiverName?.message}
            >
              <Controller
                name="receiverName"
                control={control}
                render={({ field }) => (
                  <Input {...field} placeholder="请输入领用人" disabled={loading} />
                )}
              />
            </Form.Item>
          </Col>
        </Row>

        {/* D2 手机号 + C2 出库时间 */}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="领用人手机号"
              validateStatus={errors.receiverPhone ? 'error' : ''}
              help={errors.receiverPhone?.message}
            >
              <Controller
                name="receiverPhone"
                control={control}
                render={({ field }) => (
                  <Input {...field} placeholder="11 位手机号" maxLength={11} disabled={loading} />
                )}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="出库时间"
              validateStatus={errors.shippedAt ? 'error' : ''}
              help={errors.shippedAt?.message}
            >
              <Controller
                name="shippedAt"
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
              <Col span={8}>
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
              <Col span={5}>
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
              {/* 单价字段按业务要求隐藏，提交时默认 0 */}
              <Col span={order ? 5 : 9}>
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

// P9：出库单详情数据结构（后端 getDetailInfo 返回 snake_case）
interface OutboundDetailItem {
  id: number;
  product_id: number;
  product?: { id: number; name: string; sku: string; unit?: string; measure_type?: string };
  quantity: number;
  picked_quantity: number;
  unit_price: number;
  batch_number?: string | null;
  notes?: string;
}

interface OutboundDetail {
  id: string;
  order_number: string;
  status: string;
  status_text?: string;
  warehouse_id?: number;
  warehouse_name?: string;
  customer_name?: string;
  receiver_unit?: string | null;
  receiver_name?: string | null;
  expected_date?: string | null;
  notes?: string;
  items: OutboundDetailItem[];
  statistics?: {
    total_items: number;
    total_quantity: number | string;
    picked_quantity: number | string;
    completion_rate: number;
  };
}

// 状态机对齐后端：pending → picking → packed → shipped → delivered / cancelled
const getOutboundStatusTag = (status: string) => {
  switch (status) {
    case 'pending': return <Tag icon={<ClockCircleOutlined />} color="warning">待处理</Tag>;
    case 'picking': return <Tag icon={<SyncOutlined spin />} color="processing">拣货中</Tag>;
    case 'packed': return <Tag icon={<CheckCircleOutlined />} color="processing">已打包</Tag>;
    case 'shipped': return <Tag icon={<CarOutlined />} color="success">已发货</Tag>;
    case 'delivered': return <Tag icon={<CheckCircleOutlined />} color="success">已送达</Tag>;
    case 'cancelled': return <Tag icon={<CloseCircleOutlined />} color="default">已取消</Tag>;
    default: return <Tag>{status}</Tag>;
  }
};

// P9：明细级拣货弹窗 —— 计件类扫 SN 出库（后端校验本仓在库并联动 SN 台账），散料指定批次或留空走 FIFO 扣余量
interface PickingDialogProps {
  open: boolean;
  order: OutboundDetail | undefined;
  onClose: () => void;
}

const PickingDialog: React.FC<PickingDialogProps> = ({ open, order, onClose }) => {
  const queryClient = useQueryClient();
  const [itemId, setItemId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState<number>(0);
  const [locationId, setLocationId] = useState<number | undefined>(undefined);
  const [batchNumber, setBatchNumber] = useState('');
  const [serialsText, setSerialsText] = useState('');

  const items = order?.items || [];
  const currentItem = items.find((it) => it.id === itemId);
  // 计件类判定与后端 requiresSerial() 同口径：measure_type = count
  const isCount = (currentItem?.product?.measure_type || 'count') === 'count';
  const remaining = currentItem
    ? Math.max(0, Number(currentItem.quantity) - Number(currentItem.picked_quantity))
    : 0;
  // SN 支持换行/逗号/空格批量粘贴（与后端 preg_split 同口径）
  const serialList = serialsText.split(/[\r\n,\s]+/).map((s) => s.trim()).filter(Boolean);
  const serialsOk = !isCount || (serialList.length === Math.floor(quantity) && quantity > 0);

  // 库位选项（按单据仓库过滤）
  const { data: locationOptions } = useQuery({
    queryKey: ['locations', 'options', order?.warehouse_id],
    queryFn: async () => {
      const response = await api.get('/locations/options', {
        params: { warehouse_id: order?.warehouse_id },
      });
      return Array.isArray(response.data?.data) ? response.data.data : [];
    },
    enabled: open && !!order?.warehouse_id,
  });

  // 切换明细时重置表单，数量默认填剩余量
  const selectItem = (it: OutboundDetailItem) => {
    setItemId(it.id);
    setQuantity(Math.max(0, Number(it.quantity) - Number(it.picked_quantity)));
    setBatchNumber(it.batch_number || '');
    setSerialsText('');
  };

  React.useEffect(() => {
    if (open) {
      if (items.length > 0 && (itemId === null || !items.some((it) => it.id === itemId))) {
        // 默认选中第一条未拣完的明细
        const next = items.find((it) => Number(it.picked_quantity) < Number(it.quantity));
        if (next) selectItem(next);
      }
    } else {
      setItemId(null);
      setQuantity(0);
      setLocationId(undefined);
      setBatchNumber('');
      setSerialsText('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, order]);

  const pickMutation = useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      const response = await api.post(`/outbound-orders/${order?.id}/pick`, payload);
      return response.data;
    },
    onSuccess: () => {
      message.success('拣货成功');
      // 刷新详情（已拣数量回显）与列表
      queryClient.invalidateQueries({ queryKey: ['outbound-order-detail'] });
      queryClient.invalidateQueries({ queryKey: ['outbound-orders'] });
      setSerialsText('');
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || '拣货失败');
    },
  });

  const canSubmit =
    !!currentItem && !!locationId && quantity > 0 && quantity <= remaining + 1e-9 && serialsOk;

  const handleSubmit = () => {
    if (!canSubmit) return;
    pickMutation.mutate({
      item_id: currentItem!.id,
      quantity,
      location_id: locationId,
      // 散料留空走 FIFO 自动扣减；计件类不传批次
      batch_number: !isCount && batchNumber ? batchNumber : undefined,
      // 计件类按件传 SN；散料类不传
      serials: isCount ? serialList : undefined,
    });
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={760}
      title={
        <Space>
          <CheckOutlined />
          <span>拣货登记 - {order?.order_number}</span>
        </Space>
      }
      footer={[
        <Button key="close" onClick={onClose}>关闭</Button>,
        <Button
          key="submit"
          type="primary"
          onClick={handleSubmit}
          loading={pickMutation.isPending}
          disabled={!canSubmit}
        >
          提交拣货
        </Button>,
      ]}
    >
      <Alert
        style={{ marginBottom: 16 }}
        type="info"
        showIcon
        message={
          isCount
            ? '计件类物资：需按件录入序列号（SN）出库，系统校验 SN 归属本仓且在库；总账与 SN 台账同事务更新'
            : '散料类物资：批次号留空按先进先出（FIFO）自动扣减，也可指定批次/卷号；总账与批次台账同事务更新'
        }
      />

      <Table
        size="small"
        dataSource={items}
        rowKey="id"
        pagination={false}
        rowSelection={{
          type: 'radio',
          selectedRowKeys: itemId !== null ? [itemId] : [],
          onSelect: (record) => selectItem(record as OutboundDetailItem),
        }}
        onRow={(record) => ({ onClick: () => selectItem(record as OutboundDetailItem) })}
        columns={[
          {
            title: '产品',
            dataIndex: ['product', 'name'],
            render: (text, record: any) => (
              <div>
                <div>{text}</div>
                <Typography.Text type="secondary">SKU: {record.product?.sku}</Typography.Text>
              </div>
            ),
          },
          {
            title: '应拣',
            dataIndex: 'quantity',
            align: 'right',
            width: 100,
            render: (text, record: any) => `${text} ${record.product?.unit || '件'}`,
          },
          {
            title: '已拣',
            dataIndex: 'picked_quantity',
            align: 'right',
            width: 90,
            render: (text) => Number(text || 0),
          },
          {
            title: '剩余',
            align: 'right',
            width: 80,
            render: (_, record: any) =>
              Math.max(0, Number(record.quantity) - Number(record.picked_quantity)),
          },
        ]}
      />

      <Divider plain>拣货信息</Divider>

      {currentItem ? (
        <Form layout="vertical">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label={isCount ? '拣货数量（件）' : '拣货数量'} required>
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  max={remaining}
                  precision={isCount ? 0 : 4}
                  step={isCount ? 1 : 0.0001}
                  value={quantity}
                  onChange={(v) => setQuantity(Number(v) || 0)}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="拣货库位" required>
                <Select
                  placeholder="选择拣货库位"
                  showSearch
                  optionFilterProp="children"
                  value={locationId}
                  onChange={setLocationId}
                  allowClear
                >
                  {(locationOptions || []).map((loc: any) => (
                    <Select.Option key={loc.id} value={loc.id}>{loc.code}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            {!isCount && (
              <Col span={8}>
                <Form.Item label="批次/卷号" extra="留空按 FIFO 自动扣减">
                  <Input
                    placeholder="如 B20260929-01"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    maxLength={50}
                  />
                </Form.Item>
              </Col>
            )}
          </Row>

          {isCount && (
            <Form.Item
              label="序列号（SN）"
              required
              validateStatus={serialsOk ? 'success' : 'error'}
              help={
                serialsOk
                  ? `已录入 ${serialList.length} / 需 ${Math.floor(quantity)} 个`
                  : `已录入 ${serialList.length} / 需 ${Math.floor(quantity)} 个，个数必须与拣货数量一致`
              }
            >
              <Input.TextArea
                rows={6}
                placeholder={'每行一个 SN，支持换行、逗号或空格分隔批量粘贴\n例：\nSN20260929001\nSN20260929002\nSN20260929003'}
                value={serialsText}
                onChange={(e) => setSerialsText(e.target.value)}
              />
            </Form.Item>
          )}
        </Form>
      ) : (
        <Typography.Text type="secondary">请先在上方选择要拣货的明细</Typography.Text>
      )}
    </Modal>
  );
};

interface OutboundOrderDetailDialogProps {
  open: boolean;
  orderId?: string;
  onClose: () => void;
  onStartPicking?: (orderId: string) => void;
  onPack?: (orderId: string) => void;
  onShip?: (orderId: string) => void;
  onDeliver?: (orderId: string) => void;
  loading?: boolean;
}

const OutboundOrderDetailDialog: React.FC<OutboundOrderDetailDialogProps> = ({
  open,
  orderId,
  onClose,
  onStartPicking,
  onPack,
  onShip,
  onDeliver,
  loading = false,
}) => {
  const [pickingOpen, setPickingOpen] = useState(false);

  // 详情以 id 驱动实时拉取（拣货后已拣数量可即时回显）
  const { data: order, isLoading: detailLoading } = useQuery({
    queryKey: ['outbound-order-detail', orderId],
    queryFn: async () => {
      const response = await api.get(`/outbound-orders/${orderId}`);
      return response.data?.data as OutboundDetail;
    },
    enabled: open && !!orderId,
  });

  if (!orderId) return null;

  const steps = ['创建', '拣货', '打包', '发货'];
  const getActiveStep = (status?: string) => {
    switch (status) {
      case 'pending': return 0;
      case 'picking': return 1;
      case 'packed': return 2;
      case 'shipped': return 3;
      case 'delivered': return 3;
      default: return 0;
    }
  };

  const activeStep = getActiveStep(order?.status);

  const totalQty = Number(order?.statistics?.total_quantity || 0);
  const pickedQty = Number(order?.statistics?.picked_quantity || 0);
  const allPicked =
    order && order.items.length > 0
      ? order.items.every((it) => Number(it.picked_quantity) >= Number(it.quantity))
      : false;
  const pickingProgress = totalQty > 0 ? (pickedQty / totalQty) * 100 : 0;

  // 未拣完直接打包时二次确认，避免误操作截断拣货
  const handlePack = () => {
    if (order && !allPicked) {
      Modal.confirm({
        title: '仍有明细未拣完',
        content: `已拣 ${pickedQty} / 应拣 ${totalQty}，确认直接完成打包吗？未拣部分将不再拣货。`,
        okText: '确认打包',
        cancelText: '继续拣货',
        onOk: () => onPack?.(order.id),
      });
    } else if (order) {
      onPack?.(order.id);
    }
  };

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
      destroyOnHidden
      footer={
        <Space>
          <Button onClick={onClose}>
            关闭
          </Button>
          {order?.status === 'pending' && onStartPicking && (
            <Button
              onClick={() => onStartPicking(order.id)}
              type="primary"
              icon={<PlayCircleOutlined />}
              loading={loading}
            >
              开始拣货
            </Button>
          )}
          {order?.status === 'picking' && (
            <Button
              onClick={() => setPickingOpen(true)}
              type="primary"
              icon={<CheckOutlined />}
            >
              拣货登记
            </Button>
          )}
          {order?.status === 'picking' && onPack && (
            <Button
              onClick={handlePack}
              icon={<CheckCircleOutlined />}
              loading={loading}
            >
              完成打包
            </Button>
          )}
          {order?.status === 'packed' && onShip && (
            <Button
              onClick={() => onShip(order.id)}
              type="primary"
              icon={<CarOutlined />}
              loading={loading}
            >
              确认发货
            </Button>
          )}
          {order?.status === 'shipped' && onDeliver && (
            <Button
              onClick={() => onDeliver(order.id)}
              type="primary"
              icon={<CheckCircleOutlined />}
              loading={loading}
            >
              确认送达
            </Button>
          )}
        </Space>
      }
    >
      <Spin spinning={detailLoading && !order}>
        <div style={{ padding: '24px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            {order ? getOutboundStatusTag(order.status) : null}
          </div>

          {/* 基本信息 */}
          <Card style={{ marginBottom: 24 }}>
            <Title level={5}>
              基本信息
            </Title>
            <Descriptions column={2}>
              <Descriptions.Item label="出库单号">{order?.order_number}</Descriptions.Item>
              <Descriptions.Item label="仓库">{order?.warehouse_name}</Descriptions.Item>
              <Descriptions.Item label="客户/领用单位">
                {order?.customer_name || order?.receiver_unit || '未指定'}
              </Descriptions.Item>
              <Descriptions.Item label="领用人">{order?.receiver_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="拣货进度">
                {pickedQty} / {totalQty}（{order?.statistics?.completion_rate ?? 0}%）
              </Descriptions.Item>
              <Descriptions.Item label="要求送达日期">
                {order?.expected_date || '-'}
              </Descriptions.Item>
              {order?.notes && (
                <Descriptions.Item label="备注" span={2}>
                  {order.notes}
                </Descriptions.Item>
              )}
            </Descriptions>
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
            {order?.status === 'picking' && (
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
              dataSource={order?.items || []}
              rowKey="id"
              pagination={false}
              scroll={{ x: 'max-content' }}
              columns={[
                {
                  title: '产品名称',
                  dataIndex: ['product', 'name'],
                  key: 'productName',
                  render: (text, record: any) => (
                    <Space>
                      <Avatar src={record.product?.imageUrl || '/default-product.png'} shape="square" size="large" />
                      <Text strong>{text}</Text>
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
                  render: (text, record: any) => `${text} ${record.product?.unit || '件'}`,
                },
                {
                  title: '已拣数量',
                  dataIndex: 'picked_quantity',
                  key: 'picked_quantity',
                  align: 'right',
                  render: (text) => Number(text || 0),
                },
                {
                  title: '进度',
                  key: 'progress',
                  align: 'right',
                  width: 130,
                  render: (_, record: any) => {
                    const q = Number(record.quantity);
                    const p = Number(record.picked_quantity || 0);
                    return (
                      <Text type={p >= q ? 'success' : p > 0 ? 'warning' : undefined}>
                        {p >= q ? '已拣齐' : p > 0 ? `部分拣货 ${p}/${q}` : '未拣货'}
                      </Text>
                    );
                  },
                },
                {
                  title: '批次号',
                  dataIndex: 'batch_number',
                  key: 'batch_number',
                  render: (text) => text || '-',
                },
                {
                  title: '备注',
                  dataIndex: 'notes',
                  key: 'notes',
                  render: (text) => text || '-',
                },
              ]}
            />
          </Card>
        </div>
      </Spin>

      {/* P9：明细级拣货登记（嵌套弹窗，拣货后自动刷新详情） */}
      <PickingDialog
        open={pickingOpen}
        order={order}
        onClose={() => setPickingOpen(false)}
      />
    </Modal>
  );
};

const OutboundPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [archivedFilter, setArchivedFilter] = useState<'' | 'archived' | 'all'>('');
  const [operatorFilter, setOperatorFilter] = useState<number | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OutboundOrder | undefined>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [batchPickingDialogOpen, setBatchPickingDialogOpen] = useState(false);

  const queryClient = useQueryClient();

  // 构建查询参数（与后端 snake_case 参数对齐：order_number/warehouse_id/archived/operator_id）
  const queryParams: OutboundOrderQueryParams = {
    page,
    limit: pageSize,
    order_number: search || undefined,
    status: statusFilter || undefined,
    warehouse_id: warehouseFilter || undefined,
    archived: archivedFilter || undefined,
    operator_id: operatorFilter,
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

  // 获取负责人（经办人）选项：归档/负责人筛选下拉
  const { data: operatorOptions } = useQuery({
    queryKey: ['user-options'],
    queryFn: async () => {
      const response = await userService.getOptions();
      return response.data.data as UserOption[];
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

  // P9：开始拣货（pending → picking，真正扣库存的动作在明细级 pick）
  const startPickingMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/outbound-orders/${id}/start-picking`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outbound-orders'] });
      queryClient.invalidateQueries({ queryKey: ['outbound-order-detail'] });
      message.success('已开始拣货，请进行拣货登记');
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || '开始拣货失败');
    },
  });

  // P9：完成打包（picking → packed）
  const packMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/outbound-orders/${id}/pack`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outbound-orders'] });
      queryClient.invalidateQueries({ queryKey: ['outbound-order-detail'] });
      message.success('打包完成');
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || '打包失败');
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
      queryClient.invalidateQueries({ queryKey: ['outbound-order-detail'] });
      setDetailDialogOpen(false);
      message.success('发货成功');
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || '发货失败');
    },
  });

  // P9：确认送达（shipped → delivered）
  const deliverMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/outbound-orders/${id}/deliver`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outbound-orders'] });
      queryClient.invalidateQueries({ queryKey: ['outbound-order-detail'] });
      message.success('已确认送达');
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || '确认送达失败');
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
      title: '确认归档出库单?',
      icon: <ExclamationCircleOutlined />,
      content: `确定要归档出库单 ${order.orderNumber} 吗？归档后单据保留，可在「已归档」筛选中翻查。`,
      okText: '确认',
      okType: 'danger',
      cancelText: '取消',
      onOk() {
        return api.delete(`/outbound-orders/${order.id}`).then(() => {
          queryClient.invalidateQueries({ queryKey: ['outbound-orders'] });
          message.success('出库单已归档，可在归档筛选中翻查');
        });
      },
    });
  };

  const handleSubmit = (data: OutboundOrderFormData) => {
    // 后端接口字段为 snake_case（warehouse_id / customer_id / items[].product_id ...）
    const payload: Record<string, any> = {
      warehouse_id: Number(data.warehouseId),
      customer_id: data.customerId ? Number(data.customerId) : null,
      receiver_unit: data.receiverUnit || null,     // D2 领用单位
      receiver_name: data.receiverName || null,     // D2 领用人
      receiver_phone: data.receiverPhone || null,   // D2 手机号
      shipped_at: data.shippedAt || null,           // C2 出库时间
      type: 'sale',
      priority: 'normal',
      expected_date: data.expectedDate,
      notes: data.remark || '',
      items: data.items.map((it) => ({
        product_id: Number(it.productId),
        quantity: it.quantity,
        unit_price: it.unitPrice ?? 0,
        batch_number: '',
        notes: it.remark || '',
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'picking': return 'processing';
      case 'packed': return 'processing';
      case 'shipped': return 'success';
      case 'completed': return 'success';
      case 'delivered': return 'success';
      case 'cancelled': return 'default';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '待处理';
      case 'picking': return '拣货中';
      case 'packed': return '已打包';
      case 'shipped': return '已发货';
      case 'completed': return '已完成';
      case 'delivered': return '已送达';
      case 'cancelled': return '已取消';
      default: return status;
    }
  };

  const total = ordersData?.pagination?.total || 0;
  // P10：合并盘点盘亏生成的其他出库单（DEFICIT_OUT，mock 增强层）
  // TODO(backend): 后端落地后改走真实单据列表透传
  const orders = React.useMemo(() => {
    const real = ordersData?.list || [];
    const rows = stocktakeEnhance
      .getAdjustmentOrdersByType('DEFICIT_OUT')
      .filter(
        (adj) =>
          (!search || adj.order_number.includes(search)) &&
          (!warehouseFilter || String(adj.warehouse_id) === String(warehouseFilter))
      )
      .map((adj) => ({
        id: adj.id,
        orderNumber: adj.order_number,
        order_number: adj.order_number,
        warehouseId: String(adj.warehouse_id),
        warehouse: { id: adj.warehouse_id, name: adj.warehouse_name },
        status: 'completed',
        status_text: '已完成（盘亏调整）',
        receiver_unit: '盘点盘亏调整',
        receiver_name: adj.created_by,
        shippedAt: adj.created_at,
        shipped_at: adj.created_at,
        totalQuantity: adj.items.reduce((s, it) => s + Number(it.qty || 0), 0),
        totalAmount: 0,
        notes: `盘点单 ${adj.stocktake_order_number} 审核通过自动生成`,
        createdBy: adj.created_by,
        created_at: adj.created_at,
        updated_at: adj.created_at,
        items: [],
      })) as unknown as OutboundOrder[];
    return [...rows, ...real];
  }, [ordersData, search, warehouseFilter]);

  return (
    <div>
      <PageHeader title="出库管理" sub="部门领用申请、拣货与发放登记" />

      {/* 操作栏 */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder="搜索出库单号..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              prefix={<SearchOutlined />}
              style={{ width: '100%' }}
              allowClear
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
              <Option value="pending">待处理</Option>
              <Option value="picking">拣货中</Option>
              <Option value="packed">已打包</Option>
              <Option value="shipped">已发货</Option>
              <Option value="delivered">已送达</Option>
              <Option value="cancelled">已取消</Option>
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
            <Select
              value={archivedFilter}
              onChange={(value) => setArchivedFilter((value as '' | 'archived' | 'all') ?? '')}
              placeholder="归档状态"
              style={{ width: '100%' }}
            >
              <Option value="">未归档</Option>
              <Option value="archived">已归档</Option>
              <Option value="all">全部</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={3}>
            <Select
              value={operatorFilter}
              onChange={(value) => setOperatorFilter(value ?? undefined)}
              placeholder="负责人"
              style={{ width: '100%' }}
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
          <Col xs={24} sm={12} md={3}>
            <Button
              type="default"
              icon={<ReloadOutlined />}
              onClick={() => {
                setSearch('');
                setStatusFilter('');
                setWarehouseFilter('');
                setArchivedFilter('');
                setOperatorFilter(undefined);
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
              disabled: !['pending', 'approved', 'picking'].includes(record.status),
            }),
          }}
          columns={[
            {
              title: '出库单号',
              dataIndex: 'order_number',
              key: 'order_number',
              render: (text: string, record: OutboundOrder) => (
                <Space>
                  <Button type="link" onClick={() => handleView(record)}>
                    {text}
                  </Button>
                  {record.is_archived && <Tag color="default">已归档</Tag>}
                </Space>
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
              title: '领用单位',
              dataIndex: 'receiver_unit',
              key: 'receiver_unit',
              render: (text: string) => text || '-'
            },
            {
              title: '领用人',
              dataIndex: 'receiver_name',
              key: 'receiver_name',
              render: (text: string, record: any) => (
                text ? `${text}${record.receiver_phone ? ' / ' + record.receiver_phone : ''}` : '-'
              )
            },
            {
              title: '出库时间',
              dataIndex: 'shipped_at',
              key: 'shipped_at',
              render: (text: string) => (text ? new Date(text).toLocaleString() : '-')
            },
            {
              title: '预期发货日期',
              dataIndex: 'expected_date',
              key: 'expected_date',
              render: (date: string) => (date ? new Date(date).toLocaleDateString() : '-')
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
              dataIndex: 'created_at',
              key: 'created_at',
              render: (date: string) => (date ? new Date(date).toLocaleDateString() : '-')
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
                  {record.status === 'pending' && (
                    <Tooltip title="编辑">
                      <Button
                        type="text"
                        icon={<EditOutlined />}
                        onClick={() => handleEdit(record)}
                      />
                    </Tooltip>
                  )}
                  <Tooltip title="归档">
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

      {/* 详情对话框（P9：id 驱动 + 明细级拣货流程） */}
      <OutboundOrderDetailDialog
        open={detailDialogOpen}
        orderId={selectedOrder?.id}
        onClose={() => {
          setDetailDialogOpen(false);
          setSelectedOrder(undefined);
        }}
        onStartPicking={(id) => startPickingMutation.mutate(id)}
        onPack={(id) => packMutation.mutate(id)}
        onShip={(id) => shipMutation.mutate(id)}
        onDeliver={(id) => deliverMutation.mutate(id)}
        loading={
          startPickingMutation.isPending ||
          packMutation.isPending ||
          shipMutation.isPending ||
          deliverMutation.isPending
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
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
  AutoComplete,
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
  StopOutlined,
  SyncOutlined
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
  CreateInboundOrderRequest,
  UpdateInboundOrderRequest,
  InboundOrderQueryParams,
} from '../types/api';
import BatchImportDialog from '../components/BatchImportDialog';

const { Title, Text } = Typography;
const { Option } = Select;
const { Step } = Steps;
const { TextArea } = Input;

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
  orderNumber: z.string().optional(),        // 单号由后端自动生成（IN+日期+流水号），前端只读
  warehouseId: z.string().min(1, '请选择仓库'),
  source: z.string().min(1, '请选择来源'),   // I2：来源（defaultValues 兜底 purchase）
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

  // 获取仓库列表（index 是分页结构会导致下拉无数据，改用 options 纯数组接口）
  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses', 'options'],
    queryFn: async () => {
      const response = await api.get('/warehouses/options');
      return Array.isArray(response.data?.data) ? response.data.data : [];
    },
  });

  // 获取供应商列表（同上，改用 options 接口）
  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers', 'options'],
    queryFn: async () => {
      const response = await api.get('/suppliers/options');
      return Array.isArray(response.data?.data) ? response.data.data : [];
    },
  });

  // 获取产品列表（分页接口返回 {list,total}，之前直接当数组用导致下拉无数据）
  const { data: productsData } = useQuery({
    queryKey: queryKeys.products.all,
    queryFn: async () => {
      const response = await api.get('/products', { params: { limit: 500 } });
      const d = response.data?.data;
      return Array.isArray(d) ? d : (d?.list || []);
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
  const isTransferSource = (watchSource || '') === 'transfer_in';   // P9+：调拨入库

  const productMap = React.useMemo(() => {
    const map: Record<string, Product> = {};
    if (Array.isArray(productsData)) {
      (productsData as Product[]).forEach((p) => { map[String(p.id)] = p; });
    }
    return map;
  }, [productsData]);

  // 产品检索（AutoComplete）：支持名称 / 设备来源(sku) / 序列号(barcode) / 型号
  const [productSearchMap, setProductSearchMap] = React.useState<Record<number, string>>({});
  const filterProducts = (kw: string): Product[] => {
    const list = Array.isArray(productsData) ? (productsData as Product[]) : [];
    const k = kw.trim().toLowerCase();
    if (!k) return list.slice(0, 50);
    return list
      .filter((p: any) =>
        [p.name, p.sku, p.barcode, p.model_number]
          .some((v) => String(v || '').toLowerCase().includes(k)))
      .slice(0, 50);
  };
  const productDisplay = (index: number, pid: any) => {
    if (productSearchMap[index] !== undefined) return productSearchMap[index];
    const p = productMap[String(pid)];
    return p ? `${p.name}（${p.sku}）` : '';
  };

  // 仓库检索（AutoComplete）：按名称 / 编码过滤
  const [warehouseDisplay, setWarehouseDisplay] = useState('');
  const warehouseList = Array.isArray(warehousesData) ? (warehousesData as any[]) : [];
  const warehouseOptions = warehouseList.map((w) => ({
    value: `${w.name}（${w.code}）`,
    warehouseId: w.id,
    label: (
      <Space>
        {w.name}
        <Tag>{w.code}</Tag>
      </Space>
    ),
  }));
  const selectedWarehouse = warehouseList.find((w) => String(w.id) === String(watch('warehouseId')));

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
      setWarehouseDisplay('');
      reset({
        orderNumber: order?.orderNumber || '',
        warehouseId: order?.warehouseId || '',
        source: (order as any)?.source || 'purchase',        // I2
        receivedAt: (order as any)?.receivedAt || '',         // C1
        supplierId: order?.supplierId || '',
        notes: order?.notes || '',
        // P9+：调拨信息回填（列表/详情为 snake_case）
        transferFrom: (order as any)?.transfer_from || (order as any)?.transferFrom || '',
        transferRemark: (order as any)?.transfer_remark || (order as any)?.transferRemark || '',
        handlerName: (order as any)?.handler_name || (order as any)?.handlerName || '',
        handlerPhone: (order as any)?.handler_phone || (order as any)?.handlerPhone || '',
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
    // P9+：调拨入库含无设备编号物资时，调拨说明必填（后端同样校验）
    if ((data.source || '') === 'transfer_in' && hasNoSerialItem && !String(data.transferRemark || '').trim()) {
      message.error('调拨入库含无设备编号（非计件/散料）物资时，请填写调拨说明：从哪里调拨到哪里、经手人姓名与电话');
      return;
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
              help="由系统自动生成，无需填写"
            >
              <Controller
                name="orderNumber"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="保存后由系统自动生成（IN+日期+流水号）"
                    disabled
                  />
                )}
              />
            </Form.Item>
          </Col>
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
                  <AutoComplete
                    style={{ width: '100%' }}
                    value={warehouseDisplay || (selectedWarehouse ? `${selectedWarehouse.name}（${selectedWarehouse.code}）` : '')}
                    disabled={loading}
                    allowClear
                    placeholder="输入名称 / 编码检索仓库"
                    options={warehouseOptions}
                    filterOption={(input, option) =>
                      String(option?.value ?? '').toLowerCase().includes(input.trim().toLowerCase())
                    }
                    onSearch={(kw) => {
                      setWarehouseDisplay(kw);
                      if (field.value) field.onChange('');
                    }}
                    onClear={() => {
                      setWarehouseDisplay('');
                      field.onChange('');
                    }}
                    onSelect={(_v, option: any) => {
                      field.onChange(option.warehouseId);
                      setWarehouseDisplay('');
                    }}
                  />
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
                        {supplier.name}
                      </Option>
                    )) : []}
                  </Select>
                )}
              />
            </Form.Item>
          </Col>
          <Col span={12} />
        </Row>

        {/* P9+：调拨信息（无设备编号的设备调拨必须留依据：从哪里调拨到哪里、经手人、电话） */}
        {isTransferSource && (
          <>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="调出仓库/地点"
                  help="从哪里调拨（调入仓库为上方已选仓库）"
                >
                  <Controller
                    name="transferFrom"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        placeholder="如：备件仓 / XX基站"
                        disabled={loading}
                      />
                    )}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="经手人姓名">
                  <Controller
                    name="handlerName"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        placeholder="调拨经手人姓名"
                        disabled={loading}
                      />
                    )}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="经手人电话">
                  <Controller
                    name="handlerPhone"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        placeholder="手机号 / 座机"
                        disabled={loading}
                      />
                    )}
                  />
                </Form.Item>
              </Col>
              <Col span={12} />
            </Row>

            <Form.Item
              label="调拨说明"
              required={hasNoSerialItem}
              validateStatus={errors.transferRemark ? 'error' : ''}
              help={
                errors.transferRemark?.message
                || (hasNoSerialItem
                  ? '当前明细含无设备编号（非计件/散料）物资，必须注明从哪里调拨到哪里及依据'
                  : '无设备编号的调拨请注明从哪里调拨到哪里')
              }
            >
              <Controller
                name="transferRemark"
                control={control}
                render={({ field }) => (
                  <Input.TextArea
                    {...field}
                    rows={2}
                    placeholder="例：从备件仓调拨至本仓，无设备编号，依据：XX项目拆回设备清单（2026-09-29）"
                    disabled={loading}
                  />
                )}
              />
            </Form.Item>
          </>
        )}

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
              <Col span={9}>
                <Form.Item
                  label="产品"
                  validateStatus={errors.items?.[index]?.productId ? 'error' : ''}
                  help={errors.items?.[index]?.productId?.message}
                >
                  <Controller
                    name={`items.${index}.productId`}
                    control={control}
                    render={({ field }) => (
                      <AutoComplete
                        style={{ width: '100%' }}
                        value={productDisplay(index, field.value)}
                        disabled={loading}
                        allowClear
                        placeholder="输入名称 / 设备来源 / 序列号 / 型号检索"
                        options={filterProducts(productSearchMap[index] ?? '').map((p: any) => ({
                          value: `${p.name}（${p.sku || '-'}）`,
                          productId: p.id,
                          label: (
                            <div>
                              <div>{p.name}</div>
                              <Text type="secondary">
                                来源: {p.sku || '-'} ｜ 序列号: {p.barcode || '-'} ｜ 型号: {p.model_number || '-'}
                              </Text>
                            </div>
                          ),
                        }))}
                        onSearch={(kw) => {
                          setProductSearchMap((m) => ({ ...m, [index]: kw }));
                          if (field.value) field.onChange('');
                        }}
                        onClear={() => {
                          setProductSearchMap((m) => ({ ...m, [index]: '' }));
                          field.onChange('');
                        }}
                        onSelect={(_v, option: any) => {
                          field.onChange(option.productId);
                          setProductSearchMap((m) => ({ ...m, [index]: option.value }));
                        }}
                      />
                    )}
                  />
                </Form.Item>
              </Col>
              <Col span={5}>
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

              {/* 单价字段按业务要求隐藏，提交时默认 0 */}
              <Col span={9}>
                <Form.Item label="批次号">
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

// P9：入库单详情数据结构（后端 getDetailInfo 返回 snake_case）
interface DetailOrderItem {
  id: number;
  product_id: number;
  product?: { id: number; name: string; sku: string; unit?: string; measure_type?: string };
  quantity: number;
  received_quantity: number;
  unit_price: number;
  batch_number?: string | null;
  expiry_date?: string | null;
}

interface DetailOrder {
  id: string;
  order_number: string;
  status: string;
  status_text?: string;
  warehouse_id?: number;
  warehouse_name?: string;
  supplier_name?: string;
  operator_name?: string;
  source?: string;
  received_at?: string | null;
  expected_date?: string | null;
  notes?: string;
  // P9+：调拨信息（无设备编号的调拨依据）
  transfer_from?: string | null;
  transfer_remark?: string | null;
  handler_name?: string | null;
  handler_phone?: string | null;
  items: DetailOrderItem[];
  statistics?: {
    total_items: number;
    total_quantity: number | string;
    received_quantity: number | string;
    completion_rate: number;
  };
}

// 状态机对齐后端：pending 待处理 → receiving 收货中 → completed 已完成 / cancelled 已取消
const getInboundStatusTag = (status: string) => {
  switch (status) {
    case 'pending': return <Tag icon={<ClockCircleOutlined />} color="warning">待处理</Tag>;
    case 'receiving': return <Tag icon={<SyncOutlined spin />} color="processing">收货中</Tag>;
    case 'completed': return <Tag icon={<CheckOutlined />} color="success">已完成</Tag>;
    case 'cancelled': return <Tag icon={<CloseCircleOutlined />} color="default">已取消</Tag>;
    default: return <Tag>{status}</Tag>;
  }
};

// P9：明细级收货登记弹窗 —— 计件类（measure_type=count）按件录 SN，散料录批次（留空自动生成）
interface ReceivingDialogProps {
  open: boolean;
  order: DetailOrder | undefined;
  onClose: () => void;
}

const ReceivingDialog: React.FC<ReceivingDialogProps> = ({ open, order, onClose }) => {
  const queryClient = useQueryClient();
  const [itemId, setItemId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState<number>(0);
  const [locationId, setLocationId] = useState<number | undefined>(undefined);
  const [batchNumber, setBatchNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [serialsText, setSerialsText] = useState('');

  const items = order?.items || [];
  const currentItem = items.find((it) => it.id === itemId);
  // 计件类判定与后端 requiresSerial() 同口径：measure_type = count
  const isCount = (currentItem?.product?.measure_type || 'count') === 'count';
  const remaining = currentItem
    ? Math.max(0, Number(currentItem.quantity) - Number(currentItem.received_quantity))
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
  const selectItem = (it: DetailOrderItem) => {
    setItemId(it.id);
    setQuantity(Math.max(0, Number(it.quantity) - Number(it.received_quantity)));
    setBatchNumber(it.batch_number || '');
    setSerialsText('');
  };

  React.useEffect(() => {
    if (open) {
      if (items.length > 0 && (itemId === null || !items.some((it) => it.id === itemId))) {
        // 默认选中第一条未收完的明细
        const next = items.find((it) => Number(it.received_quantity) < Number(it.quantity));
        if (next) selectItem(next);
      }
    } else {
      setItemId(null);
      setQuantity(0);
      setLocationId(undefined);
      setBatchNumber('');
      setExpiryDate('');
      setSerialsText('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, order]);

  const receiveMutation = useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      const response = await api.post(`/inbound-orders/${order?.id}/receive`, payload);
      return response.data;
    },
    onSuccess: () => {
      message.success('收货成功');
      // 刷新详情（已收数量回显）与列表
      queryClient.invalidateQueries({ queryKey: ['inbound-order-detail'] });
      queryClient.invalidateQueries({ queryKey: ['inbound-orders'] });
      setSerialsText('');
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || '收货失败');
    },
  });

  const canSubmit =
    !!currentItem && !!locationId && quantity > 0 && quantity <= remaining + 1e-9 && serialsOk;

  const handleSubmit = () => {
    if (!canSubmit) return;
    receiveMutation.mutate({
      item_id: currentItem!.id,
      quantity,
      location_id: locationId,
      batch_number: batchNumber || undefined,
      expiry_date: expiryDate || undefined,
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
          <span>收货登记 - {order?.order_number}</span>
        </Space>
      }
      footer={[
        <Button key="close" onClick={onClose}>关闭</Button>,
        <Button
          key="submit"
          type="primary"
          onClick={handleSubmit}
          loading={receiveMutation.isPending}
          disabled={!canSubmit}
        >
          提交收货
        </Button>,
      ]}
    >
      <Alert
        style={{ marginBottom: 16 }}
        type="info"
        showIcon
        message={
          isCount
            ? '计件类物资：需按件录入序列号（SN），支持换行、逗号或空格分隔批量粘贴；总账与 SN 台账同事务更新'
            : '散料类物资：按批次登记数量，批次号留空将自动生成；总账与批次台账同事务更新'
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
          onSelect: (record) => selectItem(record as DetailOrderItem),
        }}
        onRow={(record) => ({ onClick: () => selectItem(record as DetailOrderItem) })}
        columns={[
          {
            title: '产品',
            dataIndex: ['product', 'name'],
            render: (text, record: any) => (
              <div>
                <div>{text}</div>
                <Text type="secondary">SKU: {record.product?.sku}</Text>
              </div>
            ),
          },
          {
            title: '应收',
            dataIndex: 'quantity',
            align: 'right',
            width: 100,
            render: (text, record: any) => `${text} ${record.product?.unit || '件'}`,
          },
          {
            title: '已收',
            dataIndex: 'received_quantity',
            align: 'right',
            width: 90,
            render: (text) => Number(text || 0),
          },
          {
            title: '剩余',
            align: 'right',
            width: 80,
            render: (_, record: any) =>
              Math.max(0, Number(record.quantity) - Number(record.received_quantity)),
          },
        ]}
      />

      <Divider plain>收货信息</Divider>

      {currentItem ? (
        <Form layout="vertical">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label={isCount ? '收货数量（件）' : '收货数量'} required>
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
              <Form.Item label="库位" required>
                <Select
                  placeholder="选择上架库位"
                  showSearch
                  optionFilterProp="children"
                  value={locationId}
                  onChange={setLocationId}
                  allowClear
                >
                  {(locationOptions || []).map((loc: any) => (
                    <Option key={loc.id} value={loc.id}>{loc.code}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="批次号" extra={isCount ? '计件类可留空' : '留空自动生成批次号'}>
                <Input
                  placeholder="如 B20260929-01"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  maxLength={50}
                />
              </Form.Item>
            </Col>
          </Row>

          {isCount ? (
            <Form.Item
              label="序列号（SN）"
              required
              validateStatus={serialsOk ? 'success' : 'error'}
              help={
                serialsOk
                  ? `已录入 ${serialList.length} / 需 ${Math.floor(quantity)} 个`
                  : `已录入 ${serialList.length} / 需 ${Math.floor(quantity)} 个，个数必须与收货数量一致`
              }
            >
              <TextArea
                rows={6}
                placeholder={'每行一个 SN，支持换行、逗号或空格分隔批量粘贴\n例：\nSN20260929001\nSN20260929002\nSN20260929003'}
                value={serialsText}
                onChange={(e) => setSerialsText(e.target.value)}
              />
            </Form.Item>
          ) : (
            <Form.Item label="效期（可选）">
              <DatePicker
                style={{ width: '100%' }}
                value={expiryDate ? dayjs(expiryDate) : null}
                onChange={(_, dateStr) => setExpiryDate((dateStr as string) || '')}
              />
            </Form.Item>
          )}
        </Form>
      ) : (
        <Text type="secondary">请先在上方选择要收货的明细</Text>
      )}
    </Modal>
  );
};

interface InboundOrderDetailDialogProps {
  open: boolean;
  orderId?: string;
  onClose: () => void;
  onStartReceiving?: (orderId: string) => void;
  onComplete?: (orderId: string) => void;
  loading?: boolean;
}

const InboundOrderDetailDialog: React.FC<InboundOrderDetailDialogProps> = ({
  open,
  orderId,
  onClose,
  onStartReceiving,
  onComplete,
  loading = false,
}) => {
  const [receivingOpen, setReceivingOpen] = useState(false);

  // 详情以 id 驱动实时拉取（收货后已收数量可即时回显）
  const { data: order, isLoading: detailLoading } = useQuery({
    queryKey: ['inbound-order-detail', orderId],
    queryFn: async () => {
      const response = await api.get(`/inbound-orders/${orderId}`);
      return response.data?.data as DetailOrder;
    },
    enabled: open && !!orderId,
  });

  if (!orderId) return null;

  const steps = [
    { title: '创建', status: 'finish' },
    {
      title: '收货',
      status: order?.status === 'receiving' ? 'process'
        : order?.status === 'completed' ? 'finish' : 'wait',
    },
    { title: '完成', status: order?.status === 'completed' ? 'finish' : 'wait' },
  ];

  const totalQty = Number(order?.statistics?.total_quantity || 0);
  const receivedQty = Number(order?.statistics?.received_quantity || 0);
  const allReceived =
    order && order.items.length > 0
      ? order.items.every((it) => Number(it.received_quantity) >= Number(it.quantity))
      : false;

  // 未收完直接完成时二次确认，避免误操作截断收货
  const handleComplete = () => {
    if (order && !allReceived) {
      Modal.confirm({
        title: '仍有明细未收完',
        content: `已收 ${receivedQty} / 应收 ${totalQty}，确认直接完成入库吗？未收部分将不再收货。`,
        okText: '确认完成',
        cancelText: '继续收货',
        onOk: () => onComplete?.(order.id),
      });
    } else if (order) {
      onComplete?.(order.id);
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
          入库单详情
        </Space>
      }
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>,
        order?.status === 'pending' && onStartReceiving && (
          <Button
            key="start-receiving"
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={() => onStartReceiving(order.id)}
            loading={loading}
          >
            开始收货
          </Button>
        ),
        order?.status === 'receiving' && (
          <Button
            key="receive"
            type="primary"
            icon={<CheckOutlined />}
            onClick={() => setReceivingOpen(true)}
          >
            收货登记
          </Button>
        ),
        order?.status === 'receiving' && onComplete && (
          <Button
            key="complete"
            icon={<CheckCircleOutlined />}
            onClick={handleComplete}
            loading={loading}
          >
            完成入库
          </Button>
        ),
      ].filter(Boolean)}
    >
      <Spin spinning={detailLoading && !order}>
        <Card title="基本信息" style={{ marginBottom: 24 }}>
          <Descriptions column={2}>
            <Descriptions.Item label="入库单号">{order?.order_number}</Descriptions.Item>
            <Descriptions.Item label="仓库">{order?.warehouse_name}</Descriptions.Item>
            <Descriptions.Item label="来源">{getSourceText(order?.source)}</Descriptions.Item>
            <Descriptions.Item label="入库时间">
              {order?.received_at ? new Date(order.received_at).toLocaleString() : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="供应商">{order?.supplier_name || '-'}</Descriptions.Item>
            <Descriptions.Item label="状态">
              {order ? getInboundStatusTag(order.status) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="收货进度">
              {receivedQty} / {totalQty}（{order?.statistics?.completion_rate ?? 0}%）
            </Descriptions.Item>
            {/* P9+：调拨信息（无设备编号的调拨依据） */}
            {order?.transfer_remark && (
              <Descriptions.Item label="调拨说明" span={2}>
                <div style={{ whiteSpace: 'pre-wrap' }}>{order.transfer_remark}</div>
              </Descriptions.Item>
            )}
            {order?.transfer_from && (
              <Descriptions.Item label="调出仓库/地点">{order.transfer_from}</Descriptions.Item>
            )}
            {order?.handler_name && (
              <Descriptions.Item label="经手人">{order.handler_name}</Descriptions.Item>
            )}
            {order?.handler_phone && (
              <Descriptions.Item label="经手人电话">{order.handler_phone}</Descriptions.Item>
            )}
            {order?.notes && (
              <Descriptions.Item label="备注" span={2}>
                {order.notes}
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>

        <Card title="处理流程" style={{ marginBottom: 24 }}>
          <Steps current={order?.status === 'pending' ? 0 : order?.status === 'receiving' ? 1 : 2}>
            {steps.map((step, index) => (
              <Step key={index} title={step.title} status={step.status as any} />
            ))}
          </Steps>
        </Card>

        <Card title="产品明细">
          <Table
            size="small"
            dataSource={order?.items || []}
            rowKey="id"
            pagination={false}
            columns={[
              {
                title: '产品',
                dataIndex: ['product', 'name'],
                render: (text, record: any) => (
                  <div>
                    <div>{text}</div>
                    <Text type="secondary">SKU: {record.product?.sku}</Text>
                  </div>
                ),
              },
              {
                title: '应收数量',
                dataIndex: 'quantity',
                align: 'right',
                render: (text, record: any) => `${text} ${record.product?.unit || '件'}`,
              },
              {
                title: '已收数量',
                dataIndex: 'received_quantity',
                align: 'right',
                render: (text) => Number(text || 0),
              },
              {
                title: '进度',
                align: 'right',
                width: 140,
                render: (_, record: any) => {
                  const q = Number(record.quantity);
                  const r = Number(record.received_quantity || 0);
                  return (
                    <Text type={r >= q ? 'success' : r > 0 ? 'warning' : undefined}>
                      {r >= q ? '已收齐' : r > 0 ? `部分收货 ${r}/${q}` : '未收货'}
                    </Text>
                  );
                },
              },
              {
                title: '单价',
                dataIndex: 'unit_price',
                align: 'right',
                render: (text) => `¥${Number(text || 0).toFixed(2)}`,
              },
              {
                title: '金额',
                align: 'right',
                render: (_, record: any) =>
                  `¥${(Number(record.quantity) * Number(record.unit_price || 0)).toFixed(2)}`,
              },
              {
                title: '批次号',
                dataIndex: 'batch_number',
                render: (text) => text || '-',
              },
            ]}
          />
        </Card>
      </Spin>

      {/* P9：明细级收货登记（嵌套弹窗，收货后自动刷新详情） */}
      <ReceivingDialog
        open={receivingOpen}
        order={order}
        onClose={() => setReceivingOpen(false)}
      />
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

  // 获取仓库列表（index 是分页结构，改用 options 纯数组接口，避免筛选下拉无数据）
  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses', 'options'],
    queryFn: async () => {
        const response = await api.get('/warehouses/options');
        return Array.isArray(response.data?.data) ? response.data.data : [];
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

  // P9：开始收货（pending → receiving，收货真正加库存的动作在明细级 receive）
  const startReceivingMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/inbound-orders/${id}/start-receiving`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbound-orders'] });
      queryClient.invalidateQueries({ queryKey: ['inbound-order-detail'] });
      message.success('已开始收货，请进行收货登记');
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || '开始收货失败');
    },
  });

  // P9：完成入库（receiving → completed）
  const completeMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/inbound-orders/${id}/complete`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbound-orders'] });
      queryClient.invalidateQueries({ queryKey: ['inbound-order-detail'] });
      message.success('入库完成');
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || '完成入库失败');
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
      // P9+：调拨信息（无设备编号的调拨依据）
      transfer_from: data.transferFrom || '',
      transfer_remark: data.transferRemark || '',
      handler_name: data.handlerName || '',
      handler_phone: data.handlerPhone || '',
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
      const response = await fetch('/api/inbound-orders/template', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('下载失败');
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
              <Option value="pending">待处理</Option>
              <Option value="receiving">收货中</Option>
              <Option value="completed">已完成</Option>
              <Option value="cancelled">已取消</Option>
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
          rowKey="id"
          columns={[
            {
              title: '入库单号',
              dataIndex: 'order_number',
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
              // P9+：调拨信息（无设备编号的调拨依据）
              title: '调拨信息',
              dataIndex: 'transfer_remark',
              width: 260,
              render: (_: any, record: any) => {
                if (record.source !== 'transfer_in') return '-';
                const meta = [
                  record.transfer_from ? `从 ${record.transfer_from}` : '',
                  record.handler_name ? `经手人：${record.handler_name}` : '',
                  record.handler_phone ? `电话：${record.handler_phone}` : '',
                ].filter(Boolean).join(' ｜ ');
                if (!record.transfer_remark && !meta) return '-';
                return (
                  <div>
                    {record.transfer_remark && (
                      <div style={{ whiteSpace: 'pre-wrap' }}>{record.transfer_remark}</div>
                    )}
                    {meta && <Text type="secondary">{meta}</Text>}
                  </div>
                );
              },
            },
            {
              title: '入库时间',
              dataIndex: 'received_at',
              render: (text) => (text ? new Date(text).toLocaleString() : '-'),
            },
            {
              title: '预期到货日期',
              dataIndex: 'expected_date',
              render: (text) => (text ? new Date(text).toLocaleDateString() : '-'),
            },
            {
              title: '状态',
              dataIndex: 'status',
              render: (status) => getInboundStatusTag(status),
            },
            {
              title: '创建时间',
              dataIndex: 'created_at',
              render: (text) => (text ? new Date(text).toLocaleDateString() : '-'),
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
                  {record.status === 'pending' && (
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

      {/* 详情对话框（P9：id 驱动 + 明细级收货流程） */}
      <InboundOrderDetailDialog
        open={detailDialogOpen}
        orderId={selectedOrder?.id}
        onClose={() => {
          setDetailDialogOpen(false);
          setSelectedOrder(undefined);
        }}
        onStartReceiving={(id) => startReceivingMutation.mutate(id)}
        onComplete={(id) => completeMutation.mutate(id)}
        loading={startReceivingMutation.isPending || completeMutation.isPending}
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
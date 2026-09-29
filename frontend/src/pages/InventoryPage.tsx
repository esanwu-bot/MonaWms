import React, { useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import { InfoCircleOutlined } from '@ant-design/icons';
import {
  Card,
  Typography,
  Button,
  Input,
  InputNumber,
  AutoComplete,
  Select,
  Table,
  Tabs,
  Tag,
  Modal,
  Form,
  Alert,
  Space,
  message
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  SwapOutlined,
  SyncOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  DatabaseOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../utils/queryClient';
import { api } from '../services/api';
import type {
  InventoryItem,
  Warehouse,
  Product,
  InventoryQueryParams,
} from '../types/api';

const { Title, Text } = Typography;
const { Option } = Select;

// 库存调整表单值（产品用 AutoComplete 检索，单独维护选中态）
interface AdjustmentFormValues {
  productId: number;
  warehouseId: number;
  adjustmentType: 'increase' | 'decrease';
  quantity: number;
  reason: string;
  remark?: string;
}

// 库存转移表单值
interface TransferFormValues {
  productId: number;
  fromWarehouseId: number;
  toWarehouseId: number;
  quantity: number;
  reason: string;
  remark?: string;
}

// 产品检索：名称 / 设备来源(sku) / 序列号(barcode) / 型号
const filterProducts = (list: Product[], keyword: string): Product[] => {
  const source = Array.isArray(list) ? list : [];
  const k = keyword.trim().toLowerCase();
  if (!k) return source.slice(0, 50);
  return source
    .filter((p: any) =>
      [p.name, p.sku, p.barcode, p.model_number]
        .some((v) => String(v || '').toLowerCase().includes(k)))
    .slice(0, 50);
};

const productOptionLabel = (p: any) => (
  <div>
    <div>{p.name}</div>
    <Text type="secondary">
      设备来源: {p.sku || '-'} ｜ 序列号: {p.barcode || '-'} ｜ 型号: {p.model_number || '-'}
    </Text>
  </div>
);

interface InventoryAdjustmentDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: AdjustmentFormValues) => void;
  loading?: boolean;
  products: Product[];
  warehouses: Warehouse[];
}

const InventoryAdjustmentDialog: React.FC<InventoryAdjustmentDialogProps> = ({
  open,
  onClose,
  onSubmit,
  loading = false,
  products,
  warehouses,
}) => {
  const [form] = Form.useForm();
  const [productId, setProductId] = useState<number | undefined>(undefined);
  const [productText, setProductText] = useState('');
  const [productKeyword, setProductKeyword] = useState('');
  const [productError, setProductError] = useState('');

  const warehouseId = Form.useWatch('warehouseId', form);
  const adjustmentType = Form.useWatch('adjustmentType', form);

  const selectedProduct = React.useMemo(
    () => (Array.isArray(products) ? products.find((p) => String(p.id) === String(productId)) : undefined),
    [products, productId]
  );
  const isCount = (selectedProduct?.measure_type || 'count') === 'count';
  const unit = selectedProduct?.unit || '件';

  // 当前库存（产品 + 仓库，后端聚合该仓库全部库位/批次）
  const { data: currentStock } = useQuery({
    queryKey: ['inventory', 'stock', productId, warehouseId],
    queryFn: async () => {
      const response = await api.get(`/inventory/product/${productId}/warehouse/${warehouseId}`);
      return response.data.data;
    },
    enabled: !!productId && !!warehouseId,
  });

  React.useEffect(() => {
    if (open) {
      form.resetFields();
      setProductId(undefined);
      setProductText('');
      setProductKeyword('');
      setProductError('');
    }
  }, [open, form]);

  const handleOk = async () => {
    if (!productId) {
      setProductError('请输入关键字检索并选择产品');
      return;
    }
    let values: any;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    onSubmit({
      productId: Number(productId),
      warehouseId: Number(values.warehouseId),
      adjustmentType: values.adjustmentType,
      quantity: Number(values.quantity),
      reason: values.reason,
      remark: values.remark || '',
    });
  };



  return (
    <Modal
      title={
        <Space>
          <DatabaseOutlined />
          库存调整
        </Space>
      }
      open={open}
      onCancel={onClose}
      width={800}
      footer={[
        <Button key="back" onClick={onClose}>
          取消
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={loading}
          onClick={handleOk}
        >
          确认调整
        </Button>,
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ adjustmentType: 'increase', quantity: 1 }}
      >
        <Form.Item
          label="产品"
          required
          validateStatus={productError ? 'error' : ''}
          help={productError || '输入名称 / 设备来源 / 序列号 / 型号检索'}
        >
          <AutoComplete
            style={{ width: '100%' }}
            value={productText}
            disabled={loading}
            allowClear
            placeholder="输入名称 / 设备来源 / 序列号 / 型号检索"
            options={filterProducts(products, productKeyword).map((p: any) => ({
              value: `${p.name}（${p.sku || '-'}）`,
              productId: p.id,
              label: productOptionLabel(p),
            }))}
            onSearch={(kw) => {
              setProductKeyword(kw);
              if (productId) setProductId(undefined);
            }}
            onChange={(val) => {
              setProductText(String(val || ''));
              if (!val) {
                setProductId(undefined);
                setProductError('');
              }
            }}
            onSelect={(_val, option: any) => {
              setProductId(Number(option.productId));
              setProductText(String(option.value));
              setProductError('');
            }}
            onClear={() => {
              setProductId(undefined);
              setProductText('');
              setProductError('');
            }}
          />
        </Form.Item>

        <Form.Item
          label="仓库"
          name="warehouseId"
          rules={[{ required: true, message: '请选择仓库' }]}
        >
          <Select placeholder="请选择仓库" loading={loading}>
            {Array.isArray(warehouses) ? warehouses.map((warehouse) => (
              <Option key={warehouse.id} value={warehouse.id}>
                <Space>
                  <DatabaseOutlined />
                  {warehouse.name}
                  <Tag>{warehouse.code}</Tag>
                </Space>
              </Option>
            )) : []}
          </Select>
        </Form.Item>

        {currentStock && (
          <Alert
            message={`当前库存：${currentStock.quantity} ${currentStock.unit || '件'}（可用 ${currentStock.available_quantity ?? currentStock.quantity}）`}
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Form.Item
          label="调整类型"
          name="adjustmentType"
          rules={[{ required: true, message: '请选择调整类型' }]}
        >
          <Select placeholder="请选择调整类型" loading={loading}>
            <Option value="increase">
              <Space>
                <ArrowUpOutlined style={{ color: '#52c41a' }} />
                增加库存
              </Space>
            </Option>
            <Option value="decrease">
              <Space>
                <ArrowDownOutlined style={{ color: '#ff4d4f' }} />
                减少库存
              </Space>
            </Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="调整数量"
          name="quantity"
          rules={[
            { required: true, message: '请输入调整数量' },
            {
              validator: (_, value) => {
                if (value === undefined || value === null || value === '') {
                  return Promise.resolve();
                }
                const num = Number(value);
                if (!(num > 0)) {
                  return Promise.reject(new Error('数量必须大于0'));
                }
                if (adjustmentType === 'decrease' && currentStock) {
                  const available = Number(currentStock.available_quantity ?? currentStock.quantity ?? 0);
                  if (num > available) {
                    return Promise.reject(new Error(`不能大于该仓库当前库存 ${currentStock.quantity} ${currentStock.unit || ''}`));
                  }
                }
                return Promise.resolve();
              }
            }
          ]}
        >
          <InputNumber
            style={{ width: '100%' }}
            min={isCount ? 1 : 0.0001}
            step={isCount ? 1 : 0.0001}
            precision={isCount ? 0 : 4}
            addonAfter={unit}
            placeholder="请输入调整数量"
            disabled={loading}
          />
        </Form.Item>

        <Form.Item
          label="调整原因"
          name="reason"
          rules={[{ required: true, message: '请输入调整原因' }]}
        >
          <Input placeholder="请输入调整原因" disabled={loading} />
        </Form.Item>

        <Form.Item
          label="备注"
          name="remark"
          rules={[{ max: 500, message: '备注最多500字' }]}
        >
          <Input.TextArea rows={3} placeholder="请输入备注（可填写依据、经手人等信息）" disabled={loading} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

interface InventoryTransferDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: TransferFormValues) => void;
  loading?: boolean;
  products: Product[];
  warehouses: Warehouse[];
}

const InventoryTransferDialog: React.FC<InventoryTransferDialogProps> = ({
  open,
  onClose,
  onSubmit,
  loading = false,
  products,
  warehouses,
}) => {
  const [form] = Form.useForm();
  const [productId, setProductId] = useState<number | undefined>(undefined);
  const [productText, setProductText] = useState('');
  const [productKeyword, setProductKeyword] = useState('');
  const [productError, setProductError] = useState('');

  const fromWarehouseId = Form.useWatch('fromWarehouseId', form);

  const selectedProduct = React.useMemo(
    () => (Array.isArray(products) ? products.find((p) => String(p.id) === String(productId)) : undefined),
    [products, productId]
  );
  const isCount = (selectedProduct?.measure_type || 'count') === 'count';
  const unit = selectedProduct?.unit || '件';

  // 源仓库库存（产品 + 源仓库，后端聚合该仓库全部库位/批次）
  const { data: sourceStock } = useQuery({
    queryKey: ['inventory', 'stock', productId, fromWarehouseId],
    queryFn: async () => {
      const response = await api.get(`/inventory/product/${productId}/warehouse/${fromWarehouseId}`);
      return response.data.data;
    },
    enabled: !!productId && !!fromWarehouseId,
  });

  React.useEffect(() => {
    if (open) {
      form.resetFields();
      setProductId(undefined);
      setProductText('');
      setProductKeyword('');
      setProductError('');
    }
  }, [open, form]);

  const handleOk = async () => {
    if (!productId) {
      setProductError('请输入关键字检索并选择产品');
      return;
    }
    let values: any;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    onSubmit({
      productId: Number(productId),
      fromWarehouseId: Number(values.fromWarehouseId),
      toWarehouseId: Number(values.toWarehouseId),
      quantity: Number(values.quantity),
      reason: values.reason,
      remark: values.remark || '',
    });
  };

  // 过滤目标仓库（不能选择源仓库）
  const availableToWarehouses = Array.isArray(warehouses) ? warehouses.filter(
    (warehouse) => String(warehouse.id) !== String(fromWarehouseId)
  ) : [];

  return (
    <Modal
      title={
        <Space>
          <SwapOutlined />
          库存转移
        </Space>
      }
      open={open}
      onCancel={onClose}
      width={800}
      footer={[
        <Button key="back" onClick={onClose}>
          取消
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={loading}
          onClick={handleOk}
        >
          确认转移
        </Button>,
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ quantity: 1 }}
      >
        <Form.Item
          label="产品"
          required
          validateStatus={productError ? 'error' : ''}
          help={productError || '输入名称 / 设备来源 / 序列号 / 型号检索'}
        >
          <AutoComplete
            style={{ width: '100%' }}
            value={productText}
            disabled={loading}
            allowClear
            placeholder="输入名称 / 设备来源 / 序列号 / 型号检索"
            options={filterProducts(products, productKeyword).map((p: any) => ({
              value: `${p.name}（${p.sku || '-'}）`,
              productId: p.id,
              label: productOptionLabel(p),
            }))}
            onSearch={(kw) => {
              setProductKeyword(kw);
              if (productId) setProductId(undefined);
            }}
            onChange={(val) => {
              setProductText(String(val || ''));
              if (!val) {
                setProductId(undefined);
                setProductError('');
              }
            }}
            onSelect={(_val, option: any) => {
              setProductId(Number(option.productId));
              setProductText(String(option.value));
              setProductError('');
            }}
            onClear={() => {
              setProductId(undefined);
              setProductText('');
              setProductError('');
            }}
          />
        </Form.Item>

        <Form.Item
          label="源仓库"
          name="fromWarehouseId"
          rules={[{ required: true, message: '请选择源仓库' }]}
        >
          <Select
            placeholder="请选择源仓库"
            loading={loading}
            onChange={() => form.setFieldValue('toWarehouseId', undefined)}
          >
            {Array.isArray(warehouses) ? warehouses.map((warehouse) => (
              <Option key={warehouse.id} value={warehouse.id}>
                <Space>
                  <DatabaseOutlined />
                  {warehouse.name}
                  <Tag>{warehouse.code}</Tag>
                </Space>
              </Option>
            )) : []}
          </Select>
        </Form.Item>

        <Form.Item
          label="目标仓库"
          name="toWarehouseId"
          rules={[{ required: true, message: '请选择目标仓库' }]}
        >
          <Select placeholder="请选择目标仓库" loading={loading}>
            {Array.isArray(availableToWarehouses) ? availableToWarehouses.map((warehouse) => (
              <Option key={warehouse.id} value={warehouse.id}>
                <Space>
                  <DatabaseOutlined />
                  {warehouse.name}
                  <Tag>{warehouse.code}</Tag>
                </Space>
              </Option>
            )) : []}
          </Select>
        </Form.Item>

        {sourceStock && (
          <Alert
            message={`源仓库库存：${sourceStock.quantity} ${sourceStock.unit || '件'}（可用 ${sourceStock.available_quantity ?? sourceStock.quantity}）`}
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Form.Item
          label="转移数量"
          name="quantity"
          rules={[
            { required: true, message: '请输入转移数量' },
            {
              validator: (_, value) => {
                if (value === undefined || value === null || value === '') {
                  return Promise.resolve();
                }
                const num = Number(value);
                if (!(num > 0)) {
                  return Promise.reject(new Error('数量必须大于0'));
                }
                if (sourceStock) {
                  const available = Number(sourceStock.available_quantity ?? sourceStock.quantity ?? 0);
                  if (num > available) {
                    return Promise.reject(new Error(`不能大于源仓库当前库存 ${sourceStock.quantity} ${sourceStock.unit || ''}`));
                  }
                }
                return Promise.resolve();
              }
            }
          ]}
        >
          <InputNumber
            style={{ width: '100%' }}
            min={isCount ? 1 : 0.0001}
            step={isCount ? 1 : 0.0001}
            precision={isCount ? 0 : 4}
            addonAfter={unit}
            placeholder="请输入转移数量"
            disabled={loading}
          />
        </Form.Item>

        <Form.Item
          label="转移原因"
          name="reason"
          rules={[{ required: true, message: '请输入转移原因' }]}
        >
          <Input placeholder="请输入转移原因" disabled={loading} />
        </Form.Item>

        <Form.Item
          label="备注"
          name="remark"
          rules={[{ max: 500, message: '备注最多500字' }]}
        >
          <Input.TextArea rows={3} placeholder="请输入备注（可填写依据、经手人等信息）" disabled={loading} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

const InventoryPage: React.FC = () => {
  const [tabValue, setTabValue] = useState('1');
  const [search, setSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);

  const queryClient = useQueryClient();

  // 构建查询参数
  const queryParams: InventoryQueryParams = {
    page,
    pageSize: pageSize,
    limit: pageSize,
    search,
    warehouseId: warehouseFilter || undefined,
    categoryId: categoryFilter || undefined,
    stockStatus: stockStatusFilter || undefined,
  };

  // 获取库存列表
  const { data: inventoryData, isLoading } = useQuery({
    queryKey: ['inventory', 'list', queryParams],
    queryFn: async () => {
      const response = await api.get<{
        list: InventoryItem[];
        pagination: {
          total: number;
          page: number;
          limit: number;
        };
      }>('/inventory', { params: queryParams });
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

  // 库存调整
  const adjustmentMutation = useMutation({
    mutationFn: async (data: InventoryAdjustmentRequest) => {
      const response = await api.post('/inventory/adjustment', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setAdjustmentDialogOpen(false);
      message.success('库存调整成功');
    },
    onError: () => {
      message.error('库存调整失败');
    }
  });

  // 库存转移
  const transferMutation = useMutation({
    mutationFn: async (data: InventoryTransferRequest) => {
      const response = await api.post('/inventory/transfer', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setTransferDialogOpen(false);
      message.success('库存转移成功');
    },
    onError: () => {
      message.error('库存转移失败');
    }
  });

  const handleTabChange = (key: string) => {
    setTabValue(key);
  };

  const handlePageChange = (newPage: number, newPageSize: number) => {
    setPage(newPage);
    setPageSize(newPageSize);
  };

  const handleAdjustmentSubmit = (data: AdjustmentFormData) => {
    adjustmentMutation.mutate(data);
  };

  const handleTransferSubmit = (data: TransferFormData) => {
    transferMutation.mutate(data);
  };



  const inventoryItems = inventoryData?.list || [];
  const total = inventoryData?.pagination?.total || 0;

  const columns = [
    {
      title: '产品信息',
      dataIndex: 'product',
      key: 'product',
      render: (product: Product) => (
        <div>
          <Text strong>{product?.name}</Text>
          <br />
          <Text type="secondary">SKU: {product?.sku}</Text>
        </div>
      ),
    },
    {
      title: '仓库',
      dataIndex: 'warehouse_id',
      key: 'warehouse',
      render: (_: unknown, record: any) => {
        const warehouseId = record.warehouse_id ?? record.warehouseId;
        const warehouse = Array.isArray(warehousesData)
          ? warehousesData.find((w: any) => String(w.id) === String(warehouseId))
          : undefined;
        return (
          <Space>
            <DatabaseOutlined />
            <Text>{warehouse?.name || '-'}</Text>
          </Space>
        );
      },
    },
    {
      title: '当前库存',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'right' as const,
      render: (quantity: number, record: InventoryItem) => (
        <Text strong>{quantity} {record.product?.unit || '件'}</Text>
      ),
    },

    {
      title: '库存状态',
      key: 'status',
      render: (record: InventoryItem) => (
        <Tag
          color={record.quantity <= 10 ? 'red' : record.quantity <= 50 ? 'orange' : 'green'}
          icon={
            record.quantity <= 10 ? (
              <WarningOutlined />
            ) : record.quantity <= 50 ? (
                <InfoCircleOutlined />
             ) : (
                <CheckCircleOutlined />
            )
          }
        >
          {record.quantity <= 10 ? '库存不足' : record.quantity <= 50 ? '库存偏低' : '库存充足'}
        </Tag>
      ),
    },
    {
      title: '最后更新',
      dataIndex: 'updated_at',
      key: 'updated_at',
      render: (updatedAt: string) => (
        <Text type="secondary">
          {updatedAt && !Number.isNaN(new Date(updatedAt).getTime())
            ? new Date(updatedAt).toLocaleString()
            : '-'}
        </Text>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="库存管理" sub="实时库存查询、调整与移库" />

      {/* 标签页 */}
      <Card>
        <Tabs
          activeKey={tabValue}
          onChange={handleTabChange}
          items={[
            {
              key: '1',
              label: '库存查询',
              children: (
                <>
            {/* 搜索和过滤 */}
            <div style={{ marginBottom: 16 }}>
              <Space size="large" wrap>
                <Input
                  placeholder="搜索产品..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  prefix={<SearchOutlined />}
                  style={{ width: 300 }}
                />
                <Select
                  placeholder="仓库"
                  value={warehouseFilter}
                  onChange={setWarehouseFilter}
                  style={{ width: 200 }}
                >
                  <Option value="">全部仓库</Option>
                  {Array.isArray(warehousesData) ? warehousesData.map((warehouse) => (
                    <Option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </Option>
                  )) : []}
                </Select>
                <Select
                  placeholder="库存状态"
                  value={stockStatusFilter}
                  onChange={setStockStatusFilter}
                  style={{ width: 200 }}
                >
                  <Option value="">全部状态</Option>
                  <Option value="normal">正常</Option>
                  <Option value="low">库存不足</Option>
                  <Option value="high">库存过多</Option>
                </Select>
                <Button
                  icon={<SyncOutlined />}
                  onClick={() => {
                    setSearch('');
                    setWarehouseFilter('');
                    setCategoryFilter('');
                    setStockStatusFilter('');
                  }}
                >
                  重置
                </Button>
                <Space>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setAdjustmentDialogOpen(true)}
                  >
                    库存调整
                  </Button>
                  <Button
                    icon={<SwapOutlined />}
                    onClick={() => setTransferDialogOpen(true)}
                  >
                    库存转移
                  </Button>
                </Space>
              </Space>
            </div>

            {/* 库存列表 */}
            <Table
              columns={columns}
              dataSource={inventoryItems}
              rowKey={(record: any) =>
                `${record.product_id ?? record.productId ?? 'x'}-${record.warehouse_id ?? record.warehouseId ?? 'x'}-${record.location_id ?? record.locationId ?? 'x'}-${record.batch_number ?? ''}`
              }
              loading={isLoading}
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
                    <Text type="secondary">暂无库存数据</Text>
                  </div>
                )
              }}
            />
                </>
              ),
            },
            {
              key: '2',
              label: '库存调整',
              children: (
                <>
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <DatabaseOutlined style={{ fontSize: 64, color: '#bfbfbf', marginBottom: 16 }} />
              <Title level={4}>库存调整</Title>
              <Text type="secondary" style={{ marginBottom: 24 }}>
                点击下方按钮进行库存调整操作
              </Text>
              <br />
              <Button
                type="primary"
                size="large"
                icon={<PlusOutlined />}
                onClick={() => setAdjustmentDialogOpen(true)}
              >
                开始调整
              </Button>
            </div>
                </>
              ),
            },
            {
              key: '3',
              label: '库存转移',
              children: (
                <>
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <SwapOutlined style={{ fontSize: 64, color: '#bfbfbf', marginBottom: 16 }} />
              <Title level={4}>库存转移</Title>
              <Text type="secondary" style={{ marginBottom: 24 }}>
                在不同仓库之间转移库存
              </Text>
              <br />
              <Button
                type="primary"
                size="large"
                icon={<SwapOutlined />}
                onClick={() => setTransferDialogOpen(true)}
              >
                开始转移
              </Button>
            </div>
                </>
              ),
            },
          ]}
        />
      </Card>

      {/* 库存调整对话框 */}
      <InventoryAdjustmentDialog
        open={adjustmentDialogOpen}
        onClose={() => setAdjustmentDialogOpen(false)}
        onSubmit={handleAdjustmentSubmit}
        loading={adjustmentMutation.isPending}
      />

      {/* 库存转移对话框 */}
      <InventoryTransferDialog
        open={transferDialogOpen}
        onClose={() => setTransferDialogOpen(false)}
        onSubmit={handleTransferSubmit}
        loading={transferMutation.isPending}
      />
    </div>
  );
};

export default InventoryPage;
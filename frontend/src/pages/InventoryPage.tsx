import React, { useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import { InfoCircleOutlined } from '@ant-design/icons';
import {
  Card,
  Typography,
  Button,
  Input,
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
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { queryKeys } from '../utils/queryClient';
import { api } from '../services/api';
import type {
  InventoryItem,
  Warehouse,
  Product,
  InventoryAdjustmentRequest,
  InventoryTransferRequest,
  InventoryQueryParams,
} from '../types/api';

const { Title, Text } = Typography;
const { Option } = Select;

// 库存调整表单验证
const adjustmentSchema = z.object({
  productId: z.string().min(1, '请选择产品'),
  warehouseId: z.string().min(1, '请选择仓库'),
  adjustmentType: z.enum(['increase', 'decrease'], { message: '请选择调整类型' }),
  quantity: z.number().min(1, '数量必须大于0'),
  reason: z.string().min(1, '请输入调整原因'),
  remark: z.string().optional(),
});

// 库存转移表单验证
const transferSchema = z.object({
  productId: z.string().min(1, '请选择产品'),
  fromWarehouseId: z.string().min(1, '请选择源仓库'),
  toWarehouseId: z.string().min(1, '请选择目标仓库'),
  quantity: z.number().min(1, '数量必须大于0'),
  reason: z.string().min(1, '请输入转移原因'),
  remark: z.string().optional(),
});

type AdjustmentFormData = z.infer<typeof adjustmentSchema>;
type TransferFormData = z.infer<typeof transferSchema>;

interface InventoryAdjustmentDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: AdjustmentFormData) => void;
  loading?: boolean;
}

const InventoryAdjustmentDialog: React.FC<InventoryAdjustmentDialogProps> = ({
  open,
  onClose,
  onSubmit,
  loading = false,
}) => {
  const [form] = Form.useForm();
  const {
    handleSubmit,
    reset,
  } = useForm<AdjustmentFormData>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: {
      productId: '',
      warehouseId: '',
      adjustmentType: 'increase',
      quantity: 1,
      reason: '',
      remark: '',
    },
  });

  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  
  // 监听表单值变化
  React.useEffect(() => {
    // 使用 Ant Design Form 的 onValuesChange 来监听变化
    // 这里暂时注释掉，因为 Ant Design Form 没有 watch 方法
    // const subscription = form.watch((value) => {
    //   if (value.productId) setSelectedProductId(value.productId);
    //   if (value.warehouseId) setSelectedWarehouseId(value.warehouseId);
    // });
    // return () => subscription.unsubscribe();
  }, [form]);

  // 获取产品列表
  const { data: productsData } = useQuery({
    queryKey: queryKeys.products.all,
    queryFn: async () => {
      const response = await api.get<Product[]>('/products');
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

  // 获取当前库存
  const { data: currentStock } = useQuery({
    queryKey: ['inventory', 'current', selectedProductId, selectedWarehouseId],
    queryFn: async () => {
      if (!selectedProductId || !selectedWarehouseId) return null;
      const response = await api.get<InventoryItem>(
        `/inventory/${selectedProductId}/${selectedWarehouseId}`
      );
      return response.data.data;
    },
    enabled: !!selectedProductId && !!selectedWarehouseId,
  });

  React.useEffect(() => {
    if (open) {
      reset();
      form.resetFields();
    }
  }, [open, reset, form]);



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
          onClick={() => {
            form.validateFields().then(values => {
              handleSubmit(onSubmit)(values);
            });
          }}
        >
          确认调整
        </Button>,
      ]}
    >
      <Form
        form={form}
        layout="vertical"
      >
        <Form.Item
          label="产品"
          name="productId"
          rules={[{ required: true, message: '请选择产品' }]}
        >
          <Select placeholder="请选择产品" loading={loading}>
            {Array.isArray(productsData) ? productsData.map((product) => (
              <Option key={product.id} value={product.id}>
                <Space>
                  {product.name}
                  <Tag>{product.sku}</Tag>
                </Space>
              </Option>
            )) : []}
          </Select>
        </Form.Item>

        <Form.Item
          label="仓库"
          name="warehouseId"
          rules={[{ required: true, message: '请选择仓库' }]}
        >
          <Select placeholder="请选择仓库" loading={loading}>
            {Array.isArray(warehousesData) ? warehousesData.map((warehouse) => (
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
            message={`当前库存：${currentStock.quantity} ${currentStock.product?.unit || '件'}`}
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
            { type: 'number', min: 1, message: '数量必须大于0' }
          ]}
        >
          <Input type="number" placeholder="请输入调整数量" disabled={loading} />
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
        >
          <Input.TextArea rows={3} placeholder="请输入备注" disabled={loading} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

interface InventoryTransferDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: TransferFormData) => void;
  loading?: boolean;
}

const InventoryTransferDialog: React.FC<InventoryTransferDialogProps> = ({
  open,
  onClose,
  onSubmit,
  loading = false,
}) => {
  const [form] = Form.useForm();
  const {
    handleSubmit,
    reset,
    watch,
  } = useForm<TransferFormData>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      productId: '',
      fromWarehouseId: '',
      toWarehouseId: '',
      quantity: 1,
      reason: '',
      remark: '',
    },
  });

  const selectedProductId = watch('productId');
  const selectedFromWarehouseId = watch('fromWarehouseId');

  // 获取产品列表
  const { data: productsData } = useQuery({
    queryKey: queryKeys.products.all,
    queryFn: async () => {
        const response = await api.get<Product[]>('/products');
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

  // 获取源仓库库存
  const { data: sourceStock } = useQuery({
    queryKey: ['inventory', 'source', selectedProductId, selectedFromWarehouseId],
    queryFn: async () => {
      if (!selectedProductId || !selectedFromWarehouseId) return null;
      const response = await api.get<InventoryItem>(
        `/inventory/${selectedProductId}/${selectedFromWarehouseId}`
      );
      return response.data.data;
    },
    enabled: !!selectedProductId && !!selectedFromWarehouseId,
  });

  React.useEffect(() => {
    if (open) {
      reset();
      form.resetFields();
    }
  }, [open, reset, form]);



  // 过滤目标仓库（不能选择源仓库）
  const availableToWarehouses = Array.isArray(warehousesData) ? warehousesData.filter(
    (warehouse) => warehouse.id !== selectedFromWarehouseId
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
          onClick={() => {
            form.validateFields().then(values => {
              handleSubmit(onSubmit)(values);
            });
          }}
        >
          确认转移
        </Button>,
      ]}
    >
      <Form
        form={form}
        layout="vertical"
      >
        <Form.Item
          label="产品"
          name="productId"
          rules={[{ required: true, message: '请选择产品' }]}
        >
          <Select placeholder="请选择产品" loading={loading}>
            {Array.isArray(productsData) ? productsData.map((product) => (
              <Option key={product.id} value={product.id}>
                <Space>
                  {product.name}
                  <Tag>{product.sku}</Tag>
                </Space>
              </Option>
            )) : []}
          </Select>
        </Form.Item>

        <Form.Item
          label="源仓库"
          name="fromWarehouseId"
          rules={[{ required: true, message: '请选择源仓库' }]}
        >
          <Select placeholder="请选择源仓库" loading={loading}>
            {Array.isArray(warehousesData) ? warehousesData.map((warehouse) => (
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
            message={`源仓库库存：${sourceStock.quantity} ${sourceStock.product?.unit || '件'}`}
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
            { type: 'number', min: 1, message: '数量必须大于0' }
          ]}
        >
          <Input 
            type="number" 
            placeholder="请输入转移数量" 
            disabled={loading}
            max={sourceStock?.quantity}
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
        >
          <Input.TextArea rows={3} placeholder="请输入备注" disabled={loading} />
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
      dataIndex: 'warehouse',
      key: 'warehouse',
      render: (warehouse: Warehouse) => (
        <Space>
          <DatabaseOutlined />
          <Text>{warehouse?.name}</Text>
        </Space>
      ),
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
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (updatedAt: string) => (
        <Text type="secondary">{new Date(updatedAt).toLocaleDateString()}</Text>
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
              rowKey={(record) => `${record.productId}-${record.warehouseId}`}
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
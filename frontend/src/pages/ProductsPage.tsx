import React, { useState } from 'react';
import { getDictionaryItemsByTypeCode } from '../services/dictionaryService';
import PageHeader from '../components/ui/PageHeader';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  Typography,
  Button,
  Input,
  Select,
  Table,
  Modal,
  Form,
  Row,
  Col,
  Space,
  Tag,
  Pagination,
  message,
  Spin,
  Alert
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  FilterOutlined,
  QrcodeOutlined,
  ShopOutlined
} from '@ant-design/icons';
import { queryKeys } from '../utils/queryClient';
import { api } from '../services/api';
import type { Product, Category as CategoryType, CreateProductRequest, UpdateProductRequest, PaginatedResponse } from '../types/api';

const { Title } = Typography;
const { Option } = Select;

// 表单验证模式
const productSchema = z.object({
  sku: z.string().min(1, '请输入SKU').max(50, 'SKU不能超过50个字符'),
  name: z.string().min(1, '请输入产品名称').max(100, '名称不能超过100个字符'),
  description: z.string().optional(),
  deviceType: z.string().optional(),
  modelNumber: z.string().optional(),
  frequencyProtocol: z.string().optional(),
  firmwareVersion: z.string().optional(),
  categoryId: z.string().min(1, '请选择分类'),
  unit: z.string().min(1, '请选择计量单位').max(20, '单位不能超过20个字符'),
  // A1：计量方式决定数量精度与是否需要序列号
  measureType: z.enum(['count', 'length', 'weight', 'area', 'volume']).default('count'),
  unitPrice: z.number().min(0, '单价不能为负数'),
  minStock: z.number().min(0, '最小库存不能为负数'),
  maxStock: z.number().min(0, '最大库存不能为负数'),
  barcode: z.string().optional(),
  projectId: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

// P8 A1 计量方式
const MEASURE_TYPES = [
  { value: 'count', label: '计件（件/个/台/套）' },
  { value: 'length', label: '长度（米）' },
  { value: 'weight', label: '重量（吨/千克）' },
  { value: 'area', label: '面积（平方米）' },
  { value: 'volume', label: '体积' },
];

// P8 A2 单位字典兜底（字典可后台维护）
const UNIT_FALLBACK = ['件', '个', '台', '套', '米', '吨', '千克', '平方米', '卷', '盘', '对', '箱', '只', '组', '条', '根', '副'];

interface ProductDialogProps {
  open: boolean;
  product?: Product;
  onClose: () => void;
  onSubmit: (data: ProductFormData) => void;
  loading?: boolean;
}

const ProductDialog: React.FC<ProductDialogProps> = ({
  open,
  product,
  onClose,
  onSubmit,
  loading = false,
}) => {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
    watch,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      sku: product?.sku || '',
      name: product?.name || '',
      description: product?.description || '',
      categoryId: product?.category_id || '',
      unit: product?.unit || '',
      measureType: (product?.measure_type as any) || 'count',
      unitPrice: product?.price || 0,
      minStock: product?.min_stock || 0,
      maxStock: product?.max_stock || 0,
      barcode: product?.barcode || '',
    },
  });

  const minStock = watch('minStock');
  const watchMeasureType = watch('measureType');

  // 获取计量单位字典（A2：字典可后台维护，失败时用内置兜底）
  const { data: unitDictData } = useQuery({
    queryKey: ['dictionary', 'items', 'unit'],
    queryFn: async () => {
      const response = await getDictionaryItemsByTypeCode('unit');
      return Array.isArray(response?.data) ? response.data : [];
    },
    retry: false,
  });
  const unitOptions = React.useMemo(() => {
    const fromDict = Array.isArray(unitDictData)
      ? unitDictData
          .filter((item: any) => item.status !== 'inactive')
          .map((item: any) => ({ value: item.name, label: item.name }))
      : [];
    const merged = [...fromDict];
    UNIT_FALLBACK.forEach((u) => {
      if (!merged.some((m) => m.value === u)) merged.push({ value: u, label: u });
    });
    return merged;
  }, [unitDictData]);

  // 获取分类列表
  const { data: categoriesData } = useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: async () => {
      const response = await api.get<CategoryType[]>('/categories');
      return response.data.data;
    },
  });
  
  // 获取项目列表
  const { data: projectsData } = useQuery({
    queryKey: queryKeys.projects?.all,
    queryFn: async () => {
      const response = await api.get('/projects');
      return response.data.data;
    },
    enabled: !!queryKeys.projects,
  });

  React.useEffect(() => {
    if (open) {
      reset({
        sku: product?.sku || '',
        name: product?.name || '',
        description: product?.description || '',
        deviceType: product?.device_type || '',
        modelNumber: product?.model_number || '',
        frequencyProtocol: product?.frequency_protocol || '',
        firmwareVersion: product?.firmware_version || '',
        categoryId: product?.category_id || '',
        unit: product?.unit || '',
        measureType: (product?.measure_type as any) || 'count',
        unitPrice: product?.price || 0,
        minStock: product?.min_stock || 0,
        maxStock: product?.max_stock || 0,
        barcode: product?.barcode || '',
        projectId: product?.project_id || '',
      });
    }
  }, [open, product, reset]);

  const handleFormSubmit = (data: ProductFormData) => {
    onSubmit(data);
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShopOutlined />
          {product ? '编辑产品' : '新增产品'}
        </div>
      }
      open={open}
      onCancel={onClose}
      width={800}
      footer={[
        <Button key="cancel" onClick={onClose} disabled={loading}>
          取消
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={loading}
          onClick={handleSubmit(handleFormSubmit)}
        >
          保存
        </Button>
      ]}
    >
      <Form layout="vertical" style={{ marginTop: 16 }}>
        <Row gutter={16}>
          <Col span={12}>
              <Form.Item
                label="SKU"
                required
                validateStatus={errors.sku ? 'error' : ''}
                help={errors.sku?.message}
              >
                <Controller
                  name="sku"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      disabled={loading}
                    />
                  )}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="产品名称"
                required
                validateStatus={errors.name ? 'error' : ''}
                help={errors.name?.message}
              >
                <Controller
                  name="name"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      disabled={loading}
                    />
                  )}
                />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                label="描述"
                validateStatus={errors.description ? 'error' : ''}
                help={errors.description?.message}
              >
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <Input.TextArea
                      {...field}
                      rows={3}
                      disabled={loading}
                    />
                  )}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="设备类型"
                validateStatus={errors.deviceType ? 'error' : ''}
                help={errors.deviceType?.message}
              >
                <Controller
                  name="deviceType"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      placeholder="如：基站、路由器、光模块"
                      disabled={loading}
                    />
                  )}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="型号"
                validateStatus={errors.modelNumber ? 'error' : ''}
                help={errors.modelNumber?.message}
              >
                <Controller
                  name="modelNumber"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      placeholder="如：HUAWEI MA5683T"
                      disabled={loading}
                    />
                  )}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="频段/协议"
                validateStatus={errors.frequencyProtocol ? 'error' : ''}
                help={errors.frequencyProtocol?.message}
              >
                <Controller
                  name="frequencyProtocol"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      placeholder="如：5G 700MHz, WiFi 6"
                      disabled={loading}
                    />
                  )}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="固件版本"
                validateStatus={errors.firmwareVersion ? 'error' : ''}
                help={errors.firmwareVersion?.message}
              >
                <Controller
                  name="firmwareVersion"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      disabled={loading}
                    />
                  )}
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                label="计量单位"
                validateStatus={errors.unit ? 'error' : ''}
                help={errors.unit?.message}
                required
              >
                <Controller
                  name="unit"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      placeholder="请选择计量单位（可在字典管理维护）"
                      disabled={loading}
                      showSearch
                      optionFilterProp="children"
                    >
                      {unitOptions.map((item: any) => (
                        <Option key={item.value} value={item.value}>{item.label}</Option>
                      ))}
                    </Select>
                  )}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="计量方式"
                validateStatus={errors.measureType ? 'error' : ''}
                help={errors.measureType?.message
                  || (watchMeasureType === 'count'
                    ? '计件：数量为正整数，需录序列号'
                    : '非计件：数量可保留 4 位小数，无需序列号')}
                required
              >
                <Controller
                  name="measureType"
                  control={control}
                  render={({ field }) => (
                    <Select {...field} placeholder="请选择计量方式" disabled={loading}>
                      {MEASURE_TYPES.map((m) => (
                        <Option key={m.value} value={m.value}>{m.label}</Option>
                      ))}
                    </Select>
                  )}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="分类"
                validateStatus={errors.categoryId ? 'error' : ''}
                help={errors.categoryId?.message}
                required
              >
                <Controller
                  name="categoryId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      placeholder="请选择分类"
                      disabled={loading}
                    >
                      {Array.isArray(categoriesData) ? categoriesData.map((category) => (
                        <Option key={category.id} value={category.id}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <FilterOutlined />
                            {category.name}
                          </div>
                        </Option>
                      )) : []}
                    </Select>
                  )}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="单价"
                validateStatus={errors.unitPrice ? 'error' : ''}
                help={errors.unitPrice?.message}
                required
              >
                <Controller
                  name="unitPrice"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      type="number"
                      prefix="¥"
                      placeholder="0.00"
                      disabled={loading}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  )}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="条形码"
                validateStatus={errors.barcode ? 'error' : ''}
                help={errors.barcode?.message}
              >
                <Controller
                  name="barcode"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      prefix={<QrcodeOutlined />}
                      placeholder="请输入条形码"
                      disabled={loading}
                    />
                  )}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="所属项目"
                validateStatus={errors.projectId ? 'error' : ''}
                help={errors.projectId?.message}
              >
                <Controller
                  name="projectId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      placeholder="请选择所属项目"
                      disabled={loading || !projectsData}
                      allowClear
                    >
                      <Option value="">无</Option>
                      {Array.isArray(projectsData) ? projectsData.map((project) => (
                        <Option key={project.id} value={project.id}>
                          {project.name} ({project.projectCode})
                        </Option>
                      )) : []}
                    </Select>
                  )}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
    </Modal>
  );
};

const ProductsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | undefined>();

  const queryClient = useQueryClient();

  // 获取产品列表
  const { data: productsData, isLoading } = useQuery({
    queryKey: queryKeys.products.list({ page: currentPage, limit: pageSize, search: searchTerm, categoryId: selectedCategory }),
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(selectedCategory && { categoryId: selectedCategory }),
      });
      const response = await api.get<{
        list: Product[];
        pagination: { total: number; page: number; limit: number };
      }>(`/products?${params}`);
      return response.data.data;
    },
  });

  // 获取分类列表
  const { data: categoriesData } = useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: async () => {
      const response = await api.get<CategoryType[]>('/categories');
      return response.data.data;
    },
  });

  // 创建产品
  const createMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const response = await api.post<Product>('/products', data);
      return response.data;
    },
    onSuccess: () => {
      message.success('产品创建成功');
      setDialogOpen(false);
      setSelectedProduct(undefined);
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '创建失败');
    },
  });

  // 更新产品
  const updateMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      if (!selectedProduct) throw new Error('No product selected');
      const response = await api.put<Product>(`/products/${selectedProduct.id}`, data);
      return response.data;
    },
    onSuccess: () => {
      message.success('产品更新成功');
      setDialogOpen(false);
      setSelectedProduct(undefined);
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '更新失败');
    },
  });

  // 删除产品
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/products/${id}`);
    },
    onSuccess: () => {
      message.success('产品删除成功');
      setDeleteDialogOpen(false);
      setProductToDelete(undefined);
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '删除失败');
    },
  });

  const handleSubmit = (data: ProductFormData) => {
    // 后端接口字段为 snake_case（category_id / min_stock / device_type ...）
    const payload: Record<string, any> = {
      sku: data.sku,
      name: data.name,
      description: data.description || '',
      device_type: data.deviceType || null,
      model_number: data.modelNumber || null,
      frequency_protocol: data.frequencyProtocol || null,
      firmware_version: data.firmwareVersion || null,
      category_id: data.categoryId,
      unit: data.unit,
      measure_type: data.measureType || 'count',   // A1
      price: data.unitPrice ?? 0,
      min_stock: data.minStock ?? 0,
      max_stock: data.maxStock ?? 0,
      barcode: data.barcode || null,
      status: 'active',
      ...(data.projectId ? { project_id: Number(data.projectId) } : {}),
    };

    if (selectedProduct) {
      updateMutation.mutate(payload as any);
    } else {
      createMutation.mutate(payload as any);
    }
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setDialogOpen(true);
  };

  const handleDelete = (product: Product) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (productToDelete) {
      deleteMutation.mutate(productToDelete.id);
    }
  };

  const columns = [
    {
      title: 'SKU',
      dataIndex: 'sku',
      key: 'sku',
      width: 120,
    },
    {
      title: '产品名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: '分类',
      dataIndex: 'category_name',
      key: 'category_name',
      width: 120,
    },
    {
      title: '单位',
      dataIndex: 'unit',
      key: 'unit',
      width: 80,
    },
    {
      title: '单价',
      dataIndex: 'price',
      key: 'price',
      width: 100,
      render: (price: number) => `¥${(price || 0).toFixed(2)}`,
    },
    {
      title: '库存范围',
      key: 'stockRange',
      width: 120,
      render: (_: any, record: Product) => `${record.min_stock}-${record.max_stock}`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status === 'active' ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_: any, record: Product) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="产品管理"
        sub="商品主数据、SKU 编码与库存阈值维护"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setSelectedProduct(undefined);
              setDialogOpen(true);
            }}
          >
            新增产品
          </Button>
        }
      />
      <Card>

        <div style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Input
                placeholder="搜索产品名称、SKU或条码"
                prefix={<SearchOutlined />}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                allowClear
              />
            </Col>
            <Col span={6}>
              <Select
                placeholder="选择分类"
                value={selectedCategory}
                onChange={setSelectedCategory}
                allowClear
                style={{ width: '100%' }}
              >
                {Array.isArray(categoriesData) ? categoriesData.map((category) => (
                  <Option key={category.id} value={category.id}>
                    {category.name}
                  </Option>
                )) : []}
              </Select>
            </Col>
          </Row>
        </div>

        <Table
          columns={columns}
          dataSource={Array.isArray(productsData?.list) ? productsData.list : []}
          rowKey="id"
          loading={isLoading}
          pagination={false}
          scroll={{ x: 1000 }}
        />

        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <Pagination
            current={currentPage}
            pageSize={pageSize}
            total={productsData?.pagination?.total || 0}
            showSizeChanger
            showQuickJumper
            showTotal={(total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`}
            onChange={(page, size) => {
              setCurrentPage(page);
              setPageSize(size);
            }}
          />
        </div>
      </Card>

      <ProductDialog
        open={dialogOpen}
        product={selectedProduct}
        onClose={() => {
          setDialogOpen(false);
          setSelectedProduct(undefined);
        }}
        onSubmit={handleSubmit}
        loading={createMutation.isPending || updateMutation.isPending}
      />

      <Modal
        title="确认删除"
        open={deleteDialogOpen}
        onOk={confirmDelete}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setProductToDelete(undefined);
        }}
        okText="确认删除"
        cancelText="取消"
        okButtonProps={{ danger: true, loading: deleteMutation.isPending }}
      >
        <p>确定要删除产品 "{productToDelete?.name}" 吗？此操作不可撤销。</p>
      </Modal>
    </div>
  );
};

export default ProductsPage;
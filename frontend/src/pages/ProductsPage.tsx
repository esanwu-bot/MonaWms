import React, { useState } from 'react';
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
  unit: z.string().min(1, '请输入单位').max(20, '单位不能超过20个字符'),
  unitPrice: z.number().min(0, '单价不能为负数'),
  minStock: z.number().min(0, '最小库存不能为负数'),
  maxStock: z.number().min(0, '最大库存不能为负数'),
  barcode: z.string().optional(),
  projectId: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

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
      unitPrice: product?.price || 0,
      minStock: product?.min_stock || 0,
      maxStock: product?.max_stock || 0,
      barcode: product?.barcode || '',
    },
  });

  const minStock = watch('minStock');

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
                label="单位"
                validateStatus={errors.unit ? 'error' : ''}
                help={errors.unit?.message}
                required
              >
                <Controller
                  name="unit"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      placeholder="如：台、个、套"
                      disabled={loading}
                    />
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
      const response = await api.get<PaginatedResponse<Product>>(`/products?${params}`);
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
    if (selectedProduct) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
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
    <div style={{ padding: 24 }}>
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Row gutter={16} align="middle">
            <Col flex="auto">
              <Title level={2} style={{ margin: 0 }}>
                产品管理
              </Title>
            </Col>
            <Col>
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
            </Col>
          </Row>
        </div>

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
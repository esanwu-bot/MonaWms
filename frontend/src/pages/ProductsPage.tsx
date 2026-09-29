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
  Alert,
  Upload,
  Progress,
  Divider,
  Statistic,
  Cascader
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  FilterOutlined,
  QrcodeOutlined,
  ShopOutlined,
  UploadOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import { queryKeys } from '../utils/queryClient';
import { api } from '../services/api';
import type { Product, Category as CategoryType, CreateProductRequest, UpdateProductRequest, PaginatedResponse } from '../types/api';

const { Title } = Typography;
const { Option } = Select;

// ===== 分类一二级工具（数据源 /categories/tree）=====

/** 在分类树中按 id 查路径（如 ['2','7'] = 通信设备/基站设备），用于 Cascader 回显 */
const findCategoryPath = (tree: CategoryType[], id?: string | number | null): string[] => {
  if (!id) return [];
  const target = String(id);
  for (const node of tree) {
    if (String(node.id) === target) return [String(node.id)];
    const childPath = findCategoryPath(node.children || [], target);
    if (childPath.length) return [String(node.id), ...childPath];
  }
  return [];
};

/** id → 完整分类名路径（如 "通信设备 / 基站设备"），用于列表列显示 */
const categoryFullPath = (tree: CategoryType[], id?: string | number | null): string => {
  const path = findCategoryPath(tree, id);
  if (!path.length) return '';
  const names = path.map((pid) => {
    const node = findNodeById(tree, pid);
    return node?.name || '';
  }).filter(Boolean);
  return names.join(' / ');
};

const findNodeById = (tree: CategoryType[], id: string): CategoryType | undefined => {
  for (const node of tree) {
    if (String(node.id) === id) return node;
    const child = findNodeById(node.children || [], id);
    if (child) return child;
  }
  return undefined;
};

/** 树展平为带层级标记的列表（筛选下拉用），二级加 └─ 前缀 */
const flattenCategoryTree = (tree: CategoryType[], depth = 0): { id: string; label: string; depth: number }[] => {
  const result: { id: string; label: string; depth: number }[] = [];
  tree.forEach((cat) => {
    result.push({ id: String(cat.id), label: cat.name, depth });
    if (cat.children?.length) {
      result.push(...flattenCategoryTree(cat.children, depth + 1));
    }
  });
  return result;
};

// 表单验证模式
const productSchema = z.object({
  sku: z.string().min(1, '请输入SKU').max(50, 'SKU不能超过50个字符'),
  name: z.string().min(1, '请输入产品名称').max(100, '名称不能超过100个字符'),
  description: z.string().optional(),
  deviceType: z.string().optional(),
  modelNumber: z.string().optional(),
  frequencyProtocol: z.string().optional(),
  firmwareVersion: z.string().optional(),
  // 分类为级联路径（一级 → 二级），提交时取末位 id
  categoryPath: z.array(z.string()).min(1, '请选择分类'),
  unit: z.string().min(1, '请选择计量单位').max(20, '单位不能超过20个字符'),
  // A1：计量方式决定数量精度与是否需要序列号；取数据字典 measure_type（可后台维护）
  measureType: z.string().min(1, '请选择计量方式'),
  unitPrice: z.number().min(0, '单价不能为负数'),
  minStock: z.number().min(0, '最小库存不能为负数'),
  maxStock: z.number().min(0, '最大库存不能为负数'),
  barcode: z.string().optional(),
  projectId: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

// P8 A1 计量方式兜底（字典可后台维护，失败时用内置兜底；code 须与后端 Product 常量一致）
const MEASURE_TYPE_FALLBACK = [
  { code: 'count', name: '计件（件/个/台/套）' },
  { code: 'length', name: '长度（米）' },
  { code: 'weight', name: '重量（吨/千克）' },
  { code: 'area', name: '面积（平方米）' },
  { code: 'volume', name: '体积' },
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
      // 回显路径由下方 useEffect（依赖 categoryTree）注入，初值空数组
      categoryPath: [] as string[],
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

  // 获取计量方式字典（A1：字典可后台维护，失败时用内置兜底）
  const { data: measureTypeDictData } = useQuery({
    queryKey: ['dictionary', 'items', 'measure_type'],
    queryFn: async () => {
      const response = await getDictionaryItemsByTypeCode('measure_type');
      return Array.isArray(response?.data) ? response.data : [];
    },
    retry: false,
  });
  const measureTypeOptions = React.useMemo(() => {
    const fromDict = Array.isArray(measureTypeDictData)
      ? measureTypeDictData
          .filter((item: any) => item.status !== 'inactive')
          .map((item: any) => ({ value: item.code, label: item.name }))
      : [];
    // 兜底：count 必须存在（业务逻辑依赖），字典缺失时补齐内置项
    const merged = [...fromDict];
    MEASURE_TYPE_FALLBACK.forEach((m) => {
      if (!merged.some((x) => x.value === m.code)) merged.push({ value: m.code, label: m.name });
    });
    return merged;
  }, [measureTypeDictData]);

  // 获取分类树（一二级级联数据源）
  const { data: categoriesData } = useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: async () => {
      const response = await api.get<CategoryType[]>('/categories/tree');
      return response.data.data;
    },
  });
  const categoryTree = Array.isArray(categoriesData) ? categoriesData : [];

  // Cascader 选项（一级 → 二级）
  const cascaderOptions = React.useMemo(() => {
    return categoryTree.map((top) => ({
      value: String(top.id),
      label: top.name,
      children: (top.children || []).map((child) => ({
        value: String(child.id),
        label: child.name,
      })),
    }));
  }, [categoryTree]);
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
        categoryPath: findCategoryPath(categoryTree, product?.category_id),
        unit: product?.unit || '',
        measureType: (product?.measure_type as any) || 'count',
        unitPrice: product?.price || 0,
        minStock: product?.min_stock || 0,
        maxStock: product?.max_stock || 0,
        barcode: product?.barcode || '',
        projectId: product?.project_id || '',
      });
    }
    // categoryTree 后加载完成时也要重新注入回显路径（Cascader 需要 id → 路径）
  }, [open, product, reset, categoryTree]);

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
                      {measureTypeOptions.map((m) => (
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
                validateStatus={errors.categoryPath ? 'error' : ''}
                help={errors.categoryPath?.message}
                required
              >
                <Controller
                  name="categoryPath"
                  control={control}
                  render={({ field }) => (
                    <Cascader
                      {...field}
                      options={cascaderOptions}
                      placeholder="请选择分类（一级 / 二级）"
                      disabled={loading}
                      changeOnSelect
                    />
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

  // ===== 批量导入（自设备页迁移：下载模板 + Excel 导入）=====
  const [isBatchImportVisible, setIsBatchImportVisible] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle');
  const [importResult, setImportResult] = useState<any>(null);

  const handleBatchImport = () => {
    setIsBatchImportVisible(true);
    setImportStatus('idle');
    setImportProgress(0);
    setImportResult(null);
    setImportFile(null);
  };

  // 生成并下载 Excel 导入模板
  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/products/download-template`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('下载失败');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `产品导入模板_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      message.success('模板下载成功');
    } catch (error) {
      message.error('模板下载失败，请重试');
    }
  };

  // 提交导入
  const handleImportSubmit = async () => {
    if (!importFile) {
      message.error('请选择要导入的文件');
      return;
    }
    setImportStatus('uploading');
    setImportProgress(30);

    const formData = new FormData();
    formData.append('file', importFile);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/products/batch-import`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setImportProgress(70);
      setImportStatus('processing');

      const result = await response.json();
      setImportProgress(100);

      if (response.ok && (result.success || result.code === 200)) {
        setImportStatus('success');
        setImportResult(result.data);
        message.success(`导入成功！成功导入 ${result.data?.success_count ?? 0} 条记录`);
        queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      } else {
        setImportStatus('error');
        setImportResult(result);
        message.error(result.message || '导入失败');
      }
    } catch (error) {
      setImportStatus('error');
      setImportResult({ message: '网络错误，请重试' });
      message.error('导入失败，请重试');
    }
  };

  const resetImportModal = () => {
    setIsBatchImportVisible(false);
    setImportFile(null);
    setImportProgress(0);
    setImportStatus('idle');
    setImportResult(null);
  };

  // 获取产品列表
  const { data: productsData, isLoading } = useQuery({
    queryKey: queryKeys.products.list({ page: currentPage, limit: pageSize, search: searchTerm, categoryId: selectedCategory }),
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        ...(searchTerm && { search: searchTerm }),
        // 后端读 snake_case（category_id），选一级分类时需含其下二级
        ...(selectedCategory && { category_id: selectedCategory }),
      });
      const response = await api.get<{
        list: Product[];
        pagination: { total: number; page: number; limit: number };
      }>(`/products?${params}`);
      return response.data.data;
    },
  });

  // 获取分类树（筛选下拉 + 分类列完整路径显示）
  const { data: categoriesData } = useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: async () => {
      const response = await api.get<CategoryType[]>('/categories/tree');
      return response.data.data;
    },
  });
  const categoryTree = Array.isArray(categoriesData) ? categoriesData : [];

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
      category_id: data.categoryPath[data.categoryPath.length - 1],
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
      key: 'category_name',
      width: 180,
      // 一二级完整路径（如 通信设备 / 基站设备）；树未加载时兜底后端 category_name
      render: (_, record) =>
        categoryFullPath(categoryTree, record.category_id) || record.category_name || '-',
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
      // A3：price 已是 DECIMAL，接口返回 string，必须先转数值
      render: (price: string | number) => `¥${Number(price || 0).toFixed(2)}`,
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
          <Space>
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
            <Button icon={<UploadOutlined />} onClick={handleBatchImport}>
              批量导入
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
              下载模板
            </Button>
          </Space>
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
                placeholder="按分类筛选（一级含二级）"
                value={selectedCategory}
                onChange={setSelectedCategory}
                allowClear
                style={{ width: '100%' }}
              >
                {flattenCategoryTree(categoryTree).map((cat) => (
                  <Option key={cat.id} value={cat.id}>
                    {cat.depth > 0 ? '└─ ' : ''}{cat.label}
                  </Option>
                ))}
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

      {/* 批量导入模态框（自设备页迁移） */}
      <Modal
        title="批量导入产品"
        open={isBatchImportVisible}
        onCancel={resetImportModal}
        width={640}
        footer={[
          <Button key="cancel" onClick={resetImportModal}>
            取消
          </Button>,
          <Button key="download" icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
            下载模板
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={importStatus === 'uploading' || importStatus === 'processing'}
            disabled={!importFile || importStatus === 'success'}
            onClick={handleImportSubmit}
          >
            开始导入
          </Button>,
        ]}
      >
        <div>
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="请使用「下载模板」提供的 Excel 格式"
            description="必填：SKU、产品名称；可选：分类（按名称匹配）、单位、计量方式（count/length/weight/area/volume）、单价、成本价、最小/最大库存、备注。SKU 重复的行会被拒绝并提示行号。"
          />
          <Upload
            accept=".xlsx,.xls"
            maxCount={1}
            beforeUpload={(file) => {
              const isLt10M = file.size / 1024 / 1024 < 10;
              if (!isLt10M) {
                message.error('文件大小不能超过10MB！');
                return Upload.LIST_IGNORE;
              }
              setImportFile(file);
              return false;
            }}
            onRemove={() => setImportFile(null)}
            fileList={importFile ? [importFile as any] : []}
          >
            <Button icon={<UploadOutlined />}>选择 Excel 文件（.xlsx / .xls）</Button>
          </Upload>

          {importStatus !== 'idle' && (
            <div style={{ marginTop: 16 }}>
              <div style={{ marginBottom: 8 }}>
                {importStatus === 'uploading' && <span>上传文件中...</span>}
                {importStatus === 'processing' && <span>处理数据中...</span>}
                {importStatus === 'success' && <span style={{ color: '#52c41a' }}>导入完成</span>}
                {importStatus === 'error' && <span style={{ color: '#ff4d4f' }}>导入失败</span>}
              </div>
              <Progress
                percent={importProgress}
                status={importStatus === 'success' ? 'success' : importStatus === 'error' ? 'exception' : 'active'}
              />
            </div>
          )}

          {importResult && (
            <div style={{ marginTop: 16 }}>
              <Divider>导入结果</Divider>
              {importStatus === 'success' && (
                <div>
                  <Row gutter={16}>
                    <Col span={8}>
                      <Statistic title="成功" value={importResult?.success_count ?? 0} valueStyle={{ color: '#52c41a' }} />
                    </Col>
                    <Col span={8}>
                      <Statistic title="总计" value={importResult?.total_count ?? 0} />
                    </Col>
                  </Row>
                  {!!importResult?.warnings?.length && (
                    <Alert
                      style={{ marginTop: 12 }}
                      type="warning"
                      showIcon
                      message="部分行有警告"
                      description={
                        <ul style={{ margin: 0, paddingLeft: 18 }}>
                          {importResult.warnings.map((w: string, i: number) => (
                            <li key={i}>{w}</li>
                          ))}
                        </ul>
                      }
                    />
                  )}
                </div>
              )}
              {importStatus === 'error' && (
                <Alert
                  type="error"
                  showIcon
                  message={importResult?.message || '导入失败'}
                  description={
                    Array.isArray(importResult?.errors) && importResult.errors.length > 0 ? (
                      <ul style={{ margin: 0, paddingLeft: 18, maxHeight: 200, overflow: 'auto' }}>
                        {importResult.errors.map((e: any, i: number) => (
                          <li key={i}>第 {e.row} 行：{e.message}</li>
                        ))}
                      </ul>
                    ) : undefined
                  }
                />
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default ProductsPage;
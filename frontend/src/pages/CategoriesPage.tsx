import React, { useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import {
  Card,
  Button,
  Input,
  Modal,
  Form,
  Select,
  message,
  Typography,
  Tag,
  Spin,
  Alert,
  Space,
  Tooltip,
  Table,
  Breadcrumb,
  Upload,
  Progress,
  Divider,
  Statistic,
  Row,
  Col,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  FolderOutlined,
  UploadOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../services/api';
import type { Category as CategoryType, CreateCategoryRequest, UpdateCategoryRequest } from '../types/api';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// 表单验证模式（后端字段 snake_case：parent_id）
const categorySchema = z.object({
  code: z.string().min(1, '请输入分类编码').max(50, '编码不能超过50个字符'),
  name: z.string().min(1, '请输入分类名称').max(100, '名称不能超过100个字符'),
  description: z.string().optional(),
  parent_id: z.string().optional(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface CategoryDialogProps {
  open: boolean;
  category?: CategoryType;
  parentCategory?: CategoryType;
  onClose: () => void;
  onSubmit: (data: CategoryFormData) => void;
  loading?: boolean;
}

const CategoryDialog: React.FC<CategoryDialogProps> = ({
  open,
  category,
  parentCategory,
  onClose,
  onSubmit,
  loading = false,
}) => {
  const [form] = Form.useForm();
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      code: category?.code || '',
      name: category?.name || '',
      description: category?.description || '',
      parent_id: category?.parent_id || parentCategory?.id || '',
    },
  });

  // 获取分类树（一二级层级，供父分类下拉选择）
  const { data: categoriesTree } = useQuery({
    queryKey: ['categories', 'tree'],
    queryFn: async () => {
      const response = await api.get<CategoryType[]>('/categories/tree');
      return response.data.data;
    },
  });

  React.useEffect(() => {
    if (open) {
      reset({
        code: category?.code || '',
        name: category?.name || '',
        description: category?.description || '',
        parent_id: category?.parent_id || parentCategory?.id || '',
      });
      form.setFieldsValue({
        code: category?.code || '',
        name: category?.name || '',
        description: category?.description || '',
        parent_id: category?.parent_id || parentCategory?.id || '',
      });
    }
  }, [open, category, parentCategory, reset, form]);

  const handleFormSubmit = (data: CategoryFormData) => {
    onSubmit(data);
  };

  // 树展平为带层级的平铺列表（父分类下拉用，最多两级）
  const flattenTree = (tree: CategoryType[], depth = 0): (CategoryType & { _depth: number })[] => {
    const result: (CategoryType & { _depth: number })[] = [];
    tree.forEach((cat) => {
      const node = { ...cat, _depth: depth };
      result.push(node);
      if (cat.children?.length) {
        result.push(...flattenTree(cat.children, depth + 1));
      }
    });
    return result;
  };

  // 过滤掉当前分类及其子孙（避免循环引用）
  const getAvailableParentCategories = (tree: CategoryType[], currentCategoryId?: string): (CategoryType & { _depth: number })[] => {
    const isDescendant = (cat: CategoryType, ancestorId: string): boolean => {
      if (cat.id === ancestorId) return true;
      if (cat.parent_id === ancestorId) return true;
      return (cat.children || []).some((child) => isDescendant(child, ancestorId));
    };

    return flattenTree(tree).filter((cat) => !isDescendant(cat, currentCategoryId));
  };

  const availableParentCategories = getAvailableParentCategories(Array.isArray(categoriesTree) ? categoriesTree : [], category?.id);

  return (
    <Modal
      title={
        <Space>
          <FolderOutlined />
          {category ? '编辑分类' : '新增分类'}
          {parentCategory && (
            <Tag color="blue">{`父分类: ${parentCategory.name}`}</Tag>
          )}
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
              onSubmit(values);
            });
          }}
        >
          保存
        </Button>,
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit(handleFormSubmit)}
      >
        <Form.Item
          label="分类编码"
          name="code"
          rules={[
            { required: true, message: '请输入分类编码' },
            { max: 50, message: '编码不能超过50个字符' }
          ]}
        >
          <Input placeholder="请输入分类编码" disabled={loading} />
        </Form.Item>

        <Form.Item
          label="分类名称"
          name="name"
          rules={[
            { required: true, message: '请输入分类名称' },
            { max: 100, message: '名称不能超过100个字符' }
          ]}
        >
          <Input placeholder="请输入分类名称" disabled={loading} />
        </Form.Item>

        <Form.Item
          label="描述"
          name="description"
        >
          <TextArea rows={3} placeholder="请输入描述" disabled={loading} />
        </Form.Item>

        <Form.Item
          label="父分类"
          name="parent_id"
        >
          <Select placeholder="请选择父分类" disabled={loading}>
            <Option value="">
              <em>无（顶级分类）</em>
            </Option>
            {availableParentCategories.map((cat) => (
              <Option key={cat.id} value={cat.id}>
                <Space>
                  <FolderOutlined />
                  {cat._depth > 0 ? '└─ ' : ''}{cat.name}
                  {cat._depth === 0 && cat.children?.length ? <Tag style={{ marginLeft: 4 }}>一级</Tag> : null}
                </Space>
              </Option>
            ))}
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};

// ===== 分类下钻列表 =====
// 交互：默认展示一级分类；点击一级分类名进入其子分类列表（面包屑可返回）
// 新增：当前在哪一层就在哪一层新增（一级层新增一级，二级层新增子分类）

const flattenTree = (tree: CategoryType[], acc: CategoryType[] = []): CategoryType[] => {
  tree.forEach((node) => {
    acc.push(node);
    if (node.children?.length) flattenTree(node.children, acc);
  });
  return acc;
};

const CategoriesPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | undefined>();
  const [parentCategory, setParentCategory] = useState<CategoryType | undefined>();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryType | undefined>();
  // 下钻：null=展示一级；否则展示该分类的子分类
  const [currentParentId, setCurrentParentId] = useState<string | null>(null);

  // ===== 批量导入 =====
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
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/categories/download-template`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!response.ok) throw new Error('下载失败');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `分类导入模板_${new Date().toISOString().slice(0, 10)}.xlsx`;
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
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/categories/batch-import`, {
        method: 'POST',
        body: formData,
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setImportProgress(70);
      setImportStatus('processing');

      const result = await response.json();
      setImportProgress(100);

      if (response.ok && (result.success || result.code === 200)) {
        setImportStatus('success');
        setImportResult(result.data);
        message.success(`导入成功！共处理 ${result.data?.success_count ?? 0} 条分类记录`);
        queryClient.invalidateQueries({ queryKey: ['categories'] });
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

  const queryClient = useQueryClient();

  // 获取分类树（/categories/tree 返回嵌套结构）
  const { data: categoriesData, isLoading } = useQuery({
    queryKey: ['categories', 'tree'],
    queryFn: async () => {
      const response = await api.get<CategoryType[]>('/categories/tree');
      return response.data.data;
    },
  });

  const allCategories: CategoryType[] = Array.isArray(categoriesData) ? flattenTree(categoriesData) : [];
  const categoryMap = new Map<string, CategoryType>();
  allCategories.forEach((c) => categoryMap.set(String(c.id), c));

  // 当前展示的分类列表：currentParentId 为 null 时取根节点，否则取其子节点
  const currentList: CategoryType[] = currentParentId
    ? categoryMap.get(currentParentId)?.children || []
    : (categoriesData || []).filter((c) => !c.parent_id);

  // 搜索过滤
  const filteredList = search
    ? currentList.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.code.toLowerCase().includes(search.toLowerCase()),
      )
    : currentList;

  const currentParent = currentParentId ? categoryMap.get(currentParentId) : undefined;
  const hasChildren = (c: CategoryType) => !!(c.children && c.children.length > 0);

  // 创建分类
  const createMutation = useMutation({
    mutationFn: async (data: CreateCategoryRequest) => {
      const response = await api.post<CategoryType>('/categories', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setDialogOpen(false);
      setSelectedCategory(undefined);
      setParentCategory(undefined);
      message.success('分类创建成功');
    },
    onError: () => {
      message.error('分类创建失败');
    },
  });

  // 更新分类
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateCategoryRequest }) => {
      const response = await api.put<CategoryType>(`/categories/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setDialogOpen(false);
      setSelectedCategory(undefined);
      setParentCategory(undefined);
      message.success('分类更新成功');
    },
    onError: () => {
      message.error('分类更新失败');
    },
  });

  // 删除分类
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setDeleteConfirmOpen(false);
      setCategoryToDelete(undefined);
      message.success('分类删除成功');
    },
    onError: () => {
      message.error('分类删除失败');
    },
  });

  const handleCreate = () => {
    setSelectedCategory(undefined);
    // 在当前层新增：若已下钻到某一级，则新增其子分类；否则新增一级
    setParentCategory(currentParent);
    setDialogOpen(true);
  };

  const handleEdit = (category: CategoryType) => {
    setSelectedCategory(category);
    setParentCategory(undefined);
    setDialogOpen(true);
  };

  const handleDelete = (category: CategoryType) => {
    setCategoryToDelete(category);
    setDeleteConfirmOpen(true);
  };

  const handleEnter = (category: CategoryType) => {
    if (hasChildren(category)) {
      setCurrentParentId(String(category.id));
      setSearch('');
    }
  };

  const handleSubmit = (data: CategoryFormData) => {
    const payload: any = { ...data };
    if (!payload.parent_id) delete payload.parent_id;
    if (selectedCategory) {
      updateMutation.mutate({ id: selectedCategory.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleConfirmDelete = () => {
    if (categoryToDelete) {
      deleteMutation.mutate(categoryToDelete.id);
    }
  };

  const columns = [
    {
      title: '分类名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: CategoryType) => (
        <Space>
          <FolderOutlined style={{ color: hasChildren(record) ? '#1677ff' : '#bfbfbf' }} />
          {hasChildren(record) ? (
            <Button
              type="link"
              style={{ padding: 0, height: 'auto' }}
              onClick={() => handleEnter(record)}
            >
              {name}
            </Button>
          ) : (
            <Text>{name}</Text>
          )}
        </Space>
      ),
    },
    {
      title: '分类编码',
      dataIndex: 'code',
      key: 'code',
      width: 140,
    },
    {
      title: '子分类数',
      key: 'children_count',
      width: 100,
      render: (_: unknown, record: CategoryType) => record.children?.length || 0,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: string) => (
        <Tag color={status === 'active' ? 'success' : 'default'}>
          {status === 'active' ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 140,
      render: (_: unknown, record: CategoryType) => (
        <Space>
          <Tooltip title="编辑">
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          </Tooltip>
          <Tooltip title="删除">
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
              disabled={hasChildren(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="分类管理" sub="商品分类层级维护与快速检索" />

      {/* 操作栏 */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <Input
            placeholder="搜索分类..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            prefix={<SearchOutlined />}
            style={{ width: 300 }}
          />
          <Space>
            <Button icon={<UploadOutlined />} onClick={handleBatchImport}>
              批量导入
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
              下载模板
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              {currentParent ? `新增「${currentParent.name}」的子分类` : '新增一级分类'}
            </Button>
          </Space>
        </div>
      </Card>

      {/* 面包屑导航 */}
      <Card style={{ marginBottom: 16 }}>
        <Breadcrumb
          items={[
            {
              title: (
                <Button type="link" style={{ padding: 0 }} onClick={() => setCurrentParentId(null)}>
                  全部
                </Button>
              ),
            },
            ...(currentParent
              ? [
                  {
                    title: <Text strong>{currentParent.name}</Text>,
                  },
                ]
              : []),
          ]}
        />
      </Card>

      {/* 分类列表 */}
      <Card>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" />
          </div>
        ) : filteredList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Text type="secondary">
              {search ? '未找到匹配的分类' : currentParent ? '该分类下暂无子分类' : '暂无分类数据'}
            </Text>
          </div>
        ) : (
          <Table
            rowKey="id"
            dataSource={filteredList}
            columns={columns}
            pagination={false}
            size="middle"
          />
        )}
      </Card>

      {/* 新增/编辑对话框 */}
      <CategoryDialog
        open={dialogOpen}
        category={selectedCategory}
        parentCategory={parentCategory}
        onClose={() => {
          setDialogOpen(false);
          setSelectedCategory(undefined);
          setParentCategory(undefined);
        }}
        onSubmit={handleSubmit}
        loading={createMutation.isPending || updateMutation.isPending}
      />

      {/* 批量导入模态框 */}
      <Modal
        title="批量导入分类"
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
            description="必填：一级分类名称、一级分类编码；可选：二级分类名称+编码（同时填写）、描述、状态（启用/停用）。同一行的二级挂在同行一级之下；一级按编码匹配（已有则更新名称/状态，沿用原编码时提示），二级编码在库内或文件内重复会被拒绝并提示行号。"
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

      {/* 删除确认对话框 */}
      <Modal
        title="确认删除"
        open={deleteConfirmOpen}
        onCancel={() => setDeleteConfirmOpen(false)}
        footer={[
          <Button key="back" onClick={() => setDeleteConfirmOpen(false)}>
            取消
          </Button>,
          <Button
            key="delete"
            type="primary"
            danger
            loading={deleteMutation.isPending}
            disabled={!!(categoryToDelete?.children && categoryToDelete.children.length > 0)}
            onClick={handleConfirmDelete}
          >
            确认删除
          </Button>,
        ]}
      >
        <Alert
          message="警告"
          description={
            <div>
              <p>删除操作不可恢复，请谨慎操作！</p>
              <p>确定要删除分类 "{categoryToDelete?.name}" 吗？</p>
            </div>
          }
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
        {categoryToDelete?.children && categoryToDelete.children.length > 0 && (
          <Alert message="错误" description="该分类下还有子分类，请先删除子分类！" type="error" showIcon />
        )}
      </Modal>
    </div>
  );
};

export default CategoriesPage;
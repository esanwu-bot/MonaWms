import React, { useState } from 'react';
import {
  Card,
  Button,
  Input,
  Tree,
  Modal,
  Form,
  Select,
  message,
  Typography,
  Tag,
  Divider,
  List,
  Popconfirm,
  Spin,
  Alert,
  Space,
  Tooltip
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  FolderOutlined,
  FolderOpenOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../services/api';
import type { Category as CategoryType, CreateCategoryRequest, UpdateCategoryRequest } from '../types/api';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// 表单验证模式
const categorySchema = z.object({
  code: z.string().min(1, '请输入分类编码').max(50, '编码不能超过50个字符'),
  name: z.string().min(1, '请输入分类名称').max(100, '名称不能超过100个字符'),
  description: z.string().optional(),
  parentId: z.string().optional(),
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
      parentId: category?.parentId || parentCategory?.id || '',
    },
  });

  // 获取分类列表（用于选择父分类）
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get<CategoryType[]>('/categories');
      return response.data.data;
    },
  });

  React.useEffect(() => {
    if (open) {
      reset({
        code: category?.code || '',
        name: category?.name || '',
        description: category?.description || '',
        parentId: category?.parentId || parentCategory?.id || '',
      });
      form.setFieldsValue({
        code: category?.code || '',
        name: category?.name || '',
        description: category?.description || '',
        parentId: category?.parentId || parentCategory?.id || '',
      });
    }
  }, [open, category, parentCategory, reset, form]);

  const handleFormSubmit = (data: CategoryFormData) => {
    onSubmit(data);
  };

  // 过滤掉当前分类及其子分类（避免循环引用）
  const getAvailableParentCategories = (categories: CategoryType[], currentCategoryId?: string): CategoryType[] => {
    if (!currentCategoryId) return categories;
    
    const isDescendant = (cat: CategoryType, ancestorId: string): boolean => {
      if (cat.id === ancestorId) return true;
      if (cat.parentId === ancestorId) return true;
      const parent = categories.find(c => c.id === cat.parentId);
      return parent ? isDescendant(parent, ancestorId) : false;
    };

    return categories.filter(cat => !isDescendant(cat, currentCategoryId));
  };

  const availableParentCategories = getAvailableParentCategories(categoriesData || [], category?.id);

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
          name="parentId"
        >
          <Select placeholder="请选择父分类" disabled={loading}>
            <Option value="">
              <em>无（顶级分类）</em>
            </Option>
            {availableParentCategories.map((cat) => (
              <Option key={cat.id} value={cat.id}>
                <Space>
                  <FolderOutlined />
                  {'  '.repeat(cat.level)}{cat.name}
                </Space>
              </Option>
            ))}
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};

interface CategoryTreeItemProps {
  category: CategoryType;
  onEdit: (category: CategoryType) => void;
  onDelete: (category: CategoryType) => void;
  onAddChild: (parentCategory: CategoryType) => void;
}

const CategoryTreeItem: React.FC<CategoryTreeItemProps> = ({
  category,
  onEdit,
  onDelete,
  onAddChild,
}) => {
  const hasChildren = category.children && category.children.length > 0;

  return (
    <Tree.TreeNode
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Space>
            {hasChildren ? <FolderOpenOutlined /> : <FolderOutlined />}
            <Text strong>{category.name}</Text>
            <Tag color="default">{category.code}</Tag>
            <Tag color={category.isActive ? 'success' : 'default'}>
              {category.isActive ? '启用' : '禁用'}
            </Tag>
          </Space>
          <Space>
            <Tooltip title="添加子分类">
              <Button
                type="text"
                size="small"
                icon={<PlusOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  onAddChild(category);
                }}
              />
            </Tooltip>
            <Tooltip title="编辑">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(category);
                }}
              />
            </Tooltip>
            <Tooltip title="删除">
              <Button
                type="text"
                size="small"
                icon={<DeleteOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(category);
                }}
              />
            </Tooltip>
          </Space>
        </div>
      }
    >
      {category.children?.map((child) => (
        <CategoryTreeItem
          key={child.id}
          category={child}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddChild={onAddChild}
        />
      ))}
    </Tree.TreeNode>
  );
};

const CategoriesPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | undefined>();
  const [parentCategory, setParentCategory] = useState<CategoryType | undefined>();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryType | undefined>();
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);

  const queryClient = useQueryClient();

  // 获取分类列表
  const { data: categoriesData, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get<CategoryType[]>('/categories');
      return response.data.data;
    },
  });

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
    }
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
    }
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
    }
  });

  const handleCreate = () => {
    setSelectedCategory(undefined);
    setParentCategory(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (category: CategoryType) => {
    setSelectedCategory(category);
    setParentCategory(undefined);
    setDialogOpen(true);
  };

  const handleAddChild = (parentCat: CategoryType) => {
    setSelectedCategory(undefined);
    setParentCategory(parentCat);
    setDialogOpen(true);
  };

  const handleDelete = (category: CategoryType) => {
    setCategoryToDelete(category);
    setDeleteConfirmOpen(true);
  };

  const handleSubmit = (data: CategoryFormData) => {
    if (selectedCategory) {
      updateMutation.mutate({ id: selectedCategory.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleConfirmDelete = () => {
    if (categoryToDelete) {
      deleteMutation.mutate(categoryToDelete.id);
    }
  };

  // 构建树形结构
  const buildCategoryTree = (categories: CategoryType[]): CategoryType[] => {
    const categoryMap = new Map<string, CategoryType>();
    const rootCategories: CategoryType[] = [];

    // 创建映射
    categories.forEach(category => {
      categoryMap.set(category.id, { ...category, children: [] });
    });

    // 构建树形结构
    categories.forEach(category => {
      const categoryNode = categoryMap.get(category.id)!;
      if (category.parentId) {
        const parent = categoryMap.get(category.parentId);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(categoryNode);
        }
      } else {
        rootCategories.push(categoryNode);
      }
    });

    return rootCategories;
  };

  // 过滤分类
  const filterCategories = (categories: CategoryType[], searchTerm: string): CategoryType[] => {
    if (!searchTerm) return categories;
    
    const filtered: CategoryType[] = [];
    
    const searchInCategory = (category: CategoryType): boolean => {
      const matches = category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                     category.code.toLowerCase().includes(searchTerm.toLowerCase());
      
      const childMatches = category.children?.some(child => searchInCategory(child)) || false;
      
      if (matches || childMatches) {
        const filteredCategory = { ...category };
        if (childMatches) {
          filteredCategory.children = category.children?.filter(child => searchInCategory(child)) || [];
        }
        return true;
      }
      
      return false;
    };
    
    categories.forEach(category => {
      if (searchInCategory(category)) {
        filtered.push(category);
      }
    });
    
    return filtered;
  };

  const categories = categoriesData || [];
  const categoryTree = buildCategoryTree(categories);
  const filteredTree = filterCategories(categoryTree, search);

  return (
    <div style={{ padding: 24 }}>
      <Title level={3} style={{ marginBottom: 24 }}>
        分类管理
      </Title>

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
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
          >
            新增分类
          </Button>
        </div>
      </Card>

      {/* 分类树 */}
      <Card>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" />
          </div>
        ) : filteredTree.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Text type="secondary">
              {search ? '未找到匹配的分类' : '暂无分类数据'}
            </Text>
          </div>
        ) : (
          <Tree
            showLine
            expandedKeys={expandedKeys}
            onExpand={(keys) => setExpandedKeys(keys as string[])}
            blockNode
          >
            {filteredTree.map((category) => (
              <CategoryTreeItem
                key={category.id}
                category={category}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onAddChild={handleAddChild}
              />
            ))}
          </Tree>
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

      {/* 删除确认对话框 */}
      <Modal
        title="确认删除"
        open={deleteConfirmOpen}
        onCancel={() => setDeleteConfirmOpen(false)}
        footer={[
          <Button key="back" onClick={() => setDeleteConfirmOpen(false)}>
            取消
          </Button>,
          <Popconfirm
            key="delete"
            title="确定要删除吗？此操作不可恢复！"
            onConfirm={handleConfirmDelete}
            disabled={!!(categoryToDelete?.children && categoryToDelete.children.length > 0)}
          >
            <Button
              type="primary"
              danger
              loading={deleteMutation.isPending}
              disabled={!!(categoryToDelete?.children && categoryToDelete.children.length > 0)}
            >
              确认删除
            </Button>
          </Popconfirm>
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
          <Alert
            message="错误"
            description="该分类下还有子分类，请先删除子分类！"
            type="error"
            showIcon
          />
        )}
      </Modal>
    </div>
  );
};

export default CategoriesPage;
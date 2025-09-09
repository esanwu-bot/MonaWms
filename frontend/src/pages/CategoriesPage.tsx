import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Alert,
  CircularProgress,
  Tooltip,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Collapse,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Search,
  Category,
  ExpandMore,
  ChevronRight,
  Folder,
  FolderOpen,
  Description,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import { queryKeys } from '../utils/queryClient';
import { api } from '../services/api';
import type { Category as CategoryType, CreateCategoryRequest, UpdateCategoryRequest } from '../types/api';

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
    queryKey: queryKeys.categories.all,
    queryFn: async () => {
      const response = await api.get<CategoryType[]>('/categories');
      return response.data.data.list;
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
    }
  }, [open, category, parentCategory, reset]);

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
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Category />
          {category ? '编辑分类' : '新增分类'}
          {parentCategory && (
            <Chip
              label={`父分类: ${parentCategory.name}`}
              size="small"
              variant="outlined"
            />
          )}
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box component="form" sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Controller
                name="code"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="分类编码"
                    required
                    error={!!errors.code}
                    helperText={errors.code?.message}
                    disabled={loading}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="分类名称"
                    required
                    error={!!errors.name}
                    helperText={errors.name?.message}
                    disabled={loading}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="描述"
                    multiline
                    rows={3}
                    error={!!errors.description}
                    helperText={errors.description?.message}
                    disabled={loading}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <Controller
                name="parentId"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>父分类</InputLabel>
                    <Select
                      {...field}
                      label="父分类"
                      disabled={loading}
                    >
                      <MenuItem value="">
                        <em>无（顶级分类）</em>
                      </MenuItem>
                      {availableParentCategories.map((cat) => (
                        <MenuItem key={cat.id} value={cat.id}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Category fontSize="small" />
                            {'  '.repeat(cat.level)}{cat.name}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          取消
        </Button>
        <Button
          onClick={handleSubmit(handleFormSubmit)}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : undefined}
        >
          {loading ? '保存中...' : '保存'}
        </Button>
      </DialogActions>
    </Dialog>
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
    <TreeItem
      itemId={category.id}
      label={
        <Box sx={{ display: 'flex', alignItems: 'center', py: 0.5, pr: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
            {hasChildren ? <FolderOpen fontSize="small" /> : <Folder fontSize="small" />}
            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
              {category.name}
            </Typography>
            <Chip label={category.code} size="small" variant="outlined" />
            <Chip
              label={category.isActive ? '启用' : '禁用'}
              color={category.isActive ? 'success' : 'default'}
              size="small"
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="添加子分类">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddChild(category);
                }}
              >
                <Add fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="编辑">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(category);
                }}
              >
                <Edit fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="删除">
              <IconButton
                size="small"
                color="error"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(category);
                }}
              >
                <Delete fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
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
    </TreeItem>
  );
};

const CategoriesPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | undefined>();
  const [parentCategory, setParentCategory] = useState<CategoryType | undefined>();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryType | undefined>();
  const [expanded, setExpanded] = useState<string[]>([]);

  const queryClient = useQueryClient();

  // 获取分类列表
  const { data: categoriesData, isLoading } = useQuery({
    queryKey: queryKeys.categories.all,
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
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
      setDialogOpen(false);
      setSelectedCategory(undefined);
      setParentCategory(undefined);
    },
  });

  // 更新分类
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateCategoryRequest }) => {
      const response = await api.put<CategoryType>(`/categories/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
      setDialogOpen(false);
      setSelectedCategory(undefined);
      setParentCategory(undefined);
    },
  });

  // 删除分类
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
      setDeleteConfirmOpen(false);
      setCategoryToDelete(undefined);
    },
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
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
        分类管理
      </Typography>

      {/* 操作栏 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <TextField
              placeholder="搜索分类..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 300 }}
            />
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleCreate}
            >
              新增分类
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* 分类树 */}
      <Card>
        <CardContent>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : filteredTree.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="textSecondary">
                {search ? '未找到匹配的分类' : '暂无分类数据'}
              </Typography>
            </Box>
          ) : (
            <SimpleTreeView
              defaultCollapseIcon={<ExpandMore />}
              defaultExpandIcon={<ChevronRight />}
              expandedItems={expanded}
              onExpandedItemsChange={(event, itemIds) => setExpanded(itemIds)}
              sx={{ flexGrow: 1, maxWidth: '100%', overflowY: 'auto' }}
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
            </SimpleTreeView>
          )}
        </CardContent>
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
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            删除操作不可恢复，请谨慎操作！
          </Alert>
          <Typography>
            确定要删除分类 "{categoryToDelete?.name}" 吗？
          </Typography>
          {categoryToDelete?.children && categoryToDelete.children.length > 0 && (
            <Alert severity="error" sx={{ mt: 2 }}>
              该分类下还有子分类，请先删除子分类！
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>取消</Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
            disabled={deleteMutation.isPending || (categoryToDelete?.children && categoryToDelete.children.length > 0)}
            startIcon={deleteMutation.isPending ? <CircularProgress size={20} /> : undefined}
          >
            {deleteMutation.isPending ? '删除中...' : '确认删除'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CategoriesPage;
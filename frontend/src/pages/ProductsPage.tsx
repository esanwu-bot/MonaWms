import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
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
  TablePagination,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Search,
  Inventory,
  Category,
  AttachMoney,
  QrCode,
  Business,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { queryKeys } from '../utils/queryClient';
import { api } from '../services/api';
import type { Product, Category as CategoryType, CreateProductRequest, UpdateProductRequest, PaginatedResponse } from '../types/api';

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
      categoryId: product?.categoryId || '',
      unit: product?.unit || '',
      unitPrice: product?.unitPrice || 0,
      minStock: product?.minStock || 0,
      maxStock: product?.maxStock || 0,
      barcode: product?.barcode || '',
    },
  });

  const minStock = watch('minStock');

  // 获取分类列表
  const { data: categoriesData } = useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: async () => {
      const response = await api.get<CategoryType[]>('/categories');
      return response.data.data.list;
    },
  });
  
  // 获取项目列表
  const { data: projectsData } = useQuery({
    queryKey: queryKeys.projects?.all,
    queryFn: async () => {
      const response = await api.get('/projects');
      return response.data.data.list;
    },
    enabled: !!queryKeys.projects,
  });

  React.useEffect(() => {
    if (open) {
      reset({
        sku: product?.sku || '',
        name: product?.name || '',
        description: product?.description || '',
        deviceType: product?.deviceType || '',
        modelNumber: product?.modelNumber || '',
        frequencyProtocol: product?.frequencyProtocol || '',
        firmwareVersion: product?.firmwareVersion || '',
        categoryId: product?.categoryId || '',
        unit: product?.unit || '',
        unitPrice: product?.unitPrice || 0,
        minStock: product?.minStock || 0,
        maxStock: product?.maxStock || 0,
        barcode: product?.barcode || '',
        projectId: product?.projectId || '',
      });
    }
  }, [open, product, reset]);

  const handleFormSubmit = (data: ProductFormData) => {
    onSubmit(data);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Inventory />
          {product ? '编辑产品' : '新增产品'}
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box component="form" sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Controller
                name="sku"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="SKU"
                    required
                    error={!!errors.sku}
                    helperText={errors.sku?.message}
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
                    label="产品名称"
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
                    multiline
                    rows={3}
                    label="描述"
                    error={!!errors.description}
                    helperText={errors.description?.message}
                    disabled={loading}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="deviceType"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="设备类型"
                    placeholder="如：基站、路由器、光模块"
                    error={!!errors.deviceType}
                    helperText={errors.deviceType?.message}
                    disabled={loading}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="modelNumber"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="型号"
                    placeholder="如：HUAWEI MA5683T"
                    error={!!errors.modelNumber}
                    helperText={errors.modelNumber?.message}
                    disabled={loading}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="frequencyProtocol"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="频段/协议"
                    placeholder="如：5G 700MHz, WiFi 6"
                    error={!!errors.frequencyProtocol}
                    helperText={errors.frequencyProtocol?.message}
                    disabled={loading}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="firmwareVersion"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="固件版本"
                    error={!!errors.firmwareVersion}
                    helperText={errors.firmwareVersion?.message}
                    disabled={loading}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="modelNumber"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="型号"
                    placeholder="如：HUAWEI MA5683T"
                    error={!!errors.modelNumber}
                    helperText={errors.modelNumber?.message}
                    disabled={loading}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="frequencyProtocol"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="频段/协议"
                    placeholder="如：5G 700MHz, WiFi 6"
                    error={!!errors.frequencyProtocol}
                    helperText={errors.frequencyProtocol?.message}
                    disabled={loading}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="firmwareVersion"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="固件版本"
                    error={!!errors.firmwareVersion}
                    helperText={errors.firmwareVersion?.message}
                    disabled={loading}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth required error={!!errors.categoryId}>
                    <InputLabel>分类</InputLabel>
                    <Select
                      {...field}
                      label="分类"
                      disabled={loading}
                    >
                      {categoriesData?.map((category) => (
                        <MenuItem key={category.id} value={category.id}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Category fontSize="small" />
                            {category.name}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.categoryId && (
                      <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                        {errors.categoryId.message}
                      </Typography>
                    )}
                  </FormControl>
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="unit"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="单位"
                    required
                    placeholder="如：个、箱、公斤等"
                    error={!!errors.unit}
                    helperText={errors.unit?.message}
                    disabled={loading}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="unitPrice"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="单价"
                    type="number"
                    required
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <AttachMoney />
                        </InputAdornment>
                      ),
                    }}
                    error={!!errors.unitPrice}
                    helperText={errors.unitPrice?.message}
                    disabled={loading}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="barcode"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="条形码"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <QrCode />
                        </InputAdornment>
                      ),
                    }}
                    error={!!errors.barcode}
                    helperText={errors.barcode?.message}
                    disabled={loading}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="projectId"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>所属项目</InputLabel>
                    <Select
                      {...field}
                      label="所属项目"
                      disabled={loading || !projectsData}
                    >
                      <MenuItem value="">无</MenuItem>
                      {projectsData?.map((project) => (
                        <MenuItem key={project.id} value={project.id}>
                          {project.name} ({project.projectCode})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="minStock"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="最小库存"
                    type="number"
                    required
                    error={!!errors.minStock}
                    helperText={errors.minStock?.message}
                    disabled={loading}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="maxStock"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="最大库存"
                    type="number"
                    required
                    error={!!errors.maxStock}
                    helperText={errors.maxStock?.message || (field.value < minStock ? '最大库存不能小于最小库存' : '')}
                    disabled={loading}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  />
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

const ProductsPage: React.FC = () => {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | undefined>();

  const queryClient = useQueryClient();

  // 获取产品列表
  const { data: productsData, isLoading } = useQuery({
    queryKey: queryKeys.products.list({ page: page + 1, pageSize, search, categoryId: categoryFilter }),
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Product[]>>('/products', {
        params: { page: page + 1, pageSize, search, categoryId: categoryFilter || undefined },
      });
      return response.data;
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
    mutationFn: async (data: CreateProductRequest) => {
      const response = await api.post<Product>('/products', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      setDialogOpen(false);
      setSelectedProduct(undefined);
    },
  });

  // 更新产品
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateProductRequest }) => {
      const response = await api.put<Product>(`/products/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      setDialogOpen(false);
      setSelectedProduct(undefined);
    },
  });

  // 删除产品
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      setDeleteConfirmOpen(false);
      setProductToDelete(undefined);
    },
  });

  const handleCreate = () => {
    setSelectedProduct(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setDialogOpen(true);
  };

  const handleDelete = (product: Product) => {
    setProductToDelete(product);
    setDeleteConfirmOpen(true);
  };

  const handleSubmit = (data: ProductFormData) => {
    if (selectedProduct) {
      updateMutation.mutate({ id: selectedProduct.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleConfirmDelete = () => {
    if (productToDelete) {
      deleteMutation.mutate(productToDelete.id);
    }
  };

  const handlePageChange = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPageSize(parseInt(event.target.value, 10));
    setPage(0);
  };

  const products = productsData?.data?.list || [];
  const pagination = productsData?.data?.pagination;
  const categories = categoriesData || [];

  return (
    <Box sx={{ width: '100%', maxWidth: '100%' }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
        产品管理
      </Typography>

      {/* 操作栏 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', flex: 1, maxWidth: { xs: '100%', sm: 'none' } }}>
              <TextField
                placeholder="搜索产品..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
                sx={{ minWidth: { xs: '100%', sm: 300 }, flex: { xs: 1, sm: 'none' } }}
              />
              <FormControl sx={{ minWidth: { xs: '100%', sm: 200 }, flex: { xs: 1, sm: 'none' } }}>
                <InputLabel>分类筛选</InputLabel>
                <Select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  label="分类筛选"
                >
                  <MenuItem value="">
                    <em>全部分类</em>
                  </MenuItem>
                  {categories.map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleCreate}
            >
              新增产品
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* 产品列表 */}
      <Card>
        <TableContainer sx={{ width: '100%', overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>SKU</TableCell>
                <TableCell>产品名称</TableCell>
                <TableCell>分类</TableCell>
                <TableCell>设备类型</TableCell>
                <TableCell>型号</TableCell>
                <TableCell>项目</TableCell>
                <TableCell>单位</TableCell>
                <TableCell>单价</TableCell>
                <TableCell>库存范围</TableCell>
                <TableCell>状态</TableCell>
                <TableCell align="center">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={11} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} align="center">
                    <Typography color="textSecondary">暂无数据</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
                  <TableRow key={product.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {product.sku}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.light' }}>
                          <Inventory fontSize="small" />
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {product.name}
                          </Typography>
                          {product.description && (
                            <Typography variant="caption" color="textSecondary">
                              {product.description.length > 30 
                                ? `${product.description.substring(0, 30)}...` 
                                : product.description}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {product.category ? (
                        <Chip
                          label={product.category.name}
                          size="small"
                          variant="outlined"
                          icon={<Category />}
                        />
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {product.deviceType || '-'}
                    </TableCell>
                    <TableCell>
                      {product.modelNumber || '-'}
                    </TableCell>
                    <TableCell>
                      {product.project ? (
                        <Chip
                          label={product.project.name}
                          size="small"
                          variant="outlined"
                          icon={<Business />}
                        />
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>{product.unit}</TableCell>
                    <TableCell>
                      <Typography variant="body2" color="primary" fontWeight="medium">
                        ¥{(product.unitPrice || 0).toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {product.minStock} - {product.maxStock}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={product.isActive ? '启用' : '禁用'}
                        color={product.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="编辑">
                        <IconButton
                          size="small"
                          onClick={() => handleEdit(product)}
                        >
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="删除">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(product)}
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        {pagination && (
          <TablePagination
            component="div"
            count={pagination.total}
            page={page}
            onPageChange={handlePageChange}
            rowsPerPage={pageSize}
            onRowsPerPageChange={handlePageSizeChange}
            rowsPerPageOptions={[5, 10, 25, 50]}
            labelRowsPerPage="每页显示："
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} 共 ${count} 条`}
          />
        )}
      </Card>

      {/* 新增/编辑对话框 */}
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

      {/* 删除确认对话框 */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            删除操作不可恢复，请谨慎操作！
          </Alert>
          <Typography>
            确定要删除产品 "{productToDelete?.name}" 吗？
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>取消</Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
            disabled={deleteMutation.isPending}
            startIcon={deleteMutation.isPending ? <CircularProgress size={20} /> : undefined}
          >
            {deleteMutation.isPending ? '删除中...' : '确认删除'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProductsPage;
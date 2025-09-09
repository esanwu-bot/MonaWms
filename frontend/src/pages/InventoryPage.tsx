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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Tabs,
  Tab,
  Divider,
  Stack,
} from '@mui/material';
import {
  Search,
  Inventory,
  Add,
  Remove,
  SwapHoriz,
  Refresh,
  FilterList,
  GetApp,
  Warning,
  CheckCircle,
  Error,
  TrendingUp,
  TrendingDown,
  Storage,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
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

// 库存调整表单验证
const adjustmentSchema = z.object({
  productId: z.string().min(1, '请选择产品'),
  warehouseId: z.string().min(1, '请选择仓库'),
  adjustmentType: z.enum(['increase', 'decrease'], { required_error: '请选择调整类型' }),
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

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`inventory-tabpanel-${index}`}
      aria-labelledby={`inventory-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

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
  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
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

  const selectedProductId = watch('productId');
  const selectedWarehouseId = watch('warehouseId');

  // 获取产品列表
  const { data: productsData } = useQuery({
    queryKey: queryKeys.products.all,
    queryFn: async () => {
      const response = await api.get<Product[]>('/products');
      return response.data.data.list;
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
    }
  }, [open, reset]);

  const handleFormSubmit = (data: AdjustmentFormData) => {
    onSubmit(data);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Inventory />
          库存调整
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box component="form" sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Controller
                name="productId"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.productId}>
                    <InputLabel>产品</InputLabel>
                    <Select
                      {...field}
                      label="产品"
                      disabled={loading}
                    >
                      {productsData?.map((product) => (
                        <MenuItem key={product.id} value={product.id}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography>{product.name}</Typography>
                            <Chip label={product.sku} size="small" variant="outlined" />
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.productId && (
                      <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                        {errors.productId.message}
                      </Typography>
                    )}
                  </FormControl>
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="warehouseId"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.warehouseId}>
                    <InputLabel>仓库</InputLabel>
                    <Select
                      {...field}
                      label="仓库"
                      disabled={loading}
                    >
                      {warehousesData?.map((warehouse) => (
                        <MenuItem key={warehouse.id} value={warehouse.id}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Storage fontSize="small" />
                            <Typography>{warehouse.name}</Typography>
                            <Chip label={warehouse.code} size="small" variant="outlined" />
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.warehouseId && (
                      <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                        {errors.warehouseId.message}
                      </Typography>
                    )}
                  </FormControl>
                )}
              />
            </Grid>
            {currentStock && (
              <Grid item xs={12}>
                <Alert severity="info">
                  当前库存：{currentStock.quantity} {currentStock.product?.unit || '件'}
                </Alert>
              </Grid>
            )}
            <Grid item xs={12} sm={6}>
              <Controller
                name="adjustmentType"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.adjustmentType}>
                    <InputLabel>调整类型</InputLabel>
                    <Select
                      {...field}
                      label="调整类型"
                      disabled={loading}
                    >
                      <MenuItem value="increase">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <TrendingUp color="success" />
                          增加库存
                        </Box>
                      </MenuItem>
                      <MenuItem value="decrease">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <TrendingDown color="error" />
                          减少库存
                        </Box>
                      </MenuItem>
                    </Select>
                    {errors.adjustmentType && (
                      <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                        {errors.adjustmentType.message}
                      </Typography>
                    )}
                  </FormControl>
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="quantity"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="调整数量"
                    type="number"
                    required
                    error={!!errors.quantity}
                    helperText={errors.quantity?.message}
                    disabled={loading}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <Controller
                name="reason"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="调整原因"
                    required
                    error={!!errors.reason}
                    helperText={errors.reason?.message}
                    disabled={loading}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <Controller
                name="remark"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="备注"
                    multiline
                    rows={3}
                    disabled={loading}
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
          {loading ? '调整中...' : '确认调整'}
        </Button>
      </DialogActions>
    </Dialog>
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
  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
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
  const selectedToWarehouseId = watch('toWarehouseId');

  // 获取产品列表
  const { data: productsData } = useQuery({
    queryKey: queryKeys.products.all,
    queryFn: async () => {
      const response = await api.get<Product[]>('/products');
      return response.data.data.list;
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
    }
  }, [open, reset]);

  const handleFormSubmit = (data: TransferFormData) => {
    onSubmit(data);
  };

  // 过滤目标仓库（不能选择源仓库）
  const availableToWarehouses = warehousesData?.filter(
    (warehouse) => warehouse.id !== selectedFromWarehouseId
  ) || [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SwapHoriz />
          库存转移
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box component="form" sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Controller
                name="productId"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.productId}>
                    <InputLabel>产品</InputLabel>
                    <Select
                      {...field}
                      label="产品"
                      disabled={loading}
                    >
                      {productsData?.map((product) => (
                        <MenuItem key={product.id} value={product.id}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography>{product.name}</Typography>
                            <Chip label={product.sku} size="small" variant="outlined" />
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.productId && (
                      <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                        {errors.productId.message}
                      </Typography>
                    )}
                  </FormControl>
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="fromWarehouseId"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.fromWarehouseId}>
                    <InputLabel>源仓库</InputLabel>
                    <Select
                      {...field}
                      label="源仓库"
                      disabled={loading}
                    >
                      {warehousesData?.map((warehouse) => (
                        <MenuItem key={warehouse.id} value={warehouse.id}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Storage fontSize="small" />
                            <Typography>{warehouse.name}</Typography>
                            <Chip label={warehouse.code} size="small" variant="outlined" />
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.fromWarehouseId && (
                      <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                        {errors.fromWarehouseId.message}
                      </Typography>
                    )}
                  </FormControl>
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="toWarehouseId"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.toWarehouseId}>
                    <InputLabel>目标仓库</InputLabel>
                    <Select
                      {...field}
                      label="目标仓库"
                      disabled={loading}
                    >
                      {availableToWarehouses.map((warehouse) => (
                        <MenuItem key={warehouse.id} value={warehouse.id}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Storage fontSize="small" />
                            <Typography>{warehouse.name}</Typography>
                            <Chip label={warehouse.code} size="small" variant="outlined" />
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.toWarehouseId && (
                      <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                        {errors.toWarehouseId.message}
                      </Typography>
                    )}
                  </FormControl>
                )}
              />
            </Grid>
            {sourceStock && (
              <Grid item xs={12}>
                <Alert severity="info">
                  源仓库库存：{sourceStock.quantity} {sourceStock.product?.unit || '件'}
                </Alert>
              </Grid>
            )}
            <Grid item xs={12} sm={6}>
              <Controller
                name="quantity"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="转移数量"
                    type="number"
                    required
                    error={!!errors.quantity}
                    helperText={errors.quantity?.message}
                    disabled={loading}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    inputProps={{
                      max: sourceStock?.quantity || undefined,
                    }}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="reason"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="转移原因"
                    required
                    error={!!errors.reason}
                    helperText={errors.reason?.message}
                    disabled={loading}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <Controller
                name="remark"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="备注"
                    multiline
                    rows={3}
                    disabled={loading}
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
          {loading ? '转移中...' : '确认转移'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const InventoryPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [search, setSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);

  const queryClient = useQueryClient();

  // 构建查询参数
  const queryParams: InventoryQueryParams = {
    page: page + 1,
    limit: rowsPerPage,
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
        data: InventoryItem[];
        total: number;
        page: number;
        limit: number;
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
    },
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
    },
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleAdjustmentSubmit = (data: AdjustmentFormData) => {
    adjustmentMutation.mutate(data);
  };

  const handleTransferSubmit = (data: TransferFormData) => {
    transferMutation.mutate(data);
  };

  const getStockStatusColor = (quantity: number, minStock: number, maxStock: number) => {
    if (quantity <= minStock) return 'error';
    if (quantity >= maxStock) return 'warning';
    return 'success';
  };

  const getStockStatusText = (quantity: number, minStock: number, maxStock: number) => {
    if (quantity <= minStock) return '库存不足';
    if (quantity >= maxStock) return '库存过多';
    return '正常';
  };

  const inventoryItems = inventoryData?.list || [];
  const total = inventoryData?.pagination?.total || 0;

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
        库存管理
      </Typography>

      {/* 标签页 */}
      <Card sx={{ mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="库存查询" />
            <Tab label="库存调整" />
            <Tab label="库存转移" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          {/* 搜索和过滤 */}
          <Box sx={{ mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
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
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth>
                  <InputLabel>仓库</InputLabel>
                  <Select
                    value={warehouseFilter}
                    onChange={(e) => setWarehouseFilter(e.target.value)}
                    label="仓库"
                  >
                    <MenuItem value="">
                      <em>全部仓库</em>
                    </MenuItem>
                    {warehousesData?.map((warehouse) => (
                      <MenuItem key={warehouse.id} value={warehouse.id}>
                        {warehouse.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth>
                  <InputLabel>库存状态</InputLabel>
                  <Select
                    value={stockStatusFilter}
                    onChange={(e) => setStockStatusFilter(e.target.value)}
                    label="库存状态"
                  >
                    <MenuItem value="">
                      <em>全部状态</em>
                    </MenuItem>
                    <MenuItem value="normal">正常</MenuItem>
                    <MenuItem value="low">库存不足</MenuItem>
                    <MenuItem value="high">库存过多</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={() => {
                    setSearch('');
                    setWarehouseFilter('');
                    setCategoryFilter('');
                    setStockStatusFilter('');
                  }}
                >
                  重置
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => setAdjustmentDialogOpen(true)}
                  >
                    库存调整
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<SwapHoriz />}
                    onClick={() => setTransferDialogOpen(true)}
                  >
                    库存转移
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </Box>

          {/* 库存列表 */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>产品信息</TableCell>
                  <TableCell>仓库</TableCell>
                  <TableCell align="right">当前库存</TableCell>
                  <TableCell align="right">最小库存</TableCell>
                  <TableCell align="right">最大库存</TableCell>
                  <TableCell>库存状态</TableCell>
                  <TableCell>最后更新</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : inventoryItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography color="textSecondary">暂无库存数据</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  inventoryItems.map((item) => (
                    <TableRow key={`${item.productId}-${item.warehouseId}`}>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {item.product?.name}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            SKU: {item.product?.sku}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Storage fontSize="small" />
                          <Typography variant="body2">
                            {item.warehouse?.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="medium">
                          {item.quantity} {item.product?.unit || '件'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {item.minStock} {item.product?.unit || '件'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {item.maxStock} {item.product?.unit || '件'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getStockStatusText(item.quantity, item.minStock, item.maxStock)}
                          color={getStockStatusColor(item.quantity, item.minStock, item.maxStock)}
                          size="small"
                          icon={
                            item.quantity <= item.minStock ? (
                              <Warning fontSize="small" />
                            ) : item.quantity >= item.maxStock ? (
                              <Error fontSize="small" />
                            ) : (
                              <CheckCircle fontSize="small" />
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="textSecondary">
                          {new Date(item.updatedAt).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={total}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              labelRowsPerPage="每页行数:"
              labelDisplayedRows={({ from, to, count }) =>
                `${from}-${to} 共 ${count !== -1 ? count : `超过 ${to}`} 条`
              }
            />
          </TableContainer>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Inventory sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              库存调整
            </Typography>
            <Typography color="textSecondary" sx={{ mb: 3 }}>
              点击下方按钮进行库存调整操作
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<Add />}
              onClick={() => setAdjustmentDialogOpen(true)}
            >
              开始调整
            </Button>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <SwapHoriz sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              库存转移
            </Typography>
            <Typography color="textSecondary" sx={{ mb: 3 }}>
              在不同仓库之间转移库存
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<SwapHoriz />}
              onClick={() => setTransferDialogOpen(true)}
            >
              开始转移
            </Button>
          </Box>
        </TabPanel>
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
    </Box>
  );
};

export default InventoryPage;
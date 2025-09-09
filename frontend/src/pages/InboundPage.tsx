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
} from '@mui/material';
// 导入Grid组件
import Grid from '@mui/material/Grid';
import {
  Paper,
  Stepper,
  Step,
  StepLabel,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Fab,
  Badge,
} from '@mui/material';
import {
  Search,
  Add,
  Edit,
  Delete,
  Visibility,
  CheckCircle,
  Cancel,
  Pending,
  LocalShipping,
  Inventory,
  Receipt,
  FilterList,
  GetApp,
  Print,
  Assignment,
  Schedule,
  Done,
  Close,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { queryKeys } from '../utils/queryClient';
import { api } from '../services/api';
import type {
  InboundOrder,
  InboundOrderItem,
  Warehouse,
  Product,
  Supplier,
  CreateInboundOrderRequest,
  UpdateInboundOrderRequest,
  InboundOrderQueryParams,
} from '../types/api';

// 入库单项验证
const inboundItemSchema = z.object({
  productId: z.string().min(1, '请选择产品'),
  expectedQuantity: z.number().min(1, '预期数量必须大于0'),
  actualQuantity: z.number().min(0, '实际数量不能小于0').optional(),
  unitPrice: z.number().min(0, '单价不能小于0'),
  remark: z.string().optional(),
});

// 入库单验证
const inboundOrderSchema = z.object({
  orderNumber: z.string().min(1, '请输入入库单号'),
  warehouseId: z.string().min(1, '请选择仓库'),
  supplierId: z.string().min(1, '请选择供应商'),
  expectedDate: z.string().min(1, '请选择预期到货日期'),
  remark: z.string().optional(),
  items: z.array(inboundItemSchema).min(1, '至少添加一个产品'),
});

type InboundOrderFormData = z.infer<typeof inboundOrderSchema>;

interface InboundOrderDialogProps {
  open: boolean;
  order?: InboundOrder;
  onClose: () => void;
  onSubmit: (data: InboundOrderFormData) => void;
  loading?: boolean;
}

const InboundOrderDialog: React.FC<InboundOrderDialogProps> = ({
  open,
  order,
  onClose,
  onSubmit,
  loading = false,
}) => {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InboundOrderFormData>({
    resolver: zodResolver(inboundOrderSchema),
    defaultValues: {
      orderNumber: order?.orderNumber || '',
      warehouseId: order?.warehouseId || '',
      supplierId: order?.supplierId || '',
      expectedDate: order?.expectedDate ? order.expectedDate.split('T')[0] : '',
      remark: order?.remark || '',
      items: order?.items || [{
        productId: '',
        expectedQuantity: 1,
        actualQuantity: 0,
        unitPrice: 0,
        remark: '',
      }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  // 获取仓库列表
  const { data: warehousesData } = useQuery({
    queryKey: queryKeys.warehouses.all,
    queryFn: async () => {
      const response = await api.get('/warehouses');
      return response.data.data.list;
    },
  });

  // 获取供应商列表
  const { data: suppliersData } = useQuery({
    queryKey: queryKeys.suppliers.all,
    queryFn: async () => {
      const response = await api.get<Supplier[]>('/suppliers');
      // 确保返回的是数组
      return Array.isArray(response.data.data) ? response.data.data : [];
    },
  });

  // 获取产品列表
  const { data: productsData } = useQuery({
    queryKey: queryKeys.products.all,
    queryFn: async () => {
      const response = await api.get<Product[]>('/products');
      return response.data.data.list;
    },
  });

  React.useEffect(() => {
    if (open) {
      reset({
        orderNumber: order?.orderNumber || `IN${Date.now()}`,
        warehouseId: order?.warehouseId || '',
        supplierId: order?.supplierId || '',
        expectedDate: order?.expectedDate ? order.expectedDate.split('T')[0] : '',
        remark: order?.remark || '',
        items: order?.items || [{
          productId: '',
          expectedQuantity: 1,
          actualQuantity: 0,
          unitPrice: 0,
          remark: '',
        }],
      });
    }
  }, [open, order, reset]);

  const handleFormSubmit = (data: InboundOrderFormData) => {
    onSubmit(data);
  };

  const addItem = () => {
    append({
      productId: '',
      expectedQuantity: 1,
      actualQuantity: 0,
      unitPrice: 0,
      remark: '',
    });
  };

  const removeItem = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Receipt />
          {order ? '编辑入库单' : '新增入库单'}
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box component="form" sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            <Grid xs={12} sm={6}>
              <Controller
                name="orderNumber"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="入库单号"
                    required
                    error={!!errors.orderNumber}
                    helperText={errors.orderNumber?.message}
                    disabled={loading || !!order}
                  />
                )}
              />
            </Grid>
            <Grid xs={12} sm={6}>
              <Controller
                name="expectedDate"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="预期到货日期"
                    type="date"
                    required
                    error={!!errors.expectedDate}
                    helperText={errors.expectedDate?.message}
                    disabled={loading}
                    InputLabelProps={{ shrink: true }}
                  />
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
            <Grid item xs={12} sm={6}>
              <Controller
                name="supplierId"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.supplierId}>
                    <InputLabel>供应商</InputLabel>
                    <Select
                      {...field}
                      label="供应商"
                      disabled={loading}
                    >
                      {suppliersData?.map((supplier) => (
                        <MenuItem key={supplier.id} value={supplier.id}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography>{supplier.name}</Typography>
                            <Chip label={supplier.code} size="small" variant="outlined" />
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.supplierId && (
                      <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                        {errors.supplierId.message}
                      </Typography>
                    )}
                  </FormControl>
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
                    rows={2}
                    disabled={loading}
                  />
                )}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* 产品列表 */}
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">产品明细</Typography>
            <Button
              variant="outlined"
              startIcon={<Add />}
              onClick={addItem}
              disabled={loading}
            >
              添加产品
            </Button>
          </Box>

          {fields.map((field, index) => (
            <Card key={field.id} sx={{ mb: 2, p: 2 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={3}>
                  <Controller
                    name={`items.${index}.productId`}
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth error={!!errors.items?.[index]?.productId}>
                        <InputLabel>产品</InputLabel>
                        <Select
                          {...field}
                          label="产品"
                          disabled={loading}
                        >
                          {productsData?.map((product) => (
                            <MenuItem key={product.id} value={product.id}>
                              <Box>
                                <Typography variant="body2">{product.name}</Typography>
                                <Typography variant="caption" color="textSecondary">
                                  SKU: {product.sku}
                                </Typography>
                              </Box>
                            </MenuItem>
                          ))}
                        </Select>
                        {errors.items?.[index]?.productId && (
                          <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                            {errors.items[index]?.productId?.message}
                          </Typography>
                        )}
                      </FormControl>
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={2}>
                  <Controller
                    name={`items.${index}.expectedQuantity`}
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="预期数量"
                        type="number"
                        required
                        error={!!errors.items?.[index]?.expectedQuantity}
                        helperText={errors.items?.[index]?.expectedQuantity?.message}
                        disabled={loading}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    )}
                  />
                </Grid>
                {order && (
                  <Grid item xs={12} sm={2}>
                    <Controller
                      name={`items.${index}.actualQuantity`}
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="实际数量"
                          type="number"
                          error={!!errors.items?.[index]?.actualQuantity}
                          helperText={errors.items?.[index]?.actualQuantity?.message}
                          disabled={loading}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      )}
                    />
                  </Grid>
                )}
                <Grid item xs={12} sm={2}>
                  <Controller
                    name={`items.${index}.unitPrice`}
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="单价"
                        type="number"
                        required
                        error={!!errors.items?.[index]?.unitPrice}
                        helperText={errors.items?.[index]?.unitPrice?.message}
                        disabled={loading}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        InputProps={{
                          startAdornment: <InputAdornment position="start">¥</InputAdornment>,
                        }}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={order ? 2 : 3}>
                  <Controller
                    name={`items.${index}.remark`}
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="备注"
                        disabled={loading}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={1}>
                  <IconButton
                    color="error"
                    onClick={() => removeItem(index)}
                    disabled={loading || fields.length === 1}
                  >
                    <Delete />
                  </IconButton>
                </Grid>
              </Grid>
            </Card>
          ))}

          {errors.items && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {errors.items.message}
            </Alert>
          )}
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

interface InboundOrderDetailDialogProps {
  open: boolean;
  order?: InboundOrder;
  onClose: () => void;
  onApprove?: (orderId: string) => void;
  onReject?: (orderId: string) => void;
  onReceive?: (orderId: string) => void;
  loading?: boolean;
}

const InboundOrderDetailDialog: React.FC<InboundOrderDetailDialogProps> = ({
  open,
  order,
  onClose,
  onApprove,
  onReject,
  onReceive,
  loading = false,
}) => {
  if (!order) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'info';
      case 'received': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '待审核';
      case 'approved': return '已审核';
      case 'received': return '已收货';
      case 'rejected': return '已拒绝';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Pending />;
      case 'approved': return <CheckCircle />;
      case 'received': return <Done />;
      case 'rejected': return <Cancel />;
      default: return <Schedule />;
    }
  };

  const steps = ['创建', '审核', '收货'];
  const activeStep = order.status === 'pending' ? 0 : order.status === 'approved' ? 1 : 2;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Receipt />
            入库单详情
          </Box>
          <Chip
            label={getStatusText(order.status)}
            color={getStatusColor(order.status) as any}
            icon={getStatusIcon(order.status)}
          />
        </Box>
      </DialogTitle>
      <DialogContent>
        {/* 基本信息 */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              基本信息
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="textSecondary">
                  入库单号
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {order.orderNumber}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="textSecondary">
                  仓库
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {order.warehouse?.name}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="textSecondary">
                  供应商
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {order.supplier?.name}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="textSecondary">
                  预期到货日期
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {new Date(order.expectedDate).toLocaleDateString()}
                </Typography>
              </Grid>
              {order.remark && (
                <Grid item xs={12}>
                  <Typography variant="body2" color="textSecondary">
                    备注
                  </Typography>
                  <Typography variant="body1">
                    {order.remark}
                  </Typography>
                </Grid>
              )}
            </Grid>
          </CardContent>
        </Card>

        {/* 流程状态 */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              处理流程
            </Typography>
            <Stepper activeStep={activeStep} alternativeLabel>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </CardContent>
        </Card>

        {/* 产品明细 */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              产品明细
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>产品</TableCell>
                    <TableCell align="right">预期数量</TableCell>
                    <TableCell align="right">实际数量</TableCell>
                    <TableCell align="right">单价</TableCell>
                    <TableCell align="right">金额</TableCell>
                    <TableCell>备注</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {order.items?.map((item, index) => (
                    <TableRow key={index}>
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
                      <TableCell align="right">
                        {item.expectedQuantity} {item.product?.unit || '件'}
                      </TableCell>
                      <TableCell align="right">
                        {item.actualQuantity || '-'} {item.product?.unit || '件'}
                      </TableCell>
                      <TableCell align="right">
                        ¥{item.unitPrice.toFixed(2)}
                      </TableCell>
                      <TableCell align="right">
                        ¥{((item.actualQuantity || item.expectedQuantity) * item.unitPrice).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {item.remark || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>
          关闭
        </Button>
        {order.status === 'pending' && onApprove && onReject && (
          <>
            <Button
              onClick={() => onReject(order.id)}
              color="error"
              disabled={loading}
            >
              拒绝
            </Button>
            <Button
              onClick={() => onApprove(order.id)}
              variant="contained"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : undefined}
            >
              {loading ? '审核中...' : '审核通过'}
            </Button>
          </>
        )}
        {order.status === 'approved' && onReceive && (
          <Button
            onClick={() => onReceive(order.id)}
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : undefined}
          >
            {loading ? '收货中...' : '确认收货'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

const InboundPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<InboundOrder | undefined>();

  const queryClient = useQueryClient();

  // 构建查询参数
  const queryParams: InboundOrderQueryParams = {
    page: page + 1,
    limit: rowsPerPage,
    search,
    status: statusFilter || undefined,
    warehouseId: warehouseFilter || undefined,
  };

  // 获取入库单列表
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['inbound-orders', queryParams],
    queryFn: async () => {
      const response = await api.get<{
        data: {
          list: InboundOrder[];
          pagination: {
            total: number;
            page: number;
            limit: number;
          };
        };
      }>('/inbound-orders', { params: queryParams });
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

  // 创建入库单
  const createMutation = useMutation({
    mutationFn: async (data: CreateInboundOrderRequest) => {
      const response = await api.post<InboundOrder>('/inbound-orders', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbound-orders'] });
      setDialogOpen(false);
      setSelectedOrder(undefined);
    },
  });

  // 更新入库单
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateInboundOrderRequest }) => {
      const response = await api.put<InboundOrder>(`/inbound-orders/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbound-orders'] });
      setDialogOpen(false);
      setSelectedOrder(undefined);
    },
  });

  // 审核入库单
  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/inbound-orders/${id}/approve`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbound-orders'] });
      setDetailDialogOpen(false);
    },
  });

  // 拒绝入库单
  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/inbound-orders/${id}/reject`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbound-orders'] });
      setDetailDialogOpen(false);
    },
  });

  // 确认收货
  const receiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/inbound-orders/${id}/receive`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbound-orders'] });
      setDetailDialogOpen(false);
    },
  });

  const handleCreate = () => {
    setSelectedOrder(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (order: InboundOrder) => {
    setSelectedOrder(order);
    setDialogOpen(true);
  };

  const handleView = (order: InboundOrder) => {
    setSelectedOrder(order);
    setDetailDialogOpen(true);
  };

  const handleSubmit = (data: InboundOrderFormData) => {
    if (selectedOrder) {
      updateMutation.mutate({ id: selectedOrder.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'info';
      case 'received': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '待审核';
      case 'approved': return '已审核';
      case 'received': return '已收货';
      case 'rejected': return '已拒绝';
      default: return status;
    }
  };

  const orders = ordersData?.list || [];
  const total = ordersData?.pagination?.total || 0;

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
        入库管理
      </Typography>

      {/* 操作栏 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                placeholder="搜索入库单..."
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
                <InputLabel>状态</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="状态"
                >
                  <MenuItem value="">
                    <em>全部状态</em>
                  </MenuItem>
                  <MenuItem value="pending">待审核</MenuItem>
                  <MenuItem value="approved">已审核</MenuItem>
                  <MenuItem value="received">已收货</MenuItem>
                  <MenuItem value="rejected">已拒绝</MenuItem>
                </Select>
              </FormControl>
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
              <Button
                fullWidth
                variant="outlined"
                startIcon={<FilterList />}
                onClick={() => {
                  setSearch('');
                  setStatusFilter('');
                  setWarehouseFilter('');
                }}
              >
                重置
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<Add />}
                onClick={handleCreate}
              >
                新增入库单
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 入库单列表 */}
      <Card>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>入库单号</TableCell>
                  <TableCell>仓库</TableCell>
                  <TableCell>供应商</TableCell>
                  <TableCell>预期到货日期</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell>创建时间</TableCell>
                  <TableCell align="center">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography color="textSecondary">暂无入库单数据</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {order.orderNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {order.warehouse?.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {order.supplier?.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(order.expectedDate).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusText(order.status)}
                          color={getStatusColor(order.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="textSecondary">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="查看详情">
                            <IconButton
                              size="small"
                              onClick={() => handleView(order)}
                            >
                              <Visibility fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {order.status === 'pending' && (
                            <Tooltip title="编辑">
                              <IconButton
                                size="small"
                                onClick={() => handleEdit(order)}
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
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
        </CardContent>
      </Card>

      {/* 新增/编辑对话框 */}
      <InboundOrderDialog
        open={dialogOpen}
        order={selectedOrder}
        onClose={() => {
          setDialogOpen(false);
          setSelectedOrder(undefined);
        }}
        onSubmit={handleSubmit}
        loading={createMutation.isPending || updateMutation.isPending}
      />

      {/* 详情对话框 */}
      <InboundOrderDetailDialog
        open={detailDialogOpen}
        order={selectedOrder}
        onClose={() => {
          setDetailDialogOpen(false);
          setSelectedOrder(undefined);
        }}
        onApprove={(id) => approveMutation.mutate(id)}
        onReject={(id) => rejectMutation.mutate(id)}
        onReceive={(id) => receiveMutation.mutate(id)}
        loading={approveMutation.isPending || rejectMutation.isPending || receiveMutation.isPending}
      />

      {/* 悬浮按钮 */}
      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={handleCreate}
      >
        <Add />
      </Fab>
    </Box>
  );
};

export default InboundPage;
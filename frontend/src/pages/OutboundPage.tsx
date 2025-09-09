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
  LinearProgress,
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
  Assignment,
  FilterList,
  GetApp,
  Print,
  Schedule,
  Done,
  Close,
  ShoppingCart,
  Person,
  LocationOn,
  Phone,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { queryKeys } from '../utils/queryClient';
import { api } from '../services/api';
import type {
  OutboundOrder,
  OutboundOrderItem,
  Warehouse,
  Product,
  Customer,
  CreateOutboundOrderRequest,
  UpdateOutboundOrderRequest,
  OutboundOrderQueryParams,
} from '../types/api';

// 出库单项验证
const outboundItemSchema = z.object({
  productId: z.string().min(1, '请选择产品'),
  requestedQuantity: z.number().min(1, '请求数量必须大于0'),
  pickedQuantity: z.number().min(0, '拣货数量不能小于0').optional(),
  unitPrice: z.number().min(0, '单价不能小于0'),
  remark: z.string().optional(),
});

// 出库单验证
const outboundOrderSchema = z.object({
  orderNumber: z.string().min(1, '请输入出库单号'),
  warehouseId: z.string().min(1, '请选择仓库'),
  customerId: z.string().min(1, '请选择客户'),
  expectedDate: z.string().min(1, '请选择预期发货日期'),
  shippingAddress: z.string().min(1, '请输入收货地址'),
  contactPerson: z.string().min(1, '请输入联系人'),
  contactPhone: z.string().min(1, '请输入联系电话'),
  remark: z.string().optional(),
  items: z.array(outboundItemSchema).min(1, '至少添加一个产品'),
});

type OutboundOrderFormData = z.infer<typeof outboundOrderSchema>;

interface OutboundOrderDialogProps {
  open: boolean;
  order?: OutboundOrder;
  onClose: () => void;
  onSubmit: (data: OutboundOrderFormData) => void;
  loading?: boolean;
}

const OutboundOrderDialog: React.FC<OutboundOrderDialogProps> = ({
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
    watch,
    formState: { errors },
  } = useForm<OutboundOrderFormData>({
    resolver: zodResolver(outboundOrderSchema),
    defaultValues: {
      orderNumber: order?.orderNumber || '',
      warehouseId: order?.warehouseId || '',
      customerId: order?.customerId || '',
      expectedDate: order?.expectedDate ? order.expectedDate.split('T')[0] : '',
      shippingAddress: order?.shippingAddress || '',
      contactPerson: order?.contactPerson || '',
      contactPhone: order?.contactPhone || '',
      remark: order?.remark || '',
      items: order?.items || [{
        productId: '',
        requestedQuantity: 1,
        pickedQuantity: 0,
        unitPrice: 0,
        remark: '',
      }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const selectedCustomerId = watch('customerId');

  // 获取仓库列表
  const { data: warehousesData } = useQuery({
    queryKey: queryKeys.warehouses.all,
    queryFn: async () => {
      const response = await api.get('/warehouses');
      return response.data.data.list;
    },
  });

  // 获取客户列表
  const { data: customersData } = useQuery({
    queryKey: queryKeys.customers.all,
    queryFn: async () => {
      const response = await api.get<Customer[]>('/customers');
      return response.data.data.data;
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

  // 获取选中客户的详细信息
  const { data: selectedCustomer } = useQuery({
    queryKey: ['customers', selectedCustomerId],
    queryFn: async () => {
      if (!selectedCustomerId) return null;
      const response = await api.get<Customer>(`/customers/${selectedCustomerId}`);
      return response.data.data;
    },
    enabled: !!selectedCustomerId,
  });

  React.useEffect(() => {
    if (open) {
      reset({
        orderNumber: order?.orderNumber || `OUT${Date.now()}`,
        warehouseId: order?.warehouseId || '',
        customerId: order?.customerId || '',
        expectedDate: order?.expectedDate ? order.expectedDate.split('T')[0] : '',
        shippingAddress: order?.shippingAddress || '',
        contactPerson: order?.contactPerson || '',
        contactPhone: order?.contactPhone || '',
        remark: order?.remark || '',
        items: order?.items || [{
          productId: '',
          requestedQuantity: 1,
          pickedQuantity: 0,
          unitPrice: 0,
          remark: '',
        }],
      });
    }
  }, [open, order, reset]);

  // 当选择客户时，自动填充地址和联系信息
  React.useEffect(() => {
    if (selectedCustomer && !order) {
      reset((prev) => ({
        ...prev,
        shippingAddress: selectedCustomer.address || '',
        contactPerson: selectedCustomer.contactPerson || '',
        contactPhone: selectedCustomer.contactPhone || '',
      }));
    }
  }, [selectedCustomer, order, reset]);

  const handleFormSubmit = (data: OutboundOrderFormData) => {
    onSubmit(data);
  };

  const addItem = () => {
    append({
      productId: '',
      requestedQuantity: 1,
      pickedQuantity: 0,
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
          <ShoppingCart />
          {order ? '编辑出库单' : '新增出库单'}
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box component="form" sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Controller
                name="orderNumber"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="出库单号"
                    required
                    error={!!errors.orderNumber}
                    helperText={errors.orderNumber?.message}
                    disabled={loading || !!order}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="expectedDate"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="预期发货日期"
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
                name="customerId"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.customerId}>
                    <InputLabel>客户</InputLabel>
                    <Select
                      {...field}
                      label="客户"
                      disabled={loading}
                    >
                      {customersData?.map((customer) => (
                        <MenuItem key={customer.id} value={customer.id}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Person fontSize="small" />
                            <Typography>{customer.name}</Typography>
                            <Chip label={customer.code} size="small" variant="outlined" />
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.customerId && (
                      <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                        {errors.customerId.message}
                      </Typography>
                    )}
                  </FormControl>
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <Controller
                name="shippingAddress"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="收货地址"
                    required
                    error={!!errors.shippingAddress}
                    helperText={errors.shippingAddress?.message}
                    disabled={loading}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LocationOn />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="contactPerson"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="联系人"
                    required
                    error={!!errors.contactPerson}
                    helperText={errors.contactPerson?.message}
                    disabled={loading}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Person />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="contactPhone"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="联系电话"
                    required
                    error={!!errors.contactPhone}
                    helperText={errors.contactPhone?.message}
                    disabled={loading}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Phone />
                        </InputAdornment>
                      ),
                    }}
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
                    name={`items.${index}.requestedQuantity`}
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="请求数量"
                        type="number"
                        required
                        error={!!errors.items?.[index]?.requestedQuantity}
                        helperText={errors.items?.[index]?.requestedQuantity?.message}
                        disabled={loading}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    )}
                  />
                </Grid>
                {order && (
                  <Grid item xs={12} sm={2}>
                    <Controller
                      name={`items.${index}.pickedQuantity`}
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="拣货数量"
                          type="number"
                          error={!!errors.items?.[index]?.pickedQuantity}
                          helperText={errors.items?.[index]?.pickedQuantity?.message}
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

interface OutboundOrderDetailDialogProps {
  open: boolean;
  order?: OutboundOrder;
  onClose: () => void;
  onApprove?: (orderId: string) => void;
  onReject?: (orderId: string) => void;
  onPick?: (orderId: string) => void;
  onShip?: (orderId: string) => void;
  loading?: boolean;
}

const OutboundOrderDetailDialog: React.FC<OutboundOrderDetailDialogProps> = ({
  open,
  order,
  onClose,
  onApprove,
  onReject,
  onPick,
  onShip,
  loading = false,
}) => {
  if (!order) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'info';
      case 'picking': return 'primary';
      case 'picked': return 'secondary';
      case 'shipped': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '待审核';
      case 'approved': return '已审核';
      case 'picking': return '拣货中';
      case 'picked': return '已拣货';
      case 'shipped': return '已发货';
      case 'rejected': return '已拒绝';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Pending />;
      case 'approved': return <CheckCircle />;
      case 'picking': return <Assignment />;
      case 'picked': return <Inventory />;
      case 'shipped': return <LocalShipping />;
      case 'rejected': return <Cancel />;
      default: return <Schedule />;
    }
  };

  const steps = ['创建', '审核', '拣货', '发货'];
  const getActiveStep = (status: string) => {
    switch (status) {
      case 'pending': return 0;
      case 'approved': return 1;
      case 'picking': return 2;
      case 'picked': return 2;
      case 'shipped': return 3;
      default: return 0;
    }
  };

  const activeStep = getActiveStep(order.status);

  // 计算拣货进度
  const calculatePickingProgress = () => {
    if (!order.items || order.items.length === 0) return 0;
    const totalItems = order.items.length;
    const pickedItems = order.items.filter(item => 
      (item.pickedQuantity || 0) >= item.requestedQuantity
    ).length;
    return (pickedItems / totalItems) * 100;
  };

  const pickingProgress = calculatePickingProgress();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ShoppingCart />
            出库单详情
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
                  出库单号
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
                  客户
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {order.customer?.name}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="textSecondary">
                  预期发货日期
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {new Date(order.expectedDate).toLocaleDateString()}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" color="textSecondary">
                  收货地址
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {order.shippingAddress}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="textSecondary">
                  联系人
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {order.contactPerson}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="textSecondary">
                  联系电话
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {order.contactPhone}
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
            {(order.status === 'picking' || order.status === 'picked') && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  拣货进度: {pickingProgress.toFixed(0)}%
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={pickingProgress} 
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
            )}
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
                    <TableCell align="right">请求数量</TableCell>
                    <TableCell align="right">拣货数量</TableCell>
                    <TableCell align="right">单价</TableCell>
                    <TableCell align="right">金额</TableCell>
                    <TableCell align="center">状态</TableCell>
                    <TableCell>备注</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {order.items?.map((item, index) => {
                    const pickedQuantity = item.pickedQuantity || 0;
                    const isFullyPicked = pickedQuantity >= item.requestedQuantity;
                    const pickingRate = (pickedQuantity / item.requestedQuantity) * 100;
                    
                    return (
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
                          {item.requestedQuantity} {item.product?.unit || '件'}
                        </TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                            <Typography variant="body2">
                              {pickedQuantity} {item.product?.unit || '件'}
                            </Typography>
                            {order.status === 'picking' && (
                              <Chip
                                label={`${pickingRate.toFixed(0)}%`}
                                size="small"
                                color={isFullyPicked ? 'success' : 'warning'}
                              />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          ¥{item.unitPrice.toFixed(2)}
                        </TableCell>
                        <TableCell align="right">
                          ¥{(pickedQuantity * item.unitPrice).toFixed(2)}
                        </TableCell>
                        <TableCell align="center">
                          {order.status === 'picking' || order.status === 'picked' ? (
                            <Chip
                              label={isFullyPicked ? '已拣货' : '待拣货'}
                              color={isFullyPicked ? 'success' : 'warning'}
                              size="small"
                              icon={isFullyPicked ? <CheckCircle /> : <Pending />}
                            />
                          ) : (
                            <Chip
                              label="待处理"
                              color="default"
                              size="small"
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {item.remark || '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
        {order.status === 'approved' && onPick && (
          <Button
            onClick={() => onPick(order.id)}
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : undefined}
          >
            {loading ? '开始拣货...' : '开始拣货'}
          </Button>
        )}
        {order.status === 'picked' && onShip && (
          <Button
            onClick={() => onShip(order.id)}
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : undefined}
          >
            {loading ? '发货中...' : '确认发货'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

const OutboundPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OutboundOrder | undefined>();

  const queryClient = useQueryClient();

  // 构建查询参数
  const queryParams: OutboundOrderQueryParams = {
    page: page + 1,
    limit: rowsPerPage,
    search,
    status: statusFilter || undefined,
    warehouseId: warehouseFilter || undefined,
  };

  // 获取出库单列表
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['outbound-orders', queryParams],
    queryFn: async () => {
      const response = await api.get<{
        data: {
          list: OutboundOrder[];
          pagination: {
            total: number;
            page: number;
            limit: number;
          };
        };
      }>('/outbound-orders', { params: queryParams });
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

  // 创建出库单
  const createMutation = useMutation({
    mutationFn: async (data: CreateOutboundOrderRequest) => {
      const response = await api.post<OutboundOrder>('/outbound-orders', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outbound-orders'] });
      setDialogOpen(false);
      setSelectedOrder(undefined);
    },
  });

  // 更新出库单
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateOutboundOrderRequest }) => {
      const response = await api.put<OutboundOrder>(`/outbound-orders/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outbound-orders'] });
      setDialogOpen(false);
      setSelectedOrder(undefined);
    },
  });

  // 审核出库单
  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/outbound-orders/${id}/approve`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outbound-orders'] });
      setDetailDialogOpen(false);
    },
  });

  // 拒绝出库单
  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/outbound-orders/${id}/reject`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outbound-orders'] });
      setDetailDialogOpen(false);
    },
  });

  // 开始拣货
  const pickMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/outbound-orders/${id}/pick`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outbound-orders'] });
      setDetailDialogOpen(false);
    },
  });

  // 确认发货
  const shipMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/outbound-orders/${id}/ship`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outbound-orders'] });
      setDetailDialogOpen(false);
    },
  });

  const handleCreate = () => {
    setSelectedOrder(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (order: OutboundOrder) => {
    setSelectedOrder(order);
    setDialogOpen(true);
  };

  const handleView = (order: OutboundOrder) => {
    setSelectedOrder(order);
    setDetailDialogOpen(true);
  };

  const handleSubmit = (data: OutboundOrderFormData) => {
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
      case 'picking': return 'primary';
      case 'picked': return 'secondary';
      case 'shipped': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '待审核';
      case 'approved': return '已审核';
      case 'picking': return '拣货中';
      case 'picked': return '已拣货';
      case 'shipped': return '已发货';
      case 'rejected': return '已拒绝';
      default: return status;
    }
  };

  const orders = ordersData?.list || [];
  const total = ordersData?.pagination?.total || 0;

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
        出库管理
      </Typography>

      {/* 操作栏 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                placeholder="搜索出库单..."
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
                  <MenuItem value="picking">拣货中</MenuItem>
                  <MenuItem value="picked">已拣货</MenuItem>
                  <MenuItem value="shipped">已发货</MenuItem>
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
                新增出库单
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 出库单列表 */}
      <Card>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>出库单号</TableCell>
                  <TableCell>仓库</TableCell>
                  <TableCell>客户</TableCell>
                  <TableCell>预期发货日期</TableCell>
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
                      <Typography color="textSecondary">暂无出库单数据</Typography>
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
                          {order.customer?.name}
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
      <OutboundOrderDialog
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
      <OutboundOrderDetailDialog
        open={detailDialogOpen}
        order={selectedOrder}
        onClose={() => {
          setDetailDialogOpen(false);
          setSelectedOrder(undefined);
        }}
        onApprove={(id) => approveMutation.mutate(id)}
        onReject={(id) => rejectMutation.mutate(id)}
        onPick={(id) => pickMutation.mutate(id)}
        onShip={(id) => shipMutation.mutate(id)}
        loading={
          approveMutation.isPending || 
          rejectMutation.isPending || 
          pickMutation.isPending || 
          shipMutation.isPending
        }
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

export default OutboundPage;
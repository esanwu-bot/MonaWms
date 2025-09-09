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
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Search,
  Warehouse as WarehouseIcon,
  LocationOn,
  Phone,
  Person,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { queryKeys } from '../utils/queryClient';
import { api } from '../services/api';
import type { Warehouse, CreateWarehouseRequest, UpdateWarehouseRequest, PaginatedResponse } from '../types/api';

// 表单验证模式
const warehouseSchema = z.object({
  code: z.string().min(1, '请输入仓库编码').max(50, '编码不能超过50个字符'),
  name: z.string().min(1, '请输入仓库名称').max(100, '名称不能超过100个字符'),
  description: z.string().optional(),
  address: z.string().optional(),
  contactPerson: z.string().optional(),
  contactPhone: z.string().optional(),
});

type WarehouseFormData = z.infer<typeof warehouseSchema>;

interface WarehouseDialogProps {
  open: boolean;
  warehouse?: Warehouse;
  onClose: () => void;
  onSubmit: (data: WarehouseFormData) => void;
  loading?: boolean;
}

const WarehouseDialog: React.FC<WarehouseDialogProps> = ({
  open,
  warehouse,
  onClose,
  onSubmit,
  loading = false,
}) => {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<WarehouseFormData>({
    resolver: zodResolver(warehouseSchema),
    defaultValues: {
      code: warehouse?.code || '',
      name: warehouse?.name || '',
      description: warehouse?.description || '',
      address: warehouse?.address || '',
      contactPerson: warehouse?.contactPerson || '',
      contactPhone: warehouse?.contactPhone || '',
    },
  });

  React.useEffect(() => {
    if (open) {
      reset({
        code: warehouse?.code || '',
        name: warehouse?.name || '',
        description: warehouse?.description || '',
        address: warehouse?.address || '',
        contactPerson: warehouse?.contactPerson || '',
        contactPhone: warehouse?.contactPhone || '',
      });
    }
  }, [open, warehouse, reset]);

  const handleFormSubmit = (data: WarehouseFormData) => {
    onSubmit(data);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarehouseIcon />
          {warehouse ? '编辑仓库' : '新增仓库'}
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
                    label="仓库编码"
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
                    label="仓库名称"
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
                name="address"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="地址"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LocationOn />
                        </InputAdornment>
                      ),
                    }}
                    error={!!errors.address}
                    helperText={errors.address?.message}
                    disabled={loading}
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
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Person />
                        </InputAdornment>
                      ),
                    }}
                    error={!!errors.contactPerson}
                    helperText={errors.contactPerson?.message}
                    disabled={loading}
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
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Phone />
                        </InputAdornment>
                      ),
                    }}
                    error={!!errors.contactPhone}
                    helperText={errors.contactPhone?.message}
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
          {loading ? '保存中...' : '保存'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const WarehousesPage: React.FC = () => {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | undefined>();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [warehouseToDelete, setWarehouseToDelete] = useState<Warehouse | undefined>();

  const queryClient = useQueryClient();

  // 获取仓库列表
  const { data: warehousesData, isLoading } = useQuery({
    queryKey: queryKeys.warehouses.list({ page: page + 1, pageSize, search }),
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Warehouse[]>>('/warehouses', {
        params: { page: page + 1, pageSize, search },
      });
      return response.data;
    },
  });

  // 创建仓库
  const createMutation = useMutation({
    mutationFn: async (data: CreateWarehouseRequest) => {
      const response = await api.post<Warehouse>('/warehouses', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.warehouses.all });
      setDialogOpen(false);
      setSelectedWarehouse(undefined);
    },
  });

  // 更新仓库
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateWarehouseRequest }) => {
      const response = await api.put<Warehouse>(`/warehouses/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.warehouses.all });
      setDialogOpen(false);
      setSelectedWarehouse(undefined);
    },
  });

  // 删除仓库
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/warehouses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.warehouses.all });
      setDeleteConfirmOpen(false);
      setWarehouseToDelete(undefined);
    },
  });

  const handleCreate = () => {
    setSelectedWarehouse(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (warehouse: Warehouse) => {
    setSelectedWarehouse(warehouse);
    setDialogOpen(true);
  };

  const handleDelete = (warehouse: Warehouse) => {
    setWarehouseToDelete(warehouse);
    setDeleteConfirmOpen(true);
  };

  const handleSubmit = (data: WarehouseFormData) => {
    if (selectedWarehouse) {
      updateMutation.mutate({ id: selectedWarehouse.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleConfirmDelete = () => {
    if (warehouseToDelete) {
      deleteMutation.mutate(warehouseToDelete.id);
    }
  };

  const handlePageChange = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPageSize(parseInt(event.target.value, 10));
    setPage(0);
  };

  const warehouses = warehousesData?.data?.list || [];
  const pagination = warehousesData?.data?.pagination;

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
        仓库管理
      </Typography>

      {/* 操作栏 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <TextField
              placeholder="搜索仓库..."
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
              新增仓库
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* 仓库列表 */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>仓库编码</TableCell>
                <TableCell>仓库名称</TableCell>
                <TableCell>地址</TableCell>
                <TableCell>联系人</TableCell>
                <TableCell>联系电话</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>创建时间</TableCell>
                <TableCell align="center">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : warehouses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography color="textSecondary">暂无数据</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                warehouses.map((warehouse) => (
                  <TableRow key={warehouse.id} hover>
                    <TableCell>{warehouse.code}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <WarehouseIcon fontSize="small" color="primary" />
                        {warehouse.name}
                      </Box>
                    </TableCell>
                    <TableCell>{warehouse.address || '-'}</TableCell>
                    <TableCell>{warehouse.contactPerson || '-'}</TableCell>
                    <TableCell>{warehouse.contactPhone || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={warehouse.isActive ? '启用' : '禁用'}
                        color={warehouse.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(warehouse.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="编辑">
                        <IconButton
                          size="small"
                          onClick={() => handleEdit(warehouse)}
                        >
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="删除">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(warehouse)}
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
      <WarehouseDialog
        open={dialogOpen}
        warehouse={selectedWarehouse}
        onClose={() => {
          setDialogOpen(false);
          setSelectedWarehouse(undefined);
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
            确定要删除仓库 "{warehouseToDelete?.name}" 吗？
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

export default WarehousesPage;
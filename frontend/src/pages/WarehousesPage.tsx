import React, { useState } from 'react';
import {
  Card,
  Button,
  Input,
  Table,
  Tag,
  Modal,
  Form,
  Select,
  Space,
  Typography,
  Divider,
  Alert,
  Spin,
  Tooltip,
  Pagination,
  Row,
  Col,
  message,
  Progress,
  Badge,
} from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  HomeOutlined,
  PhoneOutlined,
  UserOutlined,
  ExclamationCircleOutlined,
  SyncOutlined,
  PrinterOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { queryKeys } from '../utils/queryClient';
import { api } from '../services/api';
import type {
  Warehouse,
  CreateWarehouseRequest,
  UpdateWarehouseRequest,
  PaginatedResponse,
  ApiResponse,
} from '../types/api';

const { Title, Text } = Typography;
const { Option } = Select;
const { confirm } = Modal;

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
  const [form] = Form.useForm();
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
      form.setFieldsValue({
        code: warehouse?.code || '',
        name: warehouse?.name || '',
        description: warehouse?.description || '',
        address: warehouse?.address || '',
        contactPerson: warehouse?.contactPerson || '',
        contactPhone: warehouse?.contactPhone || '',
      });
    }
  }, [open, warehouse, reset, form]);

  const handleFormSubmit = (data: WarehouseFormData) => {
    onSubmit(data);
  };

  return (
    <Modal
      title={
        <Space>
          <HomeOutlined />
          {warehouse ? '编辑仓库' : '新增仓库'}
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
              handleSubmit(onSubmit)(values);
            });
          }}
        >
          {loading ? '保存中...' : '保存'}
        </Button>,
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit(handleFormSubmit)}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="仓库编码"
              name="code"
              validateStatus={errors.code ? 'error' : ''}
              help={errors.code?.message}
            >
              <Controller
                name="code"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="请输入仓库编码"
                    disabled={loading}
                  />
                )}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="仓库名称"
              name="name"
              validateStatus={errors.name ? 'error' : ''}
              help={errors.name?.message}
            >
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="请输入仓库名称"
                    disabled={loading}
                  />
                )}
              />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item
              label="描述"
              name="description"
            >
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <Input.TextArea
                    {...field}
                    rows={3}
                    placeholder="请输入描述"
                    disabled={loading}
                  />
                )}
              />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item
              label="地址"
              name="address"
            >
              <Controller
                name="address"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    prefix={<HomeOutlined />}
                    placeholder="请输入地址"
                    disabled={loading}
                  />
                )}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="联系人"
              name="contactPerson"
            >
              <Controller
                name="contactPerson"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    prefix={<UserOutlined />}
                    placeholder="请输入联系人"
                    disabled={loading}
                  />
                )}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="联系电话"
              name="contactPhone"
            >
              <Controller
                name="contactPhone"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    prefix={<PhoneOutlined />}
                    placeholder="请输入联系电话"
                    disabled={loading}
                  />
                )}
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

// 设备调拨表单类型
interface TransferFormData {
  deviceId: string;
  sourceWarehouseId: string;
  targetWarehouseId: string;
  remarks?: string;
}

// 设备调拨对话框组件
const TransferDialog: React.FC<{
  open: boolean;
  warehouses: Warehouse[];
  onClose: () => void;
  onSubmit: (data: TransferFormData) => void;
  loading: boolean;
}> = ({ open, warehouses, onClose, onSubmit, loading }) => {
  const { control, handleSubmit, reset, formState: { errors } } = useForm<TransferFormData>({
    defaultValues: {
      deviceId: '',
      sourceWarehouseId: '',
      targetWarehouseId: '',
      remarks: '',
    },
  });

  // 重置表单
  React.useEffect(() => {
    if (open) {
      reset();
    }
  }, [open, reset]);

  const handleFormSubmit = handleSubmit((data) => {
    onSubmit(data);
  });

  return (
    <Modal
      title="设备调拨"
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={loading}
          onClick={handleFormSubmit}
        >
          确认调拨
        </Button>,
      ]}
    >
      <Form layout="vertical">
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              label="设备编号"
              validateStatus={errors.deviceId ? 'error' : undefined}
              help={errors.deviceId?.message}
            >
              <Controller
                name="deviceId"
                control={control}
                rules={{ required: '请输入设备编号' }}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="请输入设备编号"
                    disabled={loading}
                  />
                )}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="源仓库"
              validateStatus={errors.sourceWarehouseId ? 'error' : undefined}
              help={errors.sourceWarehouseId?.message}
            >
              <Controller
                name="sourceWarehouseId"
                control={control}
                rules={{ required: '请选择源仓库' }}
                render={({ field }) => (
                  <Select
                    {...field}
                    placeholder="请选择源仓库"
                    disabled={loading}
                    options={warehouses.map(w => ({ label: w.name, value: w.id }))}
                  />
                )}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="目标仓库"
              validateStatus={errors.targetWarehouseId ? 'error' : undefined}
              help={errors.targetWarehouseId?.message}
            >
              <Controller
                name="targetWarehouseId"
                control={control}
                rules={{ required: '请选择目标仓库' }}
                render={({ field }) => (
                  <Select
                    {...field}
                    placeholder="请选择目标仓库"
                    disabled={loading}
                    options={warehouses.map(w => ({ label: w.name, value: w.id }))}
                  />
                )}
              />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item
              label="备注"
            >
              <Controller
                name="remarks"
                control={control}
                render={({ field }) => (
                  <Input.TextArea
                    {...field}
                    rows={3}
                    placeholder="请输入备注信息"
                    disabled={loading}
                  />
                )}
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

const WarehousesPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | undefined>();

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // 获取仓库列表
  const { data: warehousesData, isLoading } = useQuery({
    queryKey: ['warehouses', { page, pageSize, search }],
    queryFn: async () => {
      const response = await api.get('/warehouses', {
        params: { page, pageSize, search },
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
      message.success('仓库创建成功');
    },
    onError: () => {
      message.error('仓库创建失败');
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
      message.success('仓库更新成功');
    },
    onError: () => {
      message.error('仓库更新失败');
    },
  });

  // 删除仓库
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/warehouses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.warehouses.all });
      message.success('仓库删除成功');
    },
    onError: () => {
      message.error('仓库删除失败');
    },
  });

  // 设备调拨处理
  const transferMutation = useMutation({
    mutationFn: async (data: TransferFormData) => {
      // 这里应该调用实际的API
      console.log('调拨设备:', data);
      // 模拟API调用
      return new Promise(resolve => setTimeout(() => resolve(data), 1000));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.warehouses.all });
      setTransferDialogOpen(false);
      message.success('设备调拨成功');
    },
    onError: () => {
      message.error('设备调拨失败');
    },
  });

  const handleCreate = () => {
    setSelectedWarehouse(undefined);
    setDialogOpen(true);
  };

  const handleTransfer = () => {
    setTransferDialogOpen(true);
  };

  const handleEdit = (warehouse: Warehouse) => {
    setSelectedWarehouse(warehouse);
    setDialogOpen(true);
  };

  const handleDelete = (warehouse: Warehouse) => {
    confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: (
        <>
          <Alert
            message="警告"
            description="删除操作不可恢复，请谨慎操作！"
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Text>确定要删除仓库 "{warehouse.name}" 吗？</Text>
        </>
      ),
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk() {
        return deleteMutation.mutateAsync(warehouse.id);
      },
    });
  };

  const handleSubmit = (data: WarehouseFormData) => {
    if (selectedWarehouse) {
      updateMutation.mutate({ id: selectedWarehouse.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleTransferSubmit = (data: TransferFormData) => {
    transferMutation.mutate(data);
  };

  const handleManageDevices = (warehouse: Warehouse) => {
    navigate(`/devices?warehouseId=${warehouse.id}&warehouseName=${encodeURIComponent(warehouse.name)}`);
  };

  const handlePageChange = (newPage: number, newPageSize: number) => {
    setPage(newPage);
    setPageSize(newPageSize);
  };

  const warehouses: Warehouse[] = warehousesData?.data?.list || [];
  const total = warehousesData?.data?.pagination?.total || 0;

  const columns = [
    {
      title: '仓库编码',
      dataIndex: 'code',
      key: 'code',
    },
    {
      title: '仓库名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => (
        <Space>
          <HomeOutlined />
          {text}
        </Space>
      ),
    },
    {
      title: '地址',
      dataIndex: 'address',
      key: 'address',
      render: (text: string) => text || '-',
    },
    {
      title: '管理员',
      dataIndex: 'manager_name',
      key: 'manager_name',
      render: (text: string) => text || '-',
    },
    {
      title: '库区数量',
      dataIndex: ['statistics', 'zones_count'],
      key: 'zones_count',
      render: (count: number) => count || 0,
    },
    {
      title: '商品数量',
      dataIndex: ['statistics', 'products_count'],
      key: 'products_count',
      render: (count: number) => count || 0,
    },
    {
      title: '库存数量',
      dataIndex: ['statistics', 'inventory_count'],
      key: 'inventory_count',
      render: (count: number) => count || 0,
    },
    {
      title: '入库订单',
      dataIndex: ['statistics', 'inbound_orders_count'],
      key: 'inbound_orders_count',
      render: (count: number) => count || 0,
    },
    {
      title: '出库订单',
      dataIndex: ['statistics', 'outbound_orders_count'],
      key: 'outbound_orders_count',
      render: (count: number) => count || 0,
    },
    {
      title: '状态',
      dataIndex: 'status_text',
      key: 'status_text',
      render: (text: string, record: any) => (
        <Tag color={record.status === 'active' ? 'success' : 'default'}>
          {text}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Warehouse) => (
        <Space size="middle">
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Title level={3} style={{ marginBottom: 24 }}>
        仓库管理
      </Title>

      {/* 操作栏 */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreate}
            >
              添加仓库
            </Button>
            <Button
              type="primary"
              icon={<SyncOutlined />}
              onClick={handleTransfer}
            >
              设备调拨
            </Button>
            <Button
              type="primary"
              icon={<PrinterOutlined />}
            >
              打印仓库报表
            </Button>
          </Space>
          <Input
            placeholder="搜索仓库..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            prefix={<SearchOutlined />}
            style={{ width: 300 }}
          />
        </div>
      </Card>

      {/* 仓库卡片网格 */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
        gap: '20px',
        marginBottom: '30px'
      }}>
        {isLoading ? (
          Array(3).fill(null).map((_, index) => (
            <Card key={`skeleton-${index}`} loading={true} style={{ height: '300px' }} />
          ))
        ) : warehouses.length > 0 ? (
          warehouses.map(warehouse => {
            // 计算容量使用百分比（示例数据，实际应从API获取）
            const capacityUsage = Math.floor(Math.random() * 100);
            let progressStatus: 'success' | 'exception' | 'normal' | 'active' = 'success';
            let statusText = '正常运行';
            let statusType = 'success';
            
            if (capacityUsage > 80) {
              progressStatus = 'exception';
            } else if (capacityUsage > 60) {
              progressStatus = 'active';
            }
            
            if (warehouse.status !== 'active') {
              statusText = '维护中';
              statusType = 'warning';
            }
            
            return (
              <Card key={warehouse.id} style={{ borderRadius: '8px', boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px solid #eee' }}>
                  <Typography.Title level={5} style={{ margin: 0, color: '#1e3c72' }}>{warehouse.name}</Typography.Title>
                  <Badge status={statusType as any} text={statusText} />
                </div>
                
                <div style={{ marginBottom: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: '#6c757d' }}>仓库编号</span>
                    <span style={{ fontWeight: 500 }}>{warehouse.code}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: '#6c757d' }}>设备数量</span>
                    <span style={{ fontWeight: 500 }}>{Math.floor(Math.random() * 400)}台</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: '#6c757d' }}>容量使用</span>
                    <span style={{ fontWeight: 500 }}>{capacityUsage}%</span>
                  </div>
                </div>
                
                <Progress percent={capacityUsage} status={progressStatus} size="small" style={{ marginBottom: '15px' }} />
                
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Button type="primary" onClick={() => handleEdit(warehouse)}>查看详情</Button>
                  <Button type="primary" onClick={() => handleManageDevices(warehouse)}>管理设备</Button>
                </div>
              </Card>
            );
          })
        ) : (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
            <Typography.Text type="secondary">暂无仓库数据</Typography.Text>
          </div>
        )}
      </div>
      
      {/* 仓库列表表格 */}
      <Card title="仓库列表" style={{ marginBottom: '24px' }}>
        <Table
          columns={columns}
          dataSource={warehouses}
          loading={isLoading}
          rowKey="id"
          pagination={{
            current: page,
            pageSize: pageSize,
            total: total,
            onChange: handlePageChange,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          }}
        />
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
      
      {/* 设备调拨对话框 */}
      <TransferDialog
        open={transferDialogOpen}
        warehouses={warehouses}
        onClose={() => setTransferDialogOpen(false)}
        onSubmit={handleTransferSubmit}
        loading={transferMutation.isPending}
      />
    </div>
  );
};

export default WarehousesPage;
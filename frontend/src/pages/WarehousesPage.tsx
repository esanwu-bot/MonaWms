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
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  HomeOutlined,
  PhoneOutlined,
  UserOutlined,
  ExclamationCircleOutlined,
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

const WarehousesPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | undefined>();

  const queryClient = useQueryClient();

  // 获取仓库列表
  const { data: warehousesData, isLoading } = useQuery({
    queryKey: ['warehouses', { page, pageSize, search }],
    queryFn: async () => {
      const response = await api.get<ApiResponse<PaginatedResponse<Warehouse[]>>>('/warehouses', {
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

  const handleCreate = () => {
    setSelectedWarehouse(undefined);
    setDialogOpen(true);
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

  const handlePageChange = (newPage: number, newPageSize: number) => {
    setPage(newPage);
    setPageSize(newPageSize);
  };

  const warehouses = warehousesData?.data?.list || [];
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
      title: '联系人',
      dataIndex: 'contactPerson',
      key: 'contactPerson',
      render: (text: string) => text || '-',
    },
    {
      title: '联系电话',
      dataIndex: 'contactPhone',
      key: 'contactPhone',
      render: (text: string) => text || '-',
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'success' : 'default'}>
          {isActive ? '启用' : '禁用'}
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
          <Input
            placeholder="搜索仓库..."
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
            新增仓库
          </Button>
        </div>
      </Card>

      {/* 仓库列表 */}
      <Card>
        <Table
          columns={columns}
          dataSource={warehouses}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: page,
            pageSize,
            total,
            onChange: handlePageChange,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          locale={{
            emptyText: (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <Text type="secondary">暂无仓库数据</Text>
              </div>
            ),
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
    </div>
  );
};

export default WarehousesPage;
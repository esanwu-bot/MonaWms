import React, { useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import {
  Card,
  Table,
  Button,
  Space,
  Input,
  Select,
  Modal,
  Form,
  DatePicker,
  InputNumber,
  message,
  Popconfirm,
  Tag,
  Tooltip,
  Row,
  Col,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  EyeOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';

const { Search } = Input;
const { Option } = Select;
const { TextArea } = Input;
const { RangePicker } = DatePicker;



interface ProjectFormData {
  projectCode: string;
  projectName: string;
  description: string;
  manager: string;
  contactPhone: string;
  contactEmail: string;
  address: string;
  status: string;
  budget: number;
  dateRange: [dayjs.Dayjs, dayjs.Dayjs];
}

import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  getProjectInventory,
  reserveInventory,
  cancelReservation,
  type Project,
  type CreateProjectRequest,
  type ProjectListParams,
  type ProjectInventory,
} from '../services/projectService';
import { productService } from '../services/productService';

const ProjectsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useState({
    project_code: '',
    project_name: '',
    status: '',
    manager: '',
  });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isInventoryModalVisible, setIsInventoryModalVisible] = useState(false);
  const [isReserveModalVisible, setIsReserveModalVisible] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [viewingProject, setViewingProject] = useState<Project | null>(null);
  const [form] = Form.useForm();
  const [reserveForm] = Form.useForm();
  const queryClient = useQueryClient();

  // 获取项目列表
  const { data: projectData, isLoading } = useQuery({
    queryKey: ['projects', searchParams],
    queryFn: () => getProjects(searchParams),
  });

  // 获取产品列表
  const { data: productData } = useQuery({
    queryKey: ['products'],
    queryFn: () => productService.getProducts(),
  });

  // 获取项目库存
  const { data: inventoryData, isLoading: inventoryLoading } = useQuery({
    queryKey: ['projectInventory', viewingProject?.id],
    queryFn: () => viewingProject ? getProjectInventory(viewingProject.id) : null,
    enabled: !!viewingProject,
  });

  // 创建项目
  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      message.success('项目创建成功');
      setIsModalVisible(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (error: any) => {
      message.error(error.message || '项目创建失败');
    },
  });

  // 更新项目
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      updateProject(id, data),
    onSuccess: () => {
      message.success('项目更新成功');
      setIsModalVisible(false);
      setEditingProject(null);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (error: any) => {
      message.error(error.message || '项目更新失败');
    },
  });

  // 删除项目
  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      message.success('项目删除成功');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (error: any) => {
      message.error(error.message || '项目删除失败');
    },
  });

  // 库存预留
  const reserveMutation = useMutation({
    mutationFn: reserveInventory,
    onSuccess: () => {
      message.success('库存预留成功');
      setIsReserveModalVisible(false);
      reserveForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['projectInventory'] });
    },
    onError: (error: any) => {
      message.error(error.message || '库存预留失败');
    },
  });

  // 取消预留
  const cancelReservationMutation = useMutation({
    mutationFn: cancelReservation,
    onSuccess: () => {
      message.success('取消预留成功');
      queryClient.invalidateQueries({ queryKey: ['projectInventory'] });
    },
    onError: (error: any) => {
      message.error(error.message || '取消预留失败');
    },
  });

  const columns: ColumnsType<Project> = [
    {
      title: '项目编号',
      dataIndex: 'project_code',
      key: 'project_code',
      width: 150,
    },
    {
      title: '项目名称',
      dataIndex: 'project_name',
      key: 'project_name',
      width: 200,
      ellipsis: true,
    },
    {
      title: '项目经理',
      dataIndex: 'manager',
      key: 'manager',
      width: 100,
    },
    {
      title: '联系电话',
      dataIndex: 'contact_phone',
      key: 'contact_phone',
      width: 120,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string, record) => {
        const colors = {
          planning: 'blue',
          executing: 'green',
          completed: 'gray',
          cancelled: 'red',
        };
        return (
          <Tag color={colors[status as keyof typeof colors]}>
            {record.status_text}
          </Tag>
        );
      },
    },
    {
      title: '预算(万元)',
      dataIndex: 'budget',
      key: 'budget',
      width: 120,
      render: (budget: number) => (budget / 10000).toFixed(2),
    },
    {
      title: '预留数量',
      dataIndex: 'reservation_count',
      key: 'reservation_count',
      width: 100,
    },
    {
      title: '项目周期',
      key: 'period',
      width: 200,
      render: (_, record) => (
        <div>
          <div>{record.start_date}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            至 {record.end_date}
          </div>
        </div>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleViewInventory(record)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title="库存预留">
            <Button
              type="text"
              icon={<ShoppingCartOutlined />}
              onClick={() => handleReserve(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确定要删除这个项目吗？"
            onConfirm={() => deleteMutation.mutate(record.id)}
          >
            <Tooltip title="删除">
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const inventoryColumns: ColumnsType<ProjectInventory> = [
    {
      title: '产品名称',
      dataIndex: 'product_name',
      key: 'product_name',
    },
    {
      title: 'SKU',
      dataIndex: 'product_sku',
      key: 'product_sku',
    },
    {
      title: '预留数量',
      dataIndex: 'reserved_quantity',
      key: 'reserved_quantity',
    },
    {
      title: '单位',
      dataIndex: 'product_unit',
      key: 'product_unit',
    },
    {
      title: '备注',
      dataIndex: 'notes',
      key: 'notes',
    },
    {
      title: '预留时间',
      dataIndex: 'reserved_at',
      key: 'reserved_at',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Popconfirm
          title="确定要取消这个预留吗？"
          onConfirm={() => handleCancelReservation(record)}
        >
          <Button type="text" danger size="small">
            取消预留
          </Button>
        </Popconfirm>
      ),
    },
  ];

  const handleSearch = (value: string) => {
    setSearchParams(prev => ({ ...prev, project_code: value }));
  };

  const handleAdd = () => {
    setEditingProject(null);
    setIsModalVisible(true);
    form.resetFields();
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setIsModalVisible(true);
    form.setFieldsValue({
      projectCode: project.project_code,
      projectName: project.project_name,
      description: project.description,
      manager: project.manager,
      contactPhone: project.contact_phone,
      contactEmail: project.contact_email,
      address: project.address,
      status: project.status,
      budget: project.budget,
      dateRange: project.start_date && project.end_date 
        ? [dayjs(project.start_date), dayjs(project.end_date)]
        : undefined,
    });
  };

  const handleViewInventory = (project: Project) => {
    setViewingProject(project);
    setIsInventoryModalVisible(true);
  };

  const handleReserve = (project: Project) => {
    setViewingProject(project);
    setIsReserveModalVisible(true);
    reserveForm.resetFields();
  };

  const handleCancelReservation = (inventory: ProjectInventory) => {
    if (viewingProject) {
      cancelReservationMutation.mutate({
        project_id: viewingProject.id,
        product_id: inventory.product_id,
      });
    }
  };

  const handleSubmit = (values: ProjectFormData) => {
    const data = {
      project_code: values.projectCode,
      project_name: values.projectName,
      description: values.description,
      manager: values.manager,
      contact_phone: values.contactPhone,
      contact_email: values.contactEmail,
      address: values.address,
      status: values.status,
      budget: values.budget,
      start_date: values.dateRange?.[0]?.format('YYYY-MM-DD'),
      end_date: values.dateRange?.[1]?.format('YYYY-MM-DD'),
    };

    if (editingProject) {
      updateMutation.mutate({ id: editingProject.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleReserveSubmit = (values: any) => {
    if (viewingProject) {
      reserveMutation.mutate({
        project_id: viewingProject.id,
        product_id: values.productId,
        quantity: values.quantity,
        notes: values.notes,
      });
    }
  };

  return (
    <div>
      <PageHeader title="项目管理" sub="工程/代维项目与库存预留跟踪" />
      <Card>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={5}>
            <Search
              placeholder="搜索项目编号"
              allowClear
              onSearch={handleSearch}
            />
          </Col>
          <Col span={5}>
            <Input
              placeholder="搜索项目名称"
              allowClear
              onChange={(e) =>
                setSearchParams(prev => ({ ...prev, project_name: e.target.value }))
              }
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder="状态"
              allowClear
              style={{ width: '100%' }}
              onChange={(value) =>
                setSearchParams(prev => ({ ...prev, status: value }))
              }
            >
              <Option value="planning">规划中</Option>
              <Option value="executing">执行中</Option>
              <Option value="completed">已完成</Option>
              <Option value="cancelled">已取消</Option>
            </Select>
          </Col>
          <Col span={4}>
            <Input
              placeholder="项目经理"
              allowClear
              onChange={(e) =>
                setSearchParams(prev => ({ ...prev, manager: e.target.value }))
              }
            />
          </Col>
          <Col span={6}>
            <Space>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAdd}
              >
                新增项目
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => queryClient.invalidateQueries({ queryKey: ['projects'] })}
              >
                刷新
              </Button>
            </Space>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={projectData?.list || []}
          loading={isLoading}
          rowKey="id"
          pagination={{
            total: projectData?.pagination?.total || 0,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      </Card>

      {/* 项目编辑模态框 */}
      <Modal
        title={editingProject ? '编辑项目' : '新增项目'}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingProject(null);
          form.resetFields();
        }}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="项目编号"
                name="projectCode"
                rules={[{ required: true, message: '请输入项目编号' }]}
              >
                <Input placeholder="请输入项目编号" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="项目名称"
                name="projectName"
                rules={[{ required: true, message: '请输入项目名称' }]}
              >
                <Input placeholder="请输入项目名称" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="项目经理"
                name="manager"
                rules={[{ required: true, message: '请输入项目经理' }]}
              >
                <Input placeholder="请输入项目经理" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="联系电话"
                name="contactPhone"
              >
                <Input placeholder="请输入联系电话" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="联系邮箱"
                name="contactEmail"
                rules={[{ type: 'email', message: '请输入有效的邮箱地址' }]}
              >
                <Input placeholder="请输入联系邮箱" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="项目预算(元)"
                name="budget"
              >
                <InputNumber
                  min={0}
                  step={1000}
                  placeholder="请输入项目预算"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="状态"
                name="status"
                initialValue="planning"
              >
                <Select>
                  <Option value="planning">规划中</Option>
                  <Option value="executing">执行中</Option>
                  <Option value="completed">已完成</Option>
                  <Option value="cancelled">已取消</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="项目周期"
            name="dateRange"
          >
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="项目地址"
            name="address"
          >
            <Input placeholder="请输入项目地址" />
          </Form.Item>

          <Form.Item
            label="项目描述"
            name="description"
          >
            <TextArea rows={4} placeholder="请输入项目描述" />
          </Form.Item>

          <Form.Item style={{ marginTop: 24 }}>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingProject ? '更新' : '创建'}
              </Button>
              <Button
                onClick={() => {
                  setIsModalVisible(false);
                  setEditingProject(null);
                  form.resetFields();
                }}
              >
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 项目库存查看模态框 */}
      <Modal
        title={`项目库存 - ${viewingProject?.project_name}`}
        open={isInventoryModalVisible}
        onCancel={() => {
          setIsInventoryModalVisible(false);
          setViewingProject(null);
        }}
        footer={null}
        width={900}
      >
        <div style={{ marginBottom: 16 }}>
          <Space>
            <span>项目编号：{viewingProject?.project_code}</span>
            <span>项目经理：{viewingProject?.manager}</span>
            <Tag color="blue">
              {viewingProject?.status_text}
            </Tag>
          </Space>
        </div>

        <Table
          columns={inventoryColumns}
          dataSource={inventoryData?.inventory || []}
          loading={inventoryLoading}
          pagination={false}
          size="small"
        />
      </Modal>

      {/* 库存预留模态框 */}
      <Modal
        title={`库存预留 - ${viewingProject?.project_name}`}
        open={isReserveModalVisible}
        onCancel={() => {
          setIsReserveModalVisible(false);
          setViewingProject(null);
          reserveForm.resetFields();
        }}
        footer={null}
      >
        <Form
          form={reserveForm}
          layout="vertical"
          onFinish={handleReserveSubmit}
        >
          <Form.Item
            label="选择产品"
            name="productId"
            rules={[{ required: true, message: '请选择产品' }]}
          >
            <Select placeholder="请选择产品">
              {Array.isArray(productData?.list) ? productData.list.map((product: any) => (
                <Option key={product.id} value={product.id}>
                  {product.name} ({product.sku})
                </Option>
              )) : []}
            </Select>
          </Form.Item>

          <Form.Item
            label="预留数量"
            name="quantity"
            rules={[{ required: true, message: '请输入预留数量' }]}
          >
            <InputNumber
              min={1}
              step={1}
              placeholder="请输入预留数量"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            label="备注"
            name="notes"
          >
            <TextArea rows={3} placeholder="请输入备注" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                确认预留
              </Button>
              <Button
                onClick={() => {
                  setIsReserveModalVisible(false);
                  setViewingProject(null);
                  reserveForm.resetFields();
                }}
              >
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProjectsPage;
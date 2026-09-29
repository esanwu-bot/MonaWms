import React, { useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  Row,
  Col,
  Statistic,
  message,
  Popconfirm,
  Switch,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  KeyOutlined,
  DeleteOutlined,
  SafetyOutlined,
  UserOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  userService,
  type UserItem,
  type UserRole,
  type UserStatus,
  type CreateUserRequest,
  type UpdateUserRequest,
} from '../services/userService';

const { Option } = Select;

// 角色配置
const ROLE_OPTIONS: { label: string; value: UserRole }[] = [
  { label: '管理员', value: 'admin' },
  { label: '录入员', value: 'operator' },
];

const ROLE_CONFIG: Record<UserRole, { color: string; text: string }> = {
  admin: { color: 'red', text: '管理员' },
  operator: { color: 'blue', text: '录入员' },
};

const STATUS_CONFIG: Record<UserStatus, { color: string; text: string }> = {
  active: { color: 'success', text: '启用' },
  inactive: { color: 'default', text: '禁用' },
};

const UsersPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();

  // 筛选条件
  const [search, setSearch] = useState({
    username: '',
    role: '' as UserRole | '',
    status: '' as UserStatus | '',
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // 模态框状态
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [passwordUserId, setPasswordUserId] = useState<number | null>(null);

  // 用户列表
  const { data, isLoading } = useQuery({
    queryKey: ['users', { ...search, page, pageSize }],
    queryFn: () =>
      userService.getUsers({
        page,
        limit: pageSize,
        ...(search.username && { username: search.username }),
        ...(search.role && { role: search.role }),
        ...(search.status && { status: search.status }),
      }),
  });

  const list = (data?.data?.data as any)?.list || [];
  const pagination = (data?.data?.data as any)?.pagination || {
    total: 0,
    page: 1,
    limit: pageSize,
  };

  // 统计数据（从列表计算，或单独接口）
  const stats = {
    total: pagination.total || 0,
    admin: list.filter((u: UserItem) => u.role === 'admin').length,
    operator: list.filter((u: UserItem) => u.role === 'operator').length,
    active: list.filter((u: UserItem) => u.status === 'active').length,
  };

  // 创建/更新用户
  const saveMutation = useMutation({
    mutationFn: async (payload: { id?: number; data: CreateUserRequest | UpdateUserRequest }) => {
      if (payload.id) {
        return userService.updateUser(payload.id, payload.data as UpdateUserRequest);
      }
      return userService.createUser(payload.data as CreateUserRequest);
    },
    onSuccess: () => {
      message.success(editingUser ? '用户更新成功' : '用户创建成功');
      setModalVisible(false);
      setEditingUser(null);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || '操作失败');
    },
  });

  // 删除用户
  const deleteMutation = useMutation({
    mutationFn: (id: number) => userService.deleteUser(id),
    onSuccess: () => {
      message.success('用户已删除');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || '删除失败');
    },
  });

  // 修改状态
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: UserStatus }) =>
      userService.changeStatus(id, { status }),
    onSuccess: () => {
      message.success('状态已更新');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || '状态更新失败');
    },
  });

  // 修改密码
  const passwordMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { password: string; confirm_password: string } }) =>
      userService.changePassword(id, data),
    onSuccess: () => {
      message.success('密码修改成功');
      setPasswordModalVisible(false);
      setPasswordUserId(null);
      passwordForm.resetFields();
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || '密码修改失败');
    },
  });

  // 打开新建
  const handleCreate = () => {
    setEditingUser(null);
    form.resetFields();
    form.setFieldsValue({ role: 'operator' });
    setModalVisible(true);
  };

  // 打开编辑
  const handleEdit = (record: UserItem) => {
    setEditingUser(record);
    form.setFieldsValue({
      username: record.username,
      email: record.email,
      real_name: record.real_name,
      phone: record.phone,
      role: record.role,
    });
    setModalVisible(true);
  };

  // 打开改密
  const handleChangePassword = (record: UserItem) => {
    setPasswordUserId(record.id);
    passwordForm.resetFields();
    setPasswordModalVisible(true);
  };

  // 提交新建/编辑
  const handleSubmit = () => {
    form.validateFields().then((values) => {
      const payload = editingUser
        ? { id: editingUser.id, data: values as UpdateUserRequest }
        : { data: values as CreateUserRequest };
      saveMutation.mutate(payload);
    });
  };

  // 提交改密
  const handlePasswordSubmit = () => {
    passwordForm.validateFields().then((values) => {
      if (passwordUserId) {
        passwordMutation.mutate({ id: passwordUserId, data: values });
      }
    });
  };

  // 表格列
  const columns: ColumnsType<UserItem> = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 130,
      render: (text, record) => (
        <Space>
          <UserOutlined style={{ color: '#999' }} />
          <span style={{ fontWeight: 500 }}>{text}</span>
        </Space>
      ),
    },
    {
      title: '真实姓名',
      dataIndex: 'real_name',
      key: 'real_name',
      width: 120,
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 180,
      ellipsis: true,
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
      width: 130,
      render: (text) => text || '-',
    },
    {
      title: '全局角色',
      dataIndex: 'role',
      key: 'role',
      width: 100,
      render: (role: UserRole) => {
        const cfg = ROLE_CONFIG[role] ?? { color: 'default', text: role };
        return <Tag color={cfg.color}>{cfg.text}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: UserStatus) => {
        const cfg = STATUS_CONFIG[status] ?? { color: 'default', text: status };
        return <Tag color={cfg.color}>{cfg.text}</Tag>;
      },
    },
    {
      title: '最后登录',
      dataIndex: 'last_login_time',
      key: 'last_login_time',
      width: 150,
      render: (text) => text || '从未登录',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
    },
    {
      title: '操作',
      key: 'action',
      width: 280,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            icon={<KeyOutlined />}
            onClick={() => handleChangePassword(record)}
          >
            改密
          </Button>
          <Tooltip title={record.status === 'active' ? '禁用账号' : '启用账号'}>
            <Switch
              size="small"
              checked={record.status === 'active'}
              onChange={(checked) =>
                statusMutation.mutate({
                  id: record.id,
                  status: checked ? 'active' : 'inactive',
                })
              }
              loading={statusMutation.isPending}
            />
          </Tooltip>
          <Button
            type="link"
            size="small"
            icon={<SafetyOutlined />}
            onClick={() => navigate('/grant-matrix')}
          >
            授权仓库
          </Button>
          <Popconfirm
            title="确认删除此用户？"
            description="删除后不可恢复，已创建的单据将保留。"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="确认"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="会员管理" sub="账号、角色、状态与仓库授权的统一管理入口" />

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="用户总数"
              value={stats.total}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#155e75' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="管理员"
              value={stats.admin}
              valueStyle={{ color: '#dc2626' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="录入员"
              value={stats.operator}
              valueStyle={{ color: '#2563eb' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="启用中"
              value={stats.active}
              valueStyle={{ color: '#16a34a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 列表 */}
      <Card
        title="用户列表"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            新建会员
          </Button>
        }
      >
        {/* 筛选区 */}
        <Space style={{ marginBottom: 16 }} wrap>
          <Input
            placeholder="搜索用户名"
            value={search.username}
            onChange={(e) => {
              setSearch({ ...search, username: e.target.value });
              setPage(1);
            }}
            style={{ width: 180 }}
            allowClear
          />
          <Select
            placeholder="角色"
            value={search.role || undefined}
            onChange={(v) => {
              setSearch({ ...search, role: v || '' });
              setPage(1);
            }}
            style={{ width: 120 }}
            allowClear
          >
            {ROLE_OPTIONS.map((r) => (
              <Option key={r.value} value={r.value}>
                {r.label}
              </Option>
            ))}
          </Select>
          <Select
            placeholder="状态"
            value={search.status || undefined}
            onChange={(v) => {
              setSearch({ ...search, status: v || '' });
              setPage(1);
            }}
            style={{ width: 120 }}
            allowClear
          >
            <Option value="active">启用</Option>
            <Option value="inactive">禁用</Option>
          </Select>
        </Space>

        <Table
          columns={columns}
          dataSource={list}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 1200 }}
          pagination={{
            current: page,
            pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
        />
      </Card>

      {/* 新建/编辑用户模态框 */}
      <Modal
        title={editingUser ? '编辑会员' : '新建会员'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingUser(null);
          form.resetFields();
        }}
        onOk={handleSubmit}
        confirmLoading={saveMutation.isPending}
        okText="保存"
        cancelText="取消"
        width={520}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="username"
            label="用户名"
            rules={[
              { required: true, message: '请输入用户名' },
              { max: 50, message: '用户名不超过50字符' },
            ]}
          >
            <Input placeholder="请输入登录用户名" disabled={!!editingUser} />
          </Form.Item>

          {!editingUser && (
            <Form.Item
              name="password"
              label="初始密码"
              rules={[
                { required: true, message: '请输入初始密码' },
                { min: 6, message: '密码至少6位' },
                { max: 20, message: '密码不超过20位' },
              ]}
            >
              <Input.Password placeholder="请输入初始密码（6-20位）" />
            </Form.Item>
          )}

          <Form.Item
            name="real_name"
            label="真实姓名"
            rules={[{ required: true, message: '请输入真实姓名' }]}
          >
            <Input placeholder="请输入真实姓名" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="email"
                label="邮箱"
                rules={[
                  { required: true, message: '请输入邮箱' },
                  { type: 'email', message: '邮箱格式不正确' },
                ]}
              >
                <Input placeholder="请输入邮箱" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="phone"
                label="手机号"
                rules={[{ max: 20, message: '手机号不超过20字符' }]}
              >
                <Input placeholder="请输入手机号（可选）" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="role"
            label="全局角色"
            rules={[{ required: true, message: '请选择角色' }]}
            tooltip="admin 可做用户管理、授权管理、审核过账等系统级动作；operator 仅能录单"
          >
            <Select placeholder="请选择角色">
              {ROLE_OPTIONS.map((r) => (
                <Option key={r.value} value={r.value}>
                  {r.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 修改密码模态框 */}
      <Modal
        title="修改密码"
        open={passwordModalVisible}
        onCancel={() => {
          setPasswordModalVisible(false);
          setPasswordUserId(null);
          passwordForm.resetFields();
        }}
        onOk={handlePasswordSubmit}
        confirmLoading={passwordMutation.isPending}
        okText="确认修改"
        cancelText="取消"
        width={420}
        destroyOnHidden
      >
        <Form form={passwordForm} layout="vertical">
          <Form.Item
            name="password"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码至少6位' },
              { max: 20, message: '密码不超过20位' },
            ]}
          >
            <Input.Password placeholder="请输入新密码（6-20位）" />
          </Form.Item>
          <Form.Item
            name="confirm_password"
            label="确认密码"
            dependencies={['password']}
            rules={[
              { required: true, message: '请再次输入密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="请再次输入新密码" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UsersPage;

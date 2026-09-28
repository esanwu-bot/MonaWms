import React, { useState, useEffect } from 'react';
import {
  SettingOutlined,
  BellOutlined,
  DatabaseOutlined,
  SaveOutlined,
  BankOutlined,
  PhoneOutlined,
  InfoCircleOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DownOutlined,
} from '@ant-design/icons';
import {
  Modal,
  Form,
  Input,
  Card,
  Row,
  Col,
  Button,
  Switch,
  Select,
  Table,
  Avatar,
  Tooltip,
  Collapse,
  Typography,
  Space,
  Tabs,
  Checkbox,
  Tag,
  Alert,
  Spin,
} from 'antd';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { ColumnsType } from 'antd/es/table';

const { Panel } = Collapse;
const { Option } = Select;

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <div style={{ padding: 24 }}>
          {children}
        </div>
      )}
    </div>
  );
}

// 系统设置表单验证
const systemSettingsSchema = z.object({
  companyName: z.string().min(1, '请输入公司名称'),
  companyAddress: z.string().min(1, '请输入公司地址'),
  companyPhone: z.string().min(1, '请输入公司电话'),
  companyEmail: z.string().email('请输入有效的邮箱地址'),
  timezone: z.string().min(1, '请选择时区'),
  language: z.string().min(1, '请选择语言'),
  currency: z.string().min(1, '请选择货币'),
  dateFormat: z.string().min(1, '请选择日期格式'),
  autoBackup: z.boolean(),
  backupInterval: z.number().min(1, '备份间隔必须大于0'),
  maxBackupFiles: z.number().min(1, '最大备份文件数必须大于0'),
});

type SystemSettingsFormData = z.infer<typeof systemSettingsSchema>;

// 通知设置表单验证
const notificationSettingsSchema = z.object({
  emailNotifications: z.boolean(),
  smsNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  lowStockAlert: z.boolean(),
  orderStatusUpdate: z.boolean(),
  systemMaintenance: z.boolean(),
  emailServer: z.string().optional(),
  emailPort: z.number().optional(),
  emailUsername: z.string().optional(),
  emailPassword: z.string().optional(),
  smsProvider: z.string().optional(),
  smsApiKey: z.string().optional(),
});

type NotificationSettingsFormData = z.infer<typeof notificationSettingsSchema>;

// 用户管理表单验证
const userFormSchema = z.object({
  username: z.string().min(1, '请输入用户名'),
  email: z.string().email('请输入有效的邮箱地址'),
  fullName: z.string().min(1, '请输入姓名'),
  phone: z.string().optional(),
  role: z.string().min(1, '请选择角色'),
  department: z.string().optional(),
  isActive: z.boolean(),
});

type UserFormData = z.infer<typeof userFormSchema>;

interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  phone?: string;
  role: string;
  department?: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

interface UserDialogProps {
  open: boolean;
  user?: User;
  onClose: () => void;
  onSubmit: (data: UserFormData) => void;
  loading?: boolean;
}

// UserDialog component with Ant Design
const UserDialog: React.FC<UserDialogProps> = ({ open, onClose, user, onSubmit, loading }) => {
  const [form] = Form.useForm();
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    if (open && user) {
      form.setFieldsValue({
        username: user.username || '',
        email: user.email || '',
        fullName: user.fullName || '',
        phone: user.phone || '',
        role: user.role || 'user',
        department: user.department || '',
        isActive: user.isActive
      });
    } else if (open) {
      form.resetFields();
    }
  }, [open, user, form]);

  const handleSubmit = async (values: any) => {
    setSubmitLoading(true);
    try {
      await onSubmit(values);
      onClose();
    } catch (error) {
      console.error('Error saving user:', error);
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <Modal
      title={user ? '编辑用户' : '添加用户'}
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={submitLoading || loading}
          onClick={() => form.submit()}
        >
          保存
        </Button>
      ]}
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          role: 'user',
          isActive: true
        }}
      >
        <Form.Item
          label="用户名"
          name="username"
          rules={[
            { required: true, message: '请输入用户名' },
            { min: 3, message: '用户名至少3个字符' }
          ]}
        >
          <Input placeholder="请输入用户名" />
        </Form.Item>

        <Form.Item
          label="邮箱"
          name="email"
          rules={[
            { required: true, message: '请输入邮箱' },
            { type: 'email', message: '请输入有效的邮箱地址' }
          ]}
        >
          <Input placeholder="请输入邮箱" />
        </Form.Item>

        <Form.Item
          label="姓名"
          name="fullName"
          rules={[{ required: true, message: '请输入姓名' }]}
        >
          <Input placeholder="请输入姓名" />
        </Form.Item>

        <Form.Item
          label="电话"
          name="phone"
        >
          <Input placeholder="请输入电话" />
        </Form.Item>

        <Form.Item
          label="角色"
          name="role"
          rules={[{ required: true, message: '请选择角色' }]}
        >
          <Select placeholder="请选择角色">
            <Select.Option value="admin">管理员</Select.Option>
            <Select.Option value="manager">经理</Select.Option>
            <Select.Option value="operator">操作员</Select.Option>
            <Select.Option value="viewer">查看者</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="部门"
          name="department"
        >
          <Input placeholder="请输入部门" />
        </Form.Item>

        <Form.Item
          label="状态"
          name="isActive"
          valuePropName="checked"
        >
          <Switch checkedChildren="启用" unCheckedChildren="禁用" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

const SettingsPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | undefined>();
  const [saveLoading, setSaveLoading] = useState(false);

  const queryClient = useQueryClient();

  // 系统设置表单
  const {
    control: systemControl,
    handleSubmit: handleSystemSubmit,
    formState: { errors: systemErrors },
  } = useForm<SystemSettingsFormData>({
    resolver: zodResolver(systemSettingsSchema),
    defaultValues: {
      companyName: 'MonaWMS 仓储管理系统',
      companyAddress: '北京市朝阳区xxx街道xxx号',
      companyPhone: '010-12345678',
      companyEmail: 'admin@monawms.com',
      timezone: 'Asia/Shanghai',
      language: 'zh-CN',
      currency: 'CNY',
      dateFormat: 'YYYY-MM-DD',
      autoBackup: true,
      backupInterval: 24,
      maxBackupFiles: 30,
    },
  });

  // 通知设置表单
  const {
    control: notificationControl,
    handleSubmit: handleNotificationSubmit,
    formState: { errors: notificationErrors },
  } = useForm<NotificationSettingsFormData>({
    resolver: zodResolver(notificationSettingsSchema),
    defaultValues: {
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true,
      lowStockAlert: true,
      orderStatusUpdate: true,
      systemMaintenance: true,
      emailServer: 'smtp.gmail.com',
      emailPort: 587,
      emailUsername: '',
      emailPassword: '',
      smsProvider: '',
      smsApiKey: '',
    },
  });

  // 获取用户列表
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      return [
        {
          id: '1',
          username: 'admin',
          email: 'admin@monawms.com',
          fullName: '系统管理员',
          phone: '13800138000',
          role: 'admin',
          department: 'IT部门',
          isActive: true,
          lastLogin: '2024-01-15T10:30:00Z',
          createdAt: '2024-01-01T00:00:00Z',
        },
        {
          id: '2',
          username: 'manager',
          email: 'manager@monawms.com',
          fullName: '仓库经理',
          phone: '13800138001',
          role: 'manager',
          department: '仓储部门',
          isActive: true,
          lastLogin: '2024-01-15T09:15:00Z',
          createdAt: '2024-01-02T00:00:00Z',
        },
        {
          id: '3',
          username: 'operator',
          email: 'operator@monawms.com',
          fullName: '仓库操作员',
          phone: '13800138002',
          role: 'operator',
          department: '仓储部门',
          isActive: true,
          lastLogin: '2024-01-14T16:45:00Z',
          createdAt: '2024-01-03T00:00:00Z',
        },
      ] as User[];
    },
  });

  const handleTabChange = (activeKey: string) => {
    setTabValue(parseInt(activeKey));
  };

  const handleSystemSettingsSubmit = async (data: SystemSettingsFormData) => {
    setSaveLoading(true);
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('System settings saved:', data);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleNotificationSettingsSubmit = async (data: NotificationSettingsFormData) => {
    setSaveLoading(true);
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Notification settings saved:', data);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleCreateUser = () => {
    setSelectedUser(undefined);
    setUserDialogOpen(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setUserDialogOpen(true);
  };

  const handleUserSubmit = async (data: UserFormData) => {
    setSaveLoading(true);
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('User saved:', data);
      setUserDialogOpen(false);
      setSelectedUser(undefined);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } finally {
      setSaveLoading(false);
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'admin': return '管理员';
      case 'manager': return '经理';
      case 'operator': return '操作员';
      case 'viewer': return '查看者';
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'error';
      case 'manager': return 'warning';
      case 'operator': return 'processing';
      case 'viewer': return 'default';
      default: return 'default';
    }
  };

  // 用户表格列定义
  const userColumns: ColumnsType<User> = [
    {
      title: '用户',
      key: 'user',
      render: (_, user) => (
        <Space>
          <Avatar style={{ backgroundColor: '#1890ff' }}>
            {user.fullName.charAt(0)}
          </Avatar>
          <div>
            <div style={{ fontWeight: 500 }}>
              {user.fullName}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              @{user.username}
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '角色',
      key: 'role',
      render: (_, user) => (
        <Tag color={getRoleColor(user.role)}>
          {getRoleText(user.role)}
        </Tag>
      ),
    },
    {
      title: '部门',
      dataIndex: 'department',
      key: 'department',
      render: (department) => department || '-',
    },
    {
      title: '状态',
      key: 'status',
      render: (_, user) => (
        <Tag color={user.isActive ? 'success' : 'error'}>
          {user.isActive ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '最后登录',
      key: 'lastLogin',
      render: (_, user) => (
        <span style={{ color: '#666' }}>
          {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : '从未登录'}
        </span>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      align: 'center',
      render: (_, user) => (
        <Space>
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              size="small"
              onClick={() => handleEditUser(user)}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              size="small"
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ flexGrow: 1 }}>
      <Typography.Title level={2} style={{ fontWeight: 600, marginBottom: 24 }}>
        系统设置
      </Typography.Title>

      <Card>
        <Tabs
          activeKey={tabValue.toString()}
          onChange={handleTabChange}
          items={[
            { key: '0', label: <span><SettingOutlined />基本设置</span> },
            { key: '1', label: <span><BellOutlined />通知设置</span> },
            { key: '2', label: <span><PlusOutlined />用户管理</span> },
            { key: '3', label: <span><DatabaseOutlined />安全设置</span> },
          ]}
        />

        {/* 基本设置 */}
        <TabPanel value={tabValue} index={0}>
          <form onSubmit={handleSystemSubmit(handleSystemSettingsSubmit)}>
            <Row gutter={[24, 24]}>
              {/* 公司信息 */}
              <Col span={24}>
                <Collapse defaultActiveKey={['1']}>
                  <Panel header={
                    <Space>
                      <BankOutlined />
                      <span style={{ fontSize: '16px', fontWeight: 500 }}>公司信息</span>
                    </Space>
                  } key="1">
                    <Row gutter={[16, 16]}>
                      <Col xs={24} sm={12}>
                        <Controller
                          name="companyName"
                          control={systemControl}
                          render={({ field }) => (
                            <Input
                              {...field}
                              placeholder="公司名称"
                              status={systemErrors.companyName ? 'error' : ''}
                            />
                          )}
                        />  
                      </Col>
                      <Col xs={24} sm={12}>
                        <Controller
                          name="companyPhone"
                          control={systemControl}
                          render={({ field }) => (
                            <Input
                              {...field}
                              placeholder="公司电话"
                              status={systemErrors.companyPhone ? 'error' : ''}
                            />
                          )}
                        />  
                      </Col>
                      <Col span={24}>
                        <Controller
                          name="companyAddress"
                          control={systemControl}
                          render={({ field }) => (
                            <Input
                              {...field}
                              placeholder="公司地址"
                              status={systemErrors.companyAddress ? 'error' : ''}
                            />
                          )}
                        />  
                      </Col>
                      <Col span={24}>
                        <Controller
                          name="companyEmail"
                          control={systemControl}
                          render={({ field }) => (
                            <Input
                              {...field}
                              placeholder="公司邮箱"
                              type="email"
                              status={systemErrors.companyEmail ? 'error' : ''}
                            />
                          )}
                        />  
                      </Col>
                    </Row>
                  </Panel>
                </Collapse>
              </Col>

              {/* 系统配置 */}
              <Col span={24}>
                <Collapse defaultActiveKey={['2']}>
                  <Panel header={
                    <Space>
                      <SettingOutlined />
                      <span style={{ fontSize: '16px', fontWeight: 500 }}>系统配置</span>
                    </Space>
                  } key="2">
                    <Row gutter={[16, 16]}>
                      <Col xs={24} sm={12}>
                        <Controller
                          name="timezone"
                          control={systemControl}
                          render={({ field }) => (
                            <Select {...field} placeholder="请选择时区" style={{ width: '100%' }}>
                              <Option value="Asia/Shanghai">Asia/Shanghai (UTC+8)</Option>
                              <Option value="America/New_York">America/New_York (UTC-5)</Option>
                              <Option value="Europe/London">Europe/London (UTC+0)</Option>
                            </Select>
                          )}
                        />  
                      </Col>
                      <Col xs={24} sm={12}>
                        <Controller
                          name="language"
                          control={systemControl}
                          render={({ field }) => (
                            <Select {...field} placeholder="请选择语言" style={{ width: '100%' }}>
                              <Option value="zh-CN">简体中文</Option>
                              <Option value="en-US">English</Option>
                              <Option value="ja-JP">日本語</Option>
                            </Select>
                          )}
                        />  
                      </Col>
                      <Col xs={24} sm={12}>
                        <Controller
                          name="currency"
                          control={systemControl}
                          render={({ field }) => (
                            <Select {...field} placeholder="请选择货币" style={{ width: '100%' }}>
                              <Option value="CNY">人民币 (¥)</Option>
                              <Option value="USD">美元 ($)</Option>
                              <Option value="EUR">欧元 (€)</Option>
                            </Select>
                          )}
                        />  
                      </Col>
                      <Col xs={24} sm={12}>
                        <Controller
                          name="dateFormat"
                          control={systemControl}
                          render={({ field }) => (
                            <Select {...field} placeholder="请选择日期格式" style={{ width: '100%' }}>
                              <Option value="YYYY-MM-DD">YYYY-MM-DD</Option>
                              <Option value="MM/DD/YYYY">MM/DD/YYYY</Option>
                              <Option value="DD/MM/YYYY">DD/MM/YYYY</Option>
                            </Select>
                          )}
                        />  
                      </Col>
                    </Row>
                  </Panel>
                </Collapse>
              </Col>

              {/* 备份设置 */}
              <Col span={24}>
                <Collapse>
                  <Panel header={
                    <Space>
                      <DatabaseOutlined />
                      <span style={{ fontSize: '16px', fontWeight: 500 }}>备份设置</span>
                    </Space>
                  } key="3">
                    <Row gutter={[16, 16]}>
                      <Col span={24}>
                        <Controller
                          name="autoBackup"
                          control={systemControl}
                          render={({ field }) => (
                            <Space>
                              <Switch
                                {...field}
                                checked={field.value}
                              />
                              <span>启用自动备份</span>
                            </Space>
                          )}
                        />  
                      </Col>
                      <Col xs={24} sm={12}>
                        <Controller
                          name="backupInterval"
                          control={systemControl}
                          render={({ field }) => (
                            <Input
                              {...field}
                              placeholder="备份间隔（小时）"
                              type="number"
                              status={systemErrors.backupInterval ? 'error' : ''}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          )}
                        />  
                      </Col>
                      <Col xs={24} sm={12}>
                        <Controller
                          name="maxBackupFiles"
                          control={systemControl}
                          render={({ field }) => (
                            <Input
                              {...field}
                              placeholder="最大备份文件数"
                              type="number"
                              status={systemErrors.maxBackupFiles ? 'error' : ''}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          )}
                        />  
                      </Col>
                    </Row>
                  </Panel>
                </Collapse>
              </Col>

              <Col span={24}>
                <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                  <Button>
                    重置
                  </Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={saveLoading}
                    icon={<SaveOutlined />}
                  >
                    {saveLoading ? '保存中...' : '保存设置'}
                  </Button>
                </Space>
              </Col>
            </Row>
          </form>
        </TabPanel>

        {/* 通知设置 */}
        <TabPanel value={tabValue} index={1}>
          <form onSubmit={handleNotificationSubmit(handleNotificationSettingsSubmit)}>
            <Row gutter={[24, 24]}>
              {/* 通知开关 */}
              <Col span={24}>
                <Collapse defaultActiveKey={['1']}>
                  <Panel header={
                    <Space>
                      <BellOutlined />
                      <span style={{ fontSize: '16px', fontWeight: 500 }}>通知开关</span>
                    </Space>
                  } key="1">
                    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                      <Controller
                        name="emailNotifications"
                        control={notificationControl}
                        render={({ field }) => (
                          <Space>
                            <Switch
                              {...field}
                              checked={field.value}
                            />
                            <span>邮件通知</span>
                          </Space>
                        )}
                      />
                      <Controller
                        name="smsNotifications"
                        control={notificationControl}
                        render={({ field }) => (
                          <Space>
                            <Switch
                              {...field}
                              checked={field.value}
                            />
                            <span>短信通知</span>
                          </Space>
                        )}
                      />
                      <Controller
                        name="pushNotifications"
                        control={notificationControl}
                        render={({ field }) => (
                          <Space>
                            <Switch
                              {...field}
                              checked={field.value}
                            />
                            <span>推送通知</span>
                          </Space>
                        )}
                      />
                    </Space>
                  </Panel>
                </Collapse>
              </Col>

              {/* 通知类型 */}
              <Col span={24}>
                <Collapse defaultActiveKey={['2']}>
                  <Panel header={
                    <Space>
                      <InfoCircleOutlined />
                      <span style={{ fontSize: '16px', fontWeight: 500 }}>通知类型</span>
                    </Space>
                  } key="2">
                    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                      <Controller
                        name="lowStockAlert"
                        control={notificationControl}
                        render={({ field }) => (
                          <Checkbox
                            {...field}
                            checked={field.value}
                          >
                            库存不足警告
                          </Checkbox>
                        )}
                      />
                      <Controller
                        name="orderStatusUpdate"
                        control={notificationControl}
                        render={({ field }) => (
                          <Checkbox
                            {...field}
                            checked={field.value}
                          >
                            订单状态更新
                          </Checkbox>
                        )}
                      />
                      <Controller
                        name="systemMaintenance"
                        control={notificationControl}
                        render={({ field }) => (
                          <Checkbox
                            {...field}
                            checked={field.value}
                          >
                            系统维护通知
                          </Checkbox>
                        )}
                      />
                    </Space>
                  </Panel>
                </Collapse>
              </Col>

              <Col span={24}>
                <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                  <Button>
                    重置
                  </Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={saveLoading}
                    icon={saveLoading ? <Spin size="small" /> : <SaveOutlined />}
                  >
                    {saveLoading ? '保存中...' : '保存设置'}
                  </Button>
                </Space>
              </Col>
            </Row>
          </form>
        </TabPanel>

        {/* 用户管理 */}
        <TabPanel value={tabValue} index={2}>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography.Title level={4} style={{ margin: 0 }}>用户列表</Typography.Title>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreateUser}
            >
              新增用户
            </Button>
          </div>

          {usersLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Spin size="large" />
            </div>
          ) : (
            <Table
              columns={userColumns}
              dataSource={usersData}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
              }}
            />
          )}
        </TabPanel>

        {/* 安全设置 */}
        <TabPanel value={tabValue} index={3}>
          <Row gutter={[24, 24]}>
            <Col span={24}>
              <Alert
                message="安全设置功能正在开发中，敬请期待。"
                type="info"
                showIcon
              />
            </Col>
          </Row>
        </TabPanel>
      </Card>

      {/* 用户对话框 */}
      <UserDialog
        open={userDialogOpen}
        user={selectedUser}
        onClose={() => {
          setUserDialogOpen(false);
          setSelectedUser(undefined);
        }}
        onSubmit={handleUserSubmit}
        loading={saveLoading}
      />
    </div>
  );
};

export default SettingsPage;
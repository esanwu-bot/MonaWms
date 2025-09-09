import React, { useState } from 'react';
import {
  Card,
  Tabs,
  Typography,
  Avatar,
  Button,
  Form,
  Input,
  Select,
  Switch,
  List,
  Table,
  Tag,
  Divider,
  Space,
  Row,
  Col,
  Modal,
  Steps,
  Descriptions,
  Upload,
  message,
  Spin,
  Badge,
  Tooltip
} from 'antd';
import {
  UserOutlined,
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  CameraOutlined,
  SafetyOutlined,
  BellOutlined,
  GlobalOutlined,
  SkinOutlined,
  HistoryOutlined,
  LaptopOutlined,
  MobileOutlined,
  TabletOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  LockOutlined,
  KeyOutlined,

  MailOutlined,
  PhoneOutlined,
  BankOutlined,
  EnvironmentOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  EyeInvisibleOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;
const { Step } = Steps;

// 个人信息表单验证
const profileSchema = z.object({
  fullName: z.string().min(1, '请输入姓名'),
  email: z.string().email('请输入有效的邮箱地址'),
  phone: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  bio: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

// 密码修改表单验证
const passwordSchema = z.object({
  currentPassword: z.string().min(1, '请输入当前密码'),
  newPassword: z.string().min(6, '新密码至少6位'),
  confirmPassword: z.string().min(1, '请确认新密码'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: '两次输入的密码不一致',
  path: ['confirmPassword'],
});

type PasswordFormData = z.infer<typeof passwordSchema>;

// 偏好设置表单验证
const preferencesSchema = z.object({
  language: z.string().min(1, '请选择语言'),
  theme: z.string().min(1, '请选择主题'),
  timezone: z.string().min(1, '请选择时区'),
  dateFormat: z.string().min(1, '请选择日期格式'),
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  smsNotifications: z.boolean(),
});

type PreferencesFormData = z.infer<typeof preferencesSchema>;

interface LoginHistory {
  id: string;
  device: string;
  location: string;
  ip: string;
  userAgent: string;
  loginTime: string;
  status: 'success' | 'failed';
}

interface ActiveSession {
  id: string;
  device: string;
  location: string;
  ip: string;
  userAgent: string;
  loginTime: string;
  lastActivity: string;
  isCurrent: boolean;
}

const ProfilePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('1');
  const [editMode, setEditMode] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);

  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  // 个人信息表单
  const {
    control: profileControl,
    handleSubmit: handleProfileSubmit,
    reset: resetProfile,
    formState: { errors: profileErrors, isDirty: profileDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.fullName || '',
      email: user?.email || '',
      phone: user?.phone || '',
      department: user?.department || '',
      position: user?.position || '',
      bio: user?.bio || '',
    },
  });

  // 密码修改表单
  const {
    control: passwordControl,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    formState: { errors: passwordErrors },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  // 偏好设置表单
  const {
    control: preferencesControl,
    handleSubmit: handlePreferencesSubmit,
    formState: { errors: preferencesErrors },
  } = useForm<PreferencesFormData>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      language: 'zh-CN',
      theme: 'light',
      timezone: 'Asia/Shanghai',
      dateFormat: 'YYYY-MM-DD',
      emailNotifications: true,
      pushNotifications: true,
      smsNotifications: false,
    },
  });

  // 获取登录历史
  const { data: loginHistory, isLoading: loginHistoryLoading } = useQuery({
    queryKey: ['loginHistory'],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return [
        {
          id: '1',
          device: 'Chrome on Windows',
          location: '北京市朝阳区',
          ip: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          loginTime: '2024-01-15T10:30:00Z',
          status: 'success',
        },
        // 其他记录...
      ] as LoginHistory[];
    },
  });

  // 获取活跃会话
  const { data: activeSessions, isLoading: activeSessionsLoading } = useQuery({
    queryKey: ['activeSessions'],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return [
        {
          id: '1',
          device: 'Chrome on Windows',
          location: '北京市朝阳区',
          ip: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          loginTime: '2024-01-15T10:30:00Z',
          lastActivity: '2024-01-15T14:20:00Z',
          isCurrent: true,
        },
        // 其他会话...
      ] as ActiveSession[];
    },
  });

  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  const handleEditToggle = () => {
    if (editMode && profileDirty) {
      if (window.confirm('您有未保存的更改，确定要取消编辑吗？')) {
        resetProfile();
        setEditMode(false);
      }
    } else {
      setEditMode(!editMode);
    }
  };

  const handleAvatarChange = (info: any) => {
    const file = info.file;
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onProfileSubmit = async (data: ProfileFormData) => {
    setSaveLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Profile updated:', data);
      setEditMode(false);
    } finally {
      setSaveLoading(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordFormData) => {
    setSaveLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Password changed:', data);
      resetPassword();
    } finally {
      setSaveLoading(false);
    }
  };

  const onPreferencesSubmit = async (data: PreferencesFormData) => {
    setSaveLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Preferences updated:', data);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleTerminateSession = async (sessionId: string) => {
    if (window.confirm('确定要终止此会话吗？')) {
      try {
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('Session terminated:', sessionId);
        queryClient.invalidateQueries({ queryKey: ['activeSessions'] });
      } catch (error) {
        console.error('Failed to terminate session:', error);
      }
    }
  };

  const getDeviceIcon = (userAgent: string) => {
    if (userAgent.includes('iPhone') || userAgent.includes('Android')) {
      return <MobileOutlined />;
    } else if (userAgent.includes('iPad') || userAgent.includes('Tablet')) {
      return <TabletOutlined />;
    } else {
      return <LaptopOutlined />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'success';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'success': return '成功';
      case 'failed': return '失败';
      default: return status;
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Title level={3} style={{ marginBottom: 24 }}>
        个人资料
      </Title>

      <Card>
        <Tabs activeKey={activeTab} onChange={handleTabChange}>
          <TabPane
            tab={
              <span>
                <UserOutlined />
                基本信息
              </span>
            }
            key="1"
          />
          <TabPane
            tab={
              <span>
                <SafetyOutlined />
                安全设置
              </span>
            }
            key="2"
          />
          <TabPane
            tab={
              <span>
                <SkinOutlined />
                偏好设置
              </span>
            }
            key="3"
          />
          <TabPane
            tab={
              <span>
                <HistoryOutlined />
                登录历史
              </span>
            }
            key="4"
          />
        </Tabs>

        {/* 基本信息 */}
        {activeTab === '1' && (
          <div style={{ padding: 24 }}>
            <Row gutter={24}>
              {/* 头像部分 */}
              <Col xs={24} md={8}>
                <Card style={{ textAlign: 'center' }}>
                  <div style={{ position: 'relative', display: 'inline-block', marginBottom: 16 }}>
                    <Avatar
                      size={120}
                      icon={<UserOutlined />}
                      src={avatarPreview || undefined}
                    />
                    {editMode && (
                      <Upload
                        showUploadList={false}
                        beforeUpload={handleAvatarChange}
                        accept="image/*"
                      >
                        <Button
                          type="primary"
                          shape="circle"
                          icon={<CameraOutlined />}
                          style={{
                            position: 'absolute',
                            bottom: 0,
                            right: 0,
                          }}
                        />
                      </Upload>
                    )}
                  </div>
                  <Title level={4}>{user?.fullName || '用户'}</Title>
                  <Text type="secondary">@{user?.username}</Text>
                  <div style={{ marginTop: 8 }}>
                    <Tag color="blue">
                      {user?.role === 'admin' ? '管理员' : user?.role === 'manager' ? '经理' : '操作员'}
                    </Tag>
                  </div>
                </Card>
              </Col>

              {/* 基本信息表单 */}
              <Col xs={24} md={16}>
                <Card
                  title={
                    <Space>
                      <UserOutlined />
                      基本信息
                    </Space>
                  }
                  extra={
                    <Button
                      type={editMode ? 'default' : 'primary'}
                      icon={editMode ? <CloseOutlined /> : <EditOutlined />}
                      onClick={handleEditToggle}
                    >
                      {editMode ? '取消编辑' : '编辑信息'}
                    </Button>
                  }
                >
                  <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleProfileSubmit(onProfileSubmit)}
                  >
                    <Row gutter={16}>
                      <Col xs={24} sm={12}>
                        <Form.Item
                          label="姓名"
                          name="fullName"
                          validateStatus={profileErrors.fullName ? 'error' : ''}
                          help={profileErrors.fullName?.message}
                        >
                          <Controller
                            name="fullName"
                            control={profileControl}
                            render={({ field }) => (
                              <Input
                                {...field}
                                prefix={<UserOutlined />}
                                disabled={!editMode}
                              />
                            )}
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Form.Item
                          label="邮箱"
                          name="email"
                          validateStatus={profileErrors.email ? 'error' : ''}
                          help={profileErrors.email?.message}
                        >
                          <Controller
                            name="email"
                            control={profileControl}
                            render={({ field }) => (
                              <Input
                                {...field}
                                prefix={<MailOutlined />}
                                disabled={!editMode}
                              />
                            )}
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Form.Item
                          label="电话"
                          name="phone"
                        >
                          <Controller
                            name="phone"
                            control={profileControl}
                            render={({ field }) => (
                              <Input
                                {...field}
                                prefix={<PhoneOutlined />}
                                disabled={!editMode}
                              />
                            )}
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Form.Item
                          label="部门"
                          name="department"
                        >
                          <Controller
                            name="department"
                            control={profileControl}
                            render={({ field }) => (
                              <Input
                                {...field}
                                prefix={<BankOutlined />}
                                disabled={!editMode}
                              />
                            )}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={24}>
                        <Form.Item
                          label="职位"
                          name="position"
                        >
                          <Controller
                            name="position"
                            control={profileControl}
                            render={({ field }) => (
                              <Input
                                {...field}
                                disabled={!editMode}
                              />
                            )}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={24}>
                        <Form.Item
                          label="个人简介"
                          name="bio"
                        >
                          <Controller
                            name="bio"
                            control={profileControl}
                            render={({ field }) => (
                              <Input.TextArea
                                {...field}
                                rows={3}
                                disabled={!editMode}
                              />
                            )}
                          />
                        </Form.Item>
                      </Col>
                    </Row>

                    {editMode && (
                      <div style={{ textAlign: 'right', marginTop: 16 }}>
                        <Space>
                          <Button onClick={() => {
                            resetProfile();
                            setEditMode(false);
                          }}>
                            取消
                          </Button>
                          <Button
                            type="primary"
                            htmlType="submit"
                            loading={saveLoading}
                            icon={<SaveOutlined />}
                          >
                            保存
                          </Button>
                        </Space>
                      </div>
                    )}
                  </Form>
                </Card>
              </Col>
            </Row>
          </div>
        )}

        {/* 安全设置 */}
        {activeTab === '2' && (
          <div style={{ padding: 24 }}>
            <Row gutter={24}>
              {/* 修改密码 */}
              <Col xs={24} md={12}>
                <Card
                  title={
                    <Space>
                      <LockOutlined />
                      修改密码
                    </Space>
                  }
                >
                  <Form
                    layout="vertical"
                    onFinish={handlePasswordSubmit(onPasswordSubmit)}
                  >
                    <Form.Item
                      label="当前密码"
                      name="currentPassword"
                      validateStatus={passwordErrors.currentPassword ? 'error' : ''}
                      help={passwordErrors.currentPassword?.message}
                    >
                      <Controller
                        name="currentPassword"
                        control={passwordControl}
                        render={({ field }) => (
                          <Input.Password
                            {...field}
                            visibilityToggle={{
                              visible: showCurrentPassword,
                              onVisibleChange: setShowCurrentPassword,
                            }}
                          />
                        )}
                      />
                    </Form.Item>
                    <Form.Item
                      label="新密码"
                      name="newPassword"
                      validateStatus={passwordErrors.newPassword ? 'error' : ''}
                      help={passwordErrors.newPassword?.message}
                    >
                      <Controller
                        name="newPassword"
                        control={passwordControl}
                        render={({ field }) => (
                          <Input.Password
                            {...field}
                            visibilityToggle={{
                              visible: showNewPassword,
                              onVisibleChange: setShowNewPassword,
                            }}
                          />
                        )}
                      />
                    </Form.Item>
                    <Form.Item
                      label="确认新密码"
                      name="confirmPassword"
                      validateStatus={passwordErrors.confirmPassword ? 'error' : ''}
                      help={passwordErrors.confirmPassword?.message}
                    >
                      <Controller
                        name="confirmPassword"
                        control={passwordControl}
                        render={({ field }) => (
                          <Input.Password
                            {...field}
                            visibilityToggle={{
                              visible: showConfirmPassword,
                              onVisibleChange: setShowConfirmPassword,
                            }}
                          />
                        )}
                      />
                    </Form.Item>
                    <Form.Item>
                      <Button
                        type="primary"
                        htmlType="submit"
                        loading={saveLoading}
                        icon={<KeyOutlined />}
                        block
                      >
                        修改密码
                      </Button>
                    </Form.Item>
                  </Form>
                </Card>
              </Col>

              {/* 活跃会话 */}
              <Col xs={24} md={12}>
                <Card
                  title={
                    <Space>
                      <LaptopOutlined />
                      活跃会话
                    </Space>
                  }
                >
                  {activeSessionsLoading ? (
                    <div style={{ textAlign: 'center', padding: 24 }}>
                      <Spin />
                    </div>
                  ) : (
                    <List
                      dataSource={activeSessions}
                      renderItem={(session) => (
                        <List.Item
                          actions={[
                            !session.isCurrent && (
                              <Button
                                type="text"
                                danger
                                onClick={() => handleTerminateSession(session.id)}
                              >
                                终止
                              </Button>
                            )
                          ]}
                        >
                          <List.Item.Meta
                            avatar={getDeviceIcon(session.userAgent)}
                            title={
                              <Space>
                                {session.device}
                                {session.isCurrent && (
                                  <Tag color="blue">当前</Tag>
                                )}
                              </Space>
                            }
                            description={
                              <Space direction="vertical" size={0}>
                                <Text>
                                  <EnvironmentOutlined /> {session.location} • {session.ip}
                                </Text>
                                <Text type="secondary">
                                  <ClockCircleOutlined /> 最后活动: {new Date(session.lastActivity).toLocaleString()}
                                </Text>
                              </Space>
                            }
                          />
                        </List.Item>
                      )}
                    />
                  )}
                </Card>
              </Col>
            </Row>
          </div>
        )}

        {/* 偏好设置 */}
        {activeTab === '3' && (
          <div style={{ padding: 24 }}>
            <Card
              title={
                <Space>
                  <SkinOutlined />
                  偏好设置
                </Space>
              }
            >
              <Form
                layout="vertical"
                onFinish={handlePreferencesSubmit(onPreferencesSubmit)}
              >
                <Row gutter={24}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label="语言"
                      name="language"
                      validateStatus={preferencesErrors.language ? 'error' : ''}
                      help={preferencesErrors.language?.message}
                    >
                      <Controller
                        name="language"
                        control={preferencesControl}
                        render={({ field }) => (
                          <Select {...field}>
                            <Option value="zh-CN">简体中文</Option>
                            <Option value="en-US">English</Option>
                            <Option value="ja-JP">日本語</Option>
                          </Select>
                        )}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label="主题"
                      name="theme"
                      validateStatus={preferencesErrors.theme ? 'error' : ''}
                      help={preferencesErrors.theme?.message}
                    >
                      <Controller
                        name="theme"
                        control={preferencesControl}
                        render={({ field }) => (
                          <Select {...field}>
                            <Option value="light">浅色主题</Option>
                            <Option value="dark">深色主题</Option>
                            <Option value="auto">跟随系统</Option>
                          </Select>
                        )}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label="时区"
                      name="timezone"
                      validateStatus={preferencesErrors.timezone ? 'error' : ''}
                      help={preferencesErrors.timezone?.message}
                    >
                      <Controller
                        name="timezone"
                        control={preferencesControl}
                        render={({ field }) => (
                          <Select {...field}>
                            <Option value="Asia/Shanghai">Asia/Shanghai (UTC+8)</Option>
                            <Option value="America/New_York">America/New_York (UTC-5)</Option>
                            <Option value="Europe/London">Europe/London (UTC+0)</Option>
                          </Select>
                        )}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label="日期格式"
                      name="dateFormat"
                      validateStatus={preferencesErrors.dateFormat ? 'error' : ''}
                      help={preferencesErrors.dateFormat?.message}
                    >
                      <Controller
                        name="dateFormat"
                        control={preferencesControl}
                        render={({ field }) => (
                          <Select {...field}>
                            <Option value="YYYY-MM-DD">YYYY-MM-DD</Option>
                            <Option value="MM/DD/YYYY">MM/DD/YYYY</Option>
                            <Option value="DD/MM/YYYY">DD/MM/YYYY</Option>
                          </Select>
                        )}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Divider orientation="left">通知偏好</Divider>
                    <Form.Item
                      name="emailNotifications"
                      valuePropName="checked"
                    >
                      <Controller
                        name="emailNotifications"
                        control={preferencesControl}
                        render={({ field }) => (
                          <Switch
                            {...field}
                            checkedChildren="开启"
                            unCheckedChildren="关闭"
                          />
                        )}
                      />
                      <span style={{ marginLeft: 8 }}>邮件通知</span>
                    </Form.Item>
                    <Form.Item
                      name="pushNotifications"
                      valuePropName="checked"
                    >
                      <Controller
                        name="pushNotifications"
                        control={preferencesControl}
                        render={({ field }) => (
                          <Switch
                            {...field}
                            checkedChildren="开启"
                            unCheckedChildren="关闭"
                          />
                        )}
                      />
                      <span style={{ marginLeft: 8 }}>推送通知</span>
                    </Form.Item>
                    <Form.Item
                      name="smsNotifications"
                      valuePropName="checked"
                    >
                      <Controller
                        name="smsNotifications"
                        control={preferencesControl}
                        render={({ field }) => (
                          <Switch
                            {...field}
                            checkedChildren="开启"
                            unCheckedChildren="关闭"
                          />
                        )}
                      />
                      <span style={{ marginLeft: 8 }}>短信通知</span>
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <div style={{ textAlign: 'right', marginTop: 16 }}>
                      <Space>
                        <Button>重置</Button>
                        <Button
                          type="primary"
                          htmlType="submit"
                          loading={saveLoading}
                          icon={<SaveOutlined />}
                        >
                          保存设置
                        </Button>
                      </Space>
                    </div>
                  </Col>
                </Row>
              </Form>
            </Card>
          </div>
        )}

        {/* 登录历史 */}
        {activeTab === '4' && (
          <div style={{ padding: 24 }}>
            <Card
              title={
                <Space>
                  <HistoryOutlined />
                  登录历史
                </Space>
              }
            >
              {loginHistoryLoading ? (
                <div style={{ textAlign: 'center', padding: 24 }}>
                  <Spin />
                </div>
              ) : (
                <Table
                  dataSource={loginHistory}
                  columns={[
                    {
                      title: '设备',
                      dataIndex: 'device',
                      render: (text, record) => (
                        <Space>
                          {getDeviceIcon(record.userAgent)}
                          {text}
                        </Space>
                      ),
                    },
                    {
                      title: '位置',
                      dataIndex: 'location',
                      render: (text) => (
                        <Space>
                          <EnvironmentOutlined />
                          {text}
                        </Space>
                      ),
                    },
                    {
                      title: 'IP地址',
                      dataIndex: 'ip',
                    },
                    {
                      title: '登录时间',
                      dataIndex: 'loginTime',
                      render: (text) => (
                        <Space>
                          <ClockCircleOutlined />
                          {new Date(text).toLocaleString()}
                        </Space>
                      ),
                    },
                    {
                      title: '状态',
                      dataIndex: 'status',
                      render: (status) => (
                        <Tag
                          icon={status === 'success' ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                          color={getStatusColor(status)}
                        >
                          {getStatusText(status)}
                        </Tag>
                      ),
                    },
                  ]}
                  rowKey="id"
                />
              )}
            </Card>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ProfilePage;
import React, { useState, useEffect } from 'react';

import {
  SettingOutlined,
  SecurityScanOutlined,
  BellOutlined,
  DatabaseOutlined,
  GlobalOutlined,
  MailOutlined,
  MessageOutlined,
  CloudUploadOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SaveOutlined,
  ReloadOutlined,
  DownOutlined,
  UserOutlined,
  TeamOutlined,
  KeyOutlined,
  BankOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  GlobalOutlined as GlobeOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { Modal, Form, Input, Select as AntSelect, Button as AntButton } from 'antd';

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

function a11yProps(index: number) {
  return {
    id: `settings-tab-${index}`,
    'aria-controls': `settings-tabpanel-${index}`,
  };
}

import {
  Card,
  Row,
  Col,
  Button,
  Switch,
  Select,
  Divider,
  List,
  Alert,
  Spin,
  Table,
  Avatar,
  Tooltip,
  Collapse,
  Slider,
  Radio,
  Checkbox,
  Typography,
  Space,
  Tag,
  Tabs,
} from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../services/api';

const { Title } = Typography;
const { Panel } = Collapse;
const { TabPane } = Tabs;
const { Option } = Select;

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

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
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
      case 'operator': return 'info';
      case 'viewer': return 'default';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
        系统设置
      </Typography>

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="设置标签页">
            <Tab label="基本设置" icon={<Settings />} {...a11yProps(0)} />
            <Tab label="通知设置" icon={<Notifications />} {...a11yProps(1)} />
            <Tab label="用户管理" icon={<Group />} {...a11yProps(2)} />
            <Tab label="安全设置" icon={<Security />} {...a11yProps(3)} />
          </Tabs>
        </Box>

        {/* 基本设置 */}
        <TabPanel value={tabValue} index={0}>
          <Box component="form" onSubmit={handleSystemSubmit(handleSystemSettingsSubmit)}>
            <Row gutter={[24, 24]}>
              {/* 公司信息 */}
              <Col span={24}>
                <Accordion defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Business />
                      <Typography variant="h6">公司信息</Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Row gutter={[16, 16]}>
                      <Col xs={24} sm={12}>
                        <Controller
                          name="companyName"
                          control={systemControl}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              fullWidth
                              label="公司名称"
                              required
                              error={!!systemErrors.companyName}
                              helperText={systemErrors.companyName?.message}
                            />
                          )}
                        />  
                      </Col>
                      <Col xs={24} sm={12}>
                        <Controller
                          name="companyPhone"
                          control={systemControl}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              fullWidth
                              label="公司电话"
                              required
                              error={!!systemErrors.companyPhone}
                              helperText={systemErrors.companyPhone?.message}
                            />
                          )}
                        />  
                      </Col>
                      <Col span={24}>
                        <Controller
                          name="companyAddress"
                          control={systemControl}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              fullWidth
                              label="公司地址"
                              required
                              error={!!systemErrors.companyAddress}
                              helperText={systemErrors.companyAddress?.message}
                            />
                          )}
                        />  
                      </Col>
                      <Col span={24}>
                        <Controller
                          name="companyEmail"
                          control={systemControl}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              fullWidth
                              label="公司邮箱"
                              type="email"
                              required
                              error={!!systemErrors.companyEmail}
                              helperText={systemErrors.companyEmail?.message}
                            />
                          )}
                        />  
                      </Col>
                    </Row>
                  </AccordionDetails>
                </Accordion>
              </Col>

              {/* 系统配置 */}
              <Col span={24}>
                <Accordion defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Settings />
                      <Typography variant="h6">系统配置</Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Row gutter={[16, 16]}>
                      <Col xs={24} sm={12}>
                        <Controller
                          name="timezone"
                          control={systemControl}
                          render={({ field }) => (
                            <FormControl fullWidth>
                              <InputLabel>时区</InputLabel>
                              <Select {...field} label="时区">
                                <MenuItem value="Asia/Shanghai">Asia/Shanghai (UTC+8)</MenuItem>
                                <MenuItem value="America/New_York">America/New_York (UTC-5)</MenuItem>
                                <MenuItem value="Europe/London">Europe/London (UTC+0)</MenuItem>
                              </Select>
                            </FormControl>
                          )}
                        />  
                      </Col>
                      <Col xs={24} sm={12}>
                        <Controller
                          name="language"
                          control={systemControl}
                          render={({ field }) => (
                            <FormControl fullWidth>
                              <InputLabel>语言</InputLabel>
                              <Select {...field} label="语言">
                                <MenuItem value="zh-CN">简体中文</MenuItem>
                                <MenuItem value="en-US">English</MenuItem>
                                <MenuItem value="ja-JP">日本語</MenuItem>
                              </Select>
                            </FormControl>
                          )}
                        />  
                      </Col>
                      <Col xs={24} sm={12}>
                        <Controller
                          name="currency"
                          control={systemControl}
                          render={({ field }) => (
                            <FormControl fullWidth>
                              <InputLabel>货币</InputLabel>
                              <Select {...field} label="货币">
                                <MenuItem value="CNY">人民币 (¥)</MenuItem>
                                <MenuItem value="USD">美元 ($)</MenuItem>
                                <MenuItem value="EUR">欧元 (€)</MenuItem>
                              </Select>
                            </FormControl>
                          )}
                        />  
                      </Col>
                      <Col xs={24} sm={12}>
                        <Controller
                          name="dateFormat"
                          control={systemControl}
                          render={({ field }) => (
                            <FormControl fullWidth>
                              <InputLabel>日期格式</InputLabel>
                              <Select {...field} label="日期格式">
                                <MenuItem value="YYYY-MM-DD">YYYY-MM-DD</MenuItem>
                                <MenuItem value="MM/DD/YYYY">MM/DD/YYYY</MenuItem>
                                <MenuItem value="DD/MM/YYYY">DD/MM/YYYY</MenuItem>
                              </Select>
                            </FormControl>
                          )}
                        />  
                      </Col>
                    </Row>
                  </AccordionDetails>
                </Accordion>
              </Col>

              {/* 备份设置 */}
              <Col span={24}>
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Backup />
                      <Typography variant="h6">备份设置</Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Row gutter={[16, 16]}>
                      <Col span={24}>
                        <Controller
                          name="autoBackup"
                          control={systemControl}
                          render={({ field }) => (
                            <FormControlLabel
                              control={
                                <Switch
                                  {...field}
                                  checked={field.value}
                                />
                              }
                              label="启用自动备份"
                            />
                          )}
                        />  
                      </Col>
                      <Col xs={24} sm={12}>
                        <Controller
                          name="backupInterval"
                          control={systemControl}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              fullWidth
                              label="备份间隔（小时）"
                              type="number"
                              error={!!systemErrors.backupInterval}
                              helperText={systemErrors.backupInterval?.message}
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
                            <TextField
                              {...field}
                              fullWidth
                              label="最大备份文件数"
                              type="number"
                              error={!!systemErrors.maxBackupFiles}
                              helperText={systemErrors.maxBackupFiles?.message}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          )}
                        />  
                      </Col>
                    </Row>
                  </AccordionDetails>
                </Accordion>
              </Col>

              <Col span={24}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                  <Button variant="outlined">
                    重置
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={saveLoading}
                    startIcon={saveLoading ? <CircularProgress size={20} /> : <Save />}
                  >
                    {saveLoading ? '保存中...' : '保存设置'}
                  </Button>
                </Box>
              </Col>
            </Row>
          </Box>
        </TabPanel>

        {/* 通知设置 */}
        <TabPanel value={tabValue} index={1}>
          <Box component="form" onSubmit={handleNotificationSubmit(handleNotificationSettingsSubmit)}>
            <Row gutter={[24, 24]}>
              {/* 通知开关 */}
              <Col span={24}>
                <Accordion defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Notifications />
                      <Typography variant="h6">通知开关</Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <FormGroup>
                      <Controller
                        name="emailNotifications"
                        control={notificationControl}
                        render={({ field }) => (
                          <FormControlLabel
                            control={
                              <Switch
                                {...field}
                                checked={field.value}
                              />
                            }
                            label="邮件通知"
                          />
                        )}
                      />
                      <Controller
                        name="smsNotifications"
                        control={notificationControl}
                        render={({ field }) => (
                          <FormControlLabel
                            control={
                              <Switch
                                {...field}
                                checked={field.value}
                              />
                            }
                            label="短信通知"
                          />
                        )}
                      />
                      <Controller
                        name="pushNotifications"
                        control={notificationControl}
                        render={({ field }) => (
                          <FormControlLabel
                            control={
                              <Switch
                                {...field}
                                checked={field.value}
                              />
                            }
                            label="推送通知"
                          />
                        )}
                      />
                    </FormGroup>
                  </AccordionDetails>
                </Accordion>
              </Col>

              {/* 通知类型 */}
              <Col span={24}>
                <Accordion defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Info />
                      <Typography variant="h6">通知类型</Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <FormGroup>
                      <Controller
                        name="lowStockAlert"
                        control={notificationControl}
                        render={({ field }) => (
                          <FormControlLabel
                            control={
                              <Checkbox
                                {...field}
                                checked={field.value}
                              />
                            }
                            label="库存不足警告"
                          />
                        )}
                      />
                      <Controller
                        name="orderStatusUpdate"
                        control={notificationControl}
                        render={({ field }) => (
                          <FormControlLabel
                            control={
                              <Checkbox
                                {...field}
                                checked={field.value}
                              />
                            }
                            label="订单状态更新"
                          />
                        )}
                      />
                      <Controller
                        name="systemMaintenance"
                        control={notificationControl}
                        render={({ field }) => (
                          <FormControlLabel
                            control={
                              <Checkbox
                                {...field}
                                checked={field.value}
                              />
                            }
                            label="系统维护通知"
                          />
                        )}
                      />
                    </FormGroup>
                  </AccordionDetails>
                </Accordion>
              </Col>

              <Col span={24}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                  <Button variant="outlined">
                    重置
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={saveLoading}
                    startIcon={saveLoading ? <CircularProgress size={20} /> : <Save />}
                  >
                    {saveLoading ? '保存中...' : '保存设置'}
                  </Button>
                </Box>
              </Col>
            </Row>
          </Box>
        </TabPanel>

        {/* 用户管理 */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">用户列表</Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleCreateUser}
            >
              新增用户
            </Button>
          </Box>

          {usersLoading ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>用户</TableCell>
                    <TableCell>邮箱</TableCell>
                    <TableCell>角色</TableCell>
                    <TableCell>部门</TableCell>
                    <TableCell>状态</TableCell>
                    <TableCell>最后登录</TableCell>
                    <TableCell align="center">操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {usersData?.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ bgcolor: 'primary.main' }}>
                            {user.fullName.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {user.fullName}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              @{user.username}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {user.email}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getRoleText(user.role)}
                          color={getRoleColor(user.role) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {user.department || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.isActive ? '启用' : '禁用'}
                          color={user.isActive ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="textSecondary">
                          {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : '从未登录'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="编辑">
                            <IconButton
                              size="small"
                              onClick={() => handleEditUser(user)}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="删除">
                            <IconButton
                              size="small"
                              color="error"
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        {/* 安全设置 */}
        <TabPanel value={tabValue} index={3}>
          <Row gutter={[24, 24]}>
            <Col span={24}>
              <Alert severity="info">
                安全设置功能正在开发中，敬请期待。
              </Alert>
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
    </Box>
  );
};

export default SettingsPage;
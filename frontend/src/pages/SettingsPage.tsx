import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Slider,
  RadioGroup,
  Radio,
  FormLabel,
  Checkbox,
  FormGroup,
} from '@mui/material';
import {
  Settings,
  Security,
  Notifications,
  Storage,
  Language,
  Palette,
  Email,
  Sms,
  Backup,
  CloudUpload,
  Delete,
  Edit,
  Add,
  Save,
  Refresh,
  ExpandMore,
  Person,
  Group,
  VpnKey,
  AdminPanelSettings,
  Business,
  LocationOn,
  Phone,
  Public,
  Schedule,
  Warning,
  CheckCircle,
  Error,
  Info,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../services/api';

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
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
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

const UserDialog: React.FC<UserDialogProps> = ({
  open,
  user,
  onClose,
  onSubmit,
  loading = false,
}) => {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: user?.username || '',
      email: user?.email || '',
      fullName: user?.fullName || '',
      phone: user?.phone || '',
      role: user?.role || '',
      department: user?.department || '',
      isActive: user?.isActive ?? true,
    },
  });

  React.useEffect(() => {
    if (open) {
      reset({
        username: user?.username || '',
        email: user?.email || '',
        fullName: user?.fullName || '',
        phone: user?.phone || '',
        role: user?.role || '',
        department: user?.department || '',
        isActive: user?.isActive ?? true,
      });
    }
  }, [open, user, reset]);

  const handleFormSubmit = (data: UserFormData) => {
    onSubmit(data);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Person />
          {user ? '编辑用户' : '新增用户'}
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box component="form" sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Controller
                name="username"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="用户名"
                    required
                    error={!!errors.username}
                    helperText={errors.username?.message}
                    disabled={loading || !!user}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="邮箱"
                    type="email"
                    required
                    error={!!errors.email}
                    helperText={errors.email?.message}
                    disabled={loading}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <Controller
                name="fullName"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="姓名"
                    required
                    error={!!errors.fullName}
                    helperText={errors.fullName?.message}
                    disabled={loading}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="phone"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="电话"
                    disabled={loading}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="role"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.role}>
                    <InputLabel>角色</InputLabel>
                    <Select
                      {...field}
                      label="角色"
                      disabled={loading}
                    >
                      <MenuItem value="admin">管理员</MenuItem>
                      <MenuItem value="manager">经理</MenuItem>
                      <MenuItem value="operator">操作员</MenuItem>
                      <MenuItem value="viewer">查看者</MenuItem>
                    </Select>
                    {errors.role && (
                      <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                        {errors.role.message}
                      </Typography>
                    )}
                  </FormControl>
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <Controller
                name="department"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="部门"
                    disabled={loading}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <Controller
                name="isActive"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Switch
                        {...field}
                        checked={field.value}
                        disabled={loading}
                      />
                    }
                    label="启用用户"
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
            <Grid container spacing={3}>
              {/* 公司信息 */}
              <Grid item xs={12}>
                <Accordion defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Business />
                      <Typography variant="h6">公司信息</Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
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
                      </Grid>
                      <Grid item xs={12} sm={6}>
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
                      </Grid>
                      <Grid item xs={12}>
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
                      </Grid>
                      <Grid item xs={12}>
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
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              </Grid>

              {/* 系统配置 */}
              <Grid item xs={12}>
                <Accordion defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Settings />
                      <Typography variant="h6">系统配置</Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
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
                      </Grid>
                      <Grid item xs={12} sm={6}>
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
                      </Grid>
                      <Grid item xs={12} sm={6}>
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
                      </Grid>
                      <Grid item xs={12} sm={6}>
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
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              </Grid>

              {/* 备份设置 */}
              <Grid item xs={12}>
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Backup />
                      <Typography variant="h6">备份设置</Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
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
                      </Grid>
                      <Grid item xs={12} sm={6}>
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
                      </Grid>
                      <Grid item xs={12} sm={6}>
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
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              </Grid>

              <Grid item xs={12}>
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
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        {/* 通知设置 */}
        <TabPanel value={tabValue} index={1}>
          <Box component="form" onSubmit={handleNotificationSubmit(handleNotificationSettingsSubmit)}>
            <Grid container spacing={3}>
              {/* 通知开关 */}
              <Grid item xs={12}>
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
              </Grid>

              {/* 通知类型 */}
              <Grid item xs={12}>
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
              </Grid>

              <Grid item xs={12}>
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
              </Grid>
            </Grid>
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
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Alert severity="info">
                安全设置功能正在开发中，敬请期待。
              </Alert>
            </Grid>
          </Grid>
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
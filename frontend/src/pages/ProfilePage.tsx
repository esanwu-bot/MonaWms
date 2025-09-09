import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Avatar,
  Divider,
  Alert,
  CircularProgress,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  Person,
  Edit,
  Save,
  Cancel,
  PhotoCamera,
  Security,
  Notifications,
  Language,
  Palette,
  History,
  Devices,
  Visibility,
  VisibilityOff,
  Phone,
  Email,
  Business,
  LocationOn,
  CalendarToday,
  AccessTime,
  Computer,
  Smartphone,
  Tablet,
  CheckCircle,
  Warning,
  Error,
  Info,
  Lock,
  VpnKey,
  Shield,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '../store/authStore';
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
      id={`profile-tabpanel-${index}`}
      aria-labelledby={`profile-tab-${index}`}
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
    id: `profile-tab-${index}`,
    'aria-controls': `profile-tabpanel-${index}`,
  };
}

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
  const [tabValue, setTabValue] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);

  const { user } = useAuthStore();
  const queryClient = useQueryClient();

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
      // 模拟API调用
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
        {
          id: '2',
          device: 'Safari on iPhone',
          location: '上海市浦东新区',
          ip: '192.168.1.101',
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
          loginTime: '2024-01-14T16:45:00Z',
          status: 'success',
        },
        {
          id: '3',
          device: 'Chrome on Android',
          location: '广州市天河区',
          ip: '192.168.1.102',
          userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-G991B)',
          loginTime: '2024-01-13T09:15:00Z',
          status: 'failed',
        },
      ] as LoginHistory[];
    },
  });

  // 获取活跃会话
  const { data: activeSessions, isLoading: activeSessionsLoading } = useQuery({
    queryKey: ['activeSessions'],
    queryFn: async () => {
      // 模拟API调用
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
        {
          id: '2',
          device: 'Safari on iPhone',
          location: '上海市浦东新区',
          ip: '192.168.1.101',
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
          loginTime: '2024-01-14T16:45:00Z',
          lastActivity: '2024-01-14T18:30:00Z',
          isCurrent: false,
        },
      ] as ActiveSession[];
    },
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleEditToggle = () => {
    if (editMode && profileDirty) {
      // 如果有未保存的更改，询问用户
      if (window.confirm('您有未保存的更改，确定要取消编辑吗？')) {
        resetProfile();
        setEditMode(false);
      }
    } else {
      setEditMode(!editMode);
    }
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
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
      // 模拟API调用
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
      // 模拟API调用
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
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Preferences updated:', data);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleTerminateSession = async (sessionId: string) => {
    if (window.confirm('确定要终止此会话吗？')) {
      try {
        // 模拟API调用
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
      return <Smartphone />;
    } else if (userAgent.includes('iPad') || userAgent.includes('Tablet')) {
      return <Tablet />;
    } else {
      return <Computer />;
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
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
        个人资料
      </Typography>

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="个人资料标签页">
            <Tab label="基本信息" icon={<Person />} {...a11yProps(0)} />
            <Tab label="安全设置" icon={<Security />} {...a11yProps(1)} />
            <Tab label="偏好设置" icon={<Palette />} {...a11yProps(2)} />
            <Tab label="登录历史" icon={<History />} {...a11yProps(3)} />
          </Tabs>
        </Box>

        {/* 基本信息 */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            {/* 头像部分 */}
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Box sx={{ position: 'relative', display: 'inline-block', mb: 2 }}>
                  <Avatar
                    sx={{ width: 120, height: 120, fontSize: '3rem' }}
                    src={avatarPreview || undefined}
                  >
                    {user?.fullName?.charAt(0) || 'U'}
                  </Avatar>
                  {editMode && (
                    <IconButton
                      sx={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        bgcolor: 'primary.main',
                        color: 'white',
                        '&:hover': { bgcolor: 'primary.dark' },
                      }}
                      component="label"
                    >
                      <PhotoCamera />
                      <input
                        type="file"
                        hidden
                        accept="image/*"
                        onChange={handleAvatarChange}
                      />
                    </IconButton>
                  )}
                </Box>
                <Typography variant="h6" gutterBottom>
                  {user?.fullName || '用户'}
                </Typography>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  @{user?.username}
                </Typography>
                <Chip
                  label={user?.role === 'admin' ? '管理员' : user?.role === 'manager' ? '经理' : '操作员'}
                  color="primary"
                  size="small"
                />
              </Paper>
            </Grid>

            {/* 基本信息表单 */}
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6">基本信息</Typography>
                  <Button
                    variant={editMode ? 'outlined' : 'contained'}
                    startIcon={editMode ? <Cancel /> : <Edit />}
                    onClick={handleEditToggle}
                  >
                    {editMode ? '取消编辑' : '编辑信息'}
                  </Button>
                </Box>

                <Box component="form" onSubmit={handleProfileSubmit(onProfileSubmit)}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Controller
                        name="fullName"
                        control={profileControl}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            label="姓名"
                            required
                            disabled={!editMode}
                            error={!!profileErrors.fullName}
                            helperText={profileErrors.fullName?.message}
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
                        name="email"
                        control={profileControl}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            label="邮箱"
                            type="email"
                            required
                            disabled={!editMode}
                            error={!!profileErrors.email}
                            helperText={profileErrors.email?.message}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <Email />
                                </InputAdornment>
                              ),
                            }}
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Controller
                        name="phone"
                        control={profileControl}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            label="电话"
                            disabled={!editMode}
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
                    <Grid item xs={12} sm={6}>
                      <Controller
                        name="department"
                        control={profileControl}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            label="部门"
                            disabled={!editMode}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <Business />
                                </InputAdornment>
                              ),
                            }}
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Controller
                        name="position"
                        control={profileControl}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            label="职位"
                            disabled={!editMode}
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Controller
                        name="bio"
                        control={profileControl}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            label="个人简介"
                            multiline
                            rows={3}
                            disabled={!editMode}
                          />
                        )}
                      />
                    </Grid>
                  </Grid>

                  {editMode && (
                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                      <Button
                        variant="outlined"
                        onClick={() => {
                          resetProfile();
                          setEditMode(false);
                        }}
                      >
                        取消
                      </Button>
                      <Button
                        type="submit"
                        variant="contained"
                        disabled={saveLoading || !profileDirty}
                        startIcon={saveLoading ? <CircularProgress size={20} /> : <Save />}
                      >
                        {saveLoading ? '保存中...' : '保存'}
                      </Button>
                    </Box>
                  )}
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        {/* 安全设置 */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            {/* 修改密码 */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Lock />
                  修改密码
                </Typography>
                <Box component="form" onSubmit={handlePasswordSubmit(onPasswordSubmit)}>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Controller
                        name="currentPassword"
                        control={passwordControl}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            label="当前密码"
                            type={showCurrentPassword ? 'text' : 'password'}
                            required
                            error={!!passwordErrors.currentPassword}
                            helperText={passwordErrors.currentPassword?.message}
                            InputProps={{
                              endAdornment: (
                                <InputAdornment position="end">
                                  <IconButton
                                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                    edge="end"
                                  >
                                    {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                                  </IconButton>
                                </InputAdornment>
                              ),
                            }}
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Controller
                        name="newPassword"
                        control={passwordControl}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            label="新密码"
                            type={showNewPassword ? 'text' : 'password'}
                            required
                            error={!!passwordErrors.newPassword}
                            helperText={passwordErrors.newPassword?.message}
                            InputProps={{
                              endAdornment: (
                                <InputAdornment position="end">
                                  <IconButton
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    edge="end"
                                  >
                                    {showNewPassword ? <VisibilityOff /> : <Visibility />}
                                  </IconButton>
                                </InputAdornment>
                              ),
                            }}
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Controller
                        name="confirmPassword"
                        control={passwordControl}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            label="确认新密码"
                            type={showConfirmPassword ? 'text' : 'password'}
                            required
                            error={!!passwordErrors.confirmPassword}
                            helperText={passwordErrors.confirmPassword?.message}
                            InputProps={{
                              endAdornment: (
                                <InputAdornment position="end">
                                  <IconButton
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    edge="end"
                                  >
                                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                                  </IconButton>
                                </InputAdornment>
                              ),
                            }}
                          />
                        )}
                      />
                    </Grid>
                  </Grid>
                  <Box sx={{ mt: 3 }}>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={saveLoading}
                      startIcon={saveLoading ? <CircularProgress size={20} /> : <VpnKey />}
                      fullWidth
                    >
                      {saveLoading ? '修改中...' : '修改密码'}
                    </Button>
                  </Box>
                </Box>
              </Paper>
            </Grid>

            {/* 活跃会话 */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Devices />
                  活跃会话
                </Typography>
                {activeSessionsLoading ? (
                  <Box sx={{ textAlign: 'center', py: 2 }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <List>
                    {activeSessions?.map((session) => (
                      <ListItem key={session.id} divider>
                        <ListItemIcon>
                          {getDeviceIcon(session.userAgent)}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {session.device}
                              {session.isCurrent && (
                                <Chip label="当前" color="primary" size="small" />
                              )}
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="caption" display="block">
                                {session.location} • {session.ip}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                最后活动: {new Date(session.lastActivity).toLocaleString()}
                              </Typography>
                            </Box>
                          }
                        />
                        {!session.isCurrent && (
                          <ListItemSecondaryAction>
                            <Button
                              size="small"
                              color="error"
                              onClick={() => handleTerminateSession(session.id)}
                            >
                              终止
                            </Button>
                          </ListItemSecondaryAction>
                        )}
                      </ListItem>
                    ))}
                  </List>
                )}
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        {/* 偏好设置 */}
        <TabPanel value={tabValue} index={2}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Palette />
              偏好设置
            </Typography>
            <Box component="form" onSubmit={handlePreferencesSubmit(onPreferencesSubmit)}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="language"
                    control={preferencesControl}
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
                    name="theme"
                    control={preferencesControl}
                    render={({ field }) => (
                      <FormControl fullWidth>
                        <InputLabel>主题</InputLabel>
                        <Select {...field} label="主题">
                          <MenuItem value="light">浅色主题</MenuItem>
                          <MenuItem value="dark">深色主题</MenuItem>
                          <MenuItem value="auto">跟随系统</MenuItem>
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="timezone"
                    control={preferencesControl}
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
                    name="dateFormat"
                    control={preferencesControl}
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
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" gutterBottom>
                    通知偏好
                  </Typography>
                  <Controller
                    name="emailNotifications"
                    control={preferencesControl}
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
                    name="pushNotifications"
                    control={preferencesControl}
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
                  <Controller
                    name="smsNotifications"
                    control={preferencesControl}
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
          </Paper>
        </TabPanel>

        {/* 登录历史 */}
        <TabPanel value={tabValue} index={3}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <History />
              登录历史
            </Typography>
            {loginHistoryLoading ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>设备</TableCell>
                      <TableCell>位置</TableCell>
                      <TableCell>IP地址</TableCell>
                      <TableCell>登录时间</TableCell>
                      <TableCell>状态</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loginHistory?.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {getDeviceIcon(record.userAgent)}
                            {record.device}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LocationOn fontSize="small" color="action" />
                            {record.location}
                          </Box>
                        </TableCell>
                        <TableCell>{record.ip}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <AccessTime fontSize="small" color="action" />
                            {new Date(record.loginTime).toLocaleString()}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getStatusText(record.status)}
                            color={getStatusColor(record.status) as any}
                            size="small"
                            icon={record.status === 'success' ? <CheckCircle /> : <Error />}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </TabPanel>
      </Card>
    </Box>
  );
};

export default ProfilePage;
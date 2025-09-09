import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
  Paper,
  Fade,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Person,
  Lock,
  Warehouse,
  Security,
  TrendingUp,
  Analytics,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

// 登录表单验证模式
const loginSchema = z.object({
  username: z
    .string()
    .min(1, '请输入用户名')
    .min(3, '用户名至少3个字符')
    .max(50, '用户名不能超过50个字符'),
  password: z
    .string()
    .min(1, '请输入密码')
    .min(6, '密码至少6个字符')
    .max(100, '密码不能超过100个字符'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading, error, clearError } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  // 如果已登录，重定向到仪表盘
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // 清除错误信息
  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.username, data.password);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      // 错误已在store中处理
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%)',
          pointerEvents: 'none',
        },
      }}
    >
      {/* 装饰元素 */}
      <Box
        sx={{
          position: 'absolute',
          top: '10%',
          left: '5%',
          width: 100,
          height: 100,
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.1)',
          animation: 'float 6s ease-in-out infinite',
          '@keyframes float': {
            '0%, 100%': { transform: 'translateY(0px)' },
            '50%': { transform: 'translateY(-20px)' },
          },
        }}
      />
      
      <Box
        sx={{
          position: 'absolute',
          bottom: '15%',
          right: '10%',
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.08)',
          animation: 'float 8s ease-in-out infinite',
          animationDelay: '1s',
        }}
      />

      {/* 左侧装饰区域 - 仅在大屏幕显示 */}
      <Box
        sx={{
          display: { xs: 'none', lg: 'flex' },
          width: { lg: '50%' },
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          p: 8,
          color: 'white',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Fade in={true} timeout={1000}>
          <Box sx={{ textAlign: 'center', maxWidth: 600 }}>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 120,
                height: 120,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.1) 100%)',
                mb: 4,
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              <Warehouse sx={{ fontSize: 60, color: 'white' }} />
            </Box>
            
            <Typography 
              variant="h2" 
              sx={{ 
                fontWeight: 700, 
                mb: 2,
                background: 'linear-gradient(135deg, #fff 0%, #e0e0e0 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              MonaWMS
            </Typography>
            
            <Typography variant="h5" sx={{ mb: 4, opacity: 0.95, fontWeight: 500 }}>
              智能仓库管理系统
            </Typography>
            
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 2, 
              mb: 6,
              textAlign: 'left',
              maxWidth: 500,
              margin: '0 auto'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <TrendingUp sx={{ color: 'rgba(255, 255, 255, 0.9)' }} />
                <Typography variant="body1" sx={{ opacity: 0.9 }}>
                  高效管理您的仓库库存
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Analytics sx={{ color: 'rgba(255, 255, 255, 0.9)' }} />
                <Typography variant="body1" sx={{ opacity: 0.9 }}>
                  实时跟踪货物流转
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Security sx={{ color: 'rgba(255, 255, 255, 0.9)' }} />
                <Typography variant="body1" sx={{ opacity: 0.9 }}>
                  提升仓储运营效率，助力企业数字化转型
                </Typography>
              </Box>
            </Box>
          </Box>
        </Fade>
      </Box>

      {/* 右侧登录区域 */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          width: { xs: '100%', lg: '50%' },
          minHeight: '100vh',
          p: { xs: 3, sm: 4, md: 6, lg: 2, xl: 4 },
          position: 'relative',
          zIndex: 2,
        }}
      >
        <Fade in={true} timeout={800}>
          <Paper
            elevation={24}
            sx={{
              p: { xs: 3, sm: 4, md: 5 },
              borderRadius: 3,
              width: '100%',
              maxWidth: 'none',
              background: 'rgba(255, 255, 255, 0.97)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
              transition: 'box-shadow 0.3s ease',
              '&:hover': {
                boxShadow: '0 24px 48px rgba(0, 0, 0, 0.18)',
              },
            }}
          >
            {/* 移动端标题 */}
            <Box sx={{ textAlign: 'center', mb: 4, display: { xs: 'block', lg: 'none' } }}>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 70,
                  height: 70,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  mb: 2,
                }}
              >
                <Warehouse sx={{ fontSize: 32, color: 'white' }} />
              </Box>
              <Typography
                component="h1"
                variant="h5"
                sx={{
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 1,
                }}
              >
                MonaWMS
              </Typography>
              <Typography variant="body2" color="text.secondary">
                智能仓库管理系统
              </Typography>
            </Box>

            {/* PC端标题 */}
            <Box sx={{ textAlign: 'center', mb: 4, display: { xs: 'none', lg: 'block' } }}>
              <Typography
                component="h1"
                variant="h4"
                sx={{
                  fontWeight: 600,
                  color: 'text.primary',
                  mb: 1,
                }}
              >
                欢迎登录
              </Typography>
              <Typography variant="body1" color="text.secondary">
                请输入您的账户信息
              </Typography>
            </Box>

            {/* 错误提示 */}
            {error && (
              <Alert 
                severity="error" 
                sx={{ 
                  mb: 3,
                  borderRadius: 2,
                  background: 'rgba(244, 67, 54, 0.1)',
                }} 
                onClose={clearError}
              >
                {error}
              </Alert>
            )}

            {/* 登录表单 */}
            <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
              <Controller
                name="username"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    margin="normal"
                    required
                    fullWidth
                    label="用户名"
                    autoComplete="username"
                    autoFocus
                    error={!!errors.username}
                    helperText={errors.username?.message || ' '}
                    FormHelperTextProps={{ sx: { minHeight: 24 } }}
                    disabled={isLoading || isSubmitting}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Person color="action" />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        fontSize: '1rem',
                        '&:hover fieldset': {
                          borderColor: '#667eea',
                        },
                      },
                      mb: 2.5,
                    }}
                  />
                )}
              />

              <Controller
                name="password"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    margin="normal"
                    required
                    fullWidth
                    label="密码"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    error={!!errors.password}
                    helperText={errors.password?.message || ' '}
                    FormHelperTextProps={{ sx: { minHeight: 24 } }}
                    disabled={isLoading || isSubmitting}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock color="action" />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle password visibility"
                            onClick={handleTogglePasswordVisibility}
                            edge="end"
                            disabled={isLoading || isSubmitting}
                            sx={{ color: 'text.secondary' }}
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        fontSize: '1rem',
                        '&:hover fieldset': {
                          borderColor: '#667eea',
                        },
                      },
                      mb: 3,
                    }}
                  />
                )}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={isLoading || isSubmitting}
                sx={{
                  mt: 2,
                  mb: 2,
                  py: 1.5,
                  minHeight: 48,
                  borderRadius: 2,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                    boxShadow: '0 6px 20px rgba(102, 126, 234, 0.4)',
                  },
                  '&:disabled': {
                    background: '#ccc',
                    boxShadow: 'none',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                {isLoading || isSubmitting ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={20} color="inherit" />
                    登录中...
                  </Box>
                ) : (
                  '登录'
                )}
              </Button>
            </Box>

            {/* 底部信息 */}
            <Box sx={{ textAlign: 'center', mt: 4, pt: 2, borderTop: '1px solid rgba(0, 0, 0, 0.1)' }}>
              <Typography variant="body2" color="text.secondary">
                © 2024 MonaWMS. All rights reserved.
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                茂名贤戈网络科技有限公司
              </Typography>
            </Box>
          </Paper>
        </Fade>
      </Box>
    </Box>
  );
};

export default LoginPage;
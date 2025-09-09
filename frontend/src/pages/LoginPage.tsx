import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Form, 
  Input, 
  Button, 
  Typography, 
  Alert, 
  Spin, 
  Divider, 
  Space,
  Row,
  Col,
  theme,
  Modal
} from 'antd';
import { 
  EyeInvisibleOutlined, 
  EyeOutlined, 
  UserOutlined, 
  LockOutlined,
  HomeOutlined,
  LineChartOutlined,
  PieChartOutlined,
  SafetyOutlined
} from '@ant-design/icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const { Title, Text } = Typography;
const { useToken } = theme;

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
  const { token } = useToken();

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
    <div style={{
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
    }}>
      {/* 装饰元素 */}
      <div style={{
        position: 'absolute',
        top: '10%',
        left: '5%',
        width: 100,
        height: 100,
        borderRadius: '50%',
        background: 'rgba(255, 255, 255, 0.1)',
        animation: 'float 6s ease-in-out infinite',
      }} />
      
      <div style={{
        position: 'absolute',
        bottom: '15%',
        right: '10%',
        width: 80,
        height: 80,
        borderRadius: '50%',
        background: 'rgba(255, 255, 255, 0.08)',
        animation: 'float 8s ease-in-out infinite',
        animationDelay: '1s',
      }} />

      {/* 左侧装饰区域 - 仅在大屏幕显示 */}
      <div style={{
        display: { xs: 'none', lg: 'flex' },
        width: '50%',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: token.paddingLG * 2,
        color: 'white',
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{ textAlign: 'center', maxWidth: 600 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 120,
            height: 120,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.1) 100%)',
            marginBottom: token.marginLG,
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}>
            <HomeOutlined style={{ fontSize: 48, color: 'white' }} />
          </div>
          
          <Title 
            level={1}
            style={{ 
              fontWeight: 700, 
              marginBottom: token.marginMD,
              background: 'linear-gradient(135deg, #fff 0%, #e0e0e0 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            MonaWMS
          </Title>
          
          <Title level={3} style={{ marginBottom: token.marginLG, opacity: 0.95, fontWeight: 500 }}>
            智能仓库管理系统
          </Title>
          
          <Space 
            direction="vertical" 
            size="middle" 
            style={{ 
              marginBottom: token.marginXL,
              textAlign: 'left',
              maxWidth: 500,
              margin: '0 auto'
            }}
          >
            <Space>
              <LineChartOutlined style={{ color: 'rgba(255, 255, 255, 0.9)' }} />
              <Text style={{ opacity: 0.9 }}>
                高效管理您的仓库库存
              </Text>
            </Space>
            <Space>
              <PieChartOutlined style={{ color: 'rgba(255, 255, 255, 0.9)' }} />
              <Text style={{ opacity: 0.9 }}>
                实时跟踪货物流转
              </Text>
            </Space>
            <Space>
              <SafetyOutlined style={{ color: 'rgba(255, 255, 255, 0.9)' }} />
              <Text style={{ opacity: 0.9 }}>
                提升仓储运营效率，助力企业数字化转型
              </Text>
            </Space>
          </Space>
        </div>
      </div>

      {/* 右侧登录区域 */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        width: '50%',
        minHeight: '100vh',
        padding: token.paddingLG,
        position: 'relative',
        zIndex: 2,
      }}>
        <Card
          style={{
            padding: token.paddingLG,
            borderRadius: token.borderRadiusLG,
            width: '100%',
            maxWidth: 500,
            background: 'rgba(255, 255, 255, 0.97)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
          }}
        >
          {/* 移动端标题 */}
          <div style={{ textAlign: 'center', marginBottom: token.marginLG }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 70,
              height: 70,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              marginBottom: token.marginMD,
            }}>
              <HomeOutlined style={{ fontSize: 32, color: 'white' }} />
            </div>
            <Title
              level={3}
              style={{
                fontWeight: 700,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: token.marginXS,
              }}
            >
              MonaWMS
            </Title>
            <Text type="secondary">
              智能仓库管理系统
            </Text>
          </div>

          {/* PC端标题 */}
          <div style={{ textAlign: 'center', marginBottom: token.marginLG }}>
            <Title
              level={3}
              style={{
                fontWeight: 600,
                color: token.colorTextHeading,
                marginBottom: token.marginXS,
              }}
            >
              欢迎登录
            </Title>
            <Text type="secondary">
              请输入您的账户信息
            </Text>
          </div>

          {/* 错误提示 */}
          {error && (
            <Alert 
              type="error"
              message={error}
              style={{ 
                marginBottom: token.marginLG,
                borderRadius: token.borderRadiusSM,
                background: 'rgba(244, 67, 54, 0.1)',
              }} 
              closable
              onClose={clearError}
            />
          )}

          {/* 登录表单 */}
          <Form onFinish={handleSubmit(onSubmit)} layout="vertical">
            <Form.Item
              label="用户名"
              validateStatus={errors.username ? 'error' : ''}
              help={errors.username?.message || ' '}
            >
              <Controller
                name="username"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    prefix={<UserOutlined />}
                    placeholder="请输入用户名"
                    disabled={isLoading || isSubmitting}
                    size="large"
                  />
                )}
              />
            </Form.Item>

            <Form.Item
              label="密码"
              validateStatus={errors.password ? 'error' : ''}
              help={errors.password?.message || ' '}
            >
              <Controller
                name="password"
                control={control}
                render={({ field }) => (
                  <Input.Password
                    {...field}
                    prefix={<LockOutlined />}
                    placeholder="请输入密码"
                    type={showPassword ? 'text' : 'password'}
                    disabled={isLoading || isSubmitting}
                    size="large"
                    iconRender={(visible) => (
                      <span onClick={handleTogglePasswordVisibility}>
                        {visible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                      </span>
                    )}
                  />
                )}
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                block
                size="large"
                loading={isLoading || isSubmitting}
                style={{
                  height: 48,
                  borderRadius: token.borderRadiusLG,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
                }}
              >
                {isLoading || isSubmitting ? '登录中...' : '登录'}
              </Button>
            </Form.Item>
          </Form>

          {/* 底部信息 */}
          <div style={{ 
            textAlign: 'center', 
            marginTop: token.marginLG, 
            paddingTop: token.paddingMD, 
            borderTop: '1px solid rgba(0, 0, 0, 0.1)' 
          }}>
            <Text type="secondary">
              © 2024 MonaWMS. All rights reserved.
            </Text>
            <Text type="secondary" style={{ marginTop: token.marginXXS }}>
              茂名贤戈网络科技有限公司
            </Text>
          </div>
        </Card>
      </div>

      {/* 全局样式 */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
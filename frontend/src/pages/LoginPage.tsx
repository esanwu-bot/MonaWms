import React, { useEffect, useState } from 'react';
import { Button, Card, Form, Input, Spin, Typography } from 'antd';
import { EyeInvisibleOutlined, EyeOutlined, LockOutlined, UserOutlined } from '@ant-design/icons';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useWarehouseStore } from '../store/warehouseStore';

const { Title, Text } = Typography;

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
  const { fetchWarehouses } = useWarehouseStore();
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  useEffect(() => () => clearError(), [clearError]);

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.username, data.password);
      const user = useAuthStore.getState().user;
      if (user?.id) await fetchWarehouses(Number(user.id));
      navigate('/dashboard', { replace: true });
    } catch {
      /* 错误已在 store 中处理 */
    }
  };

  return (
    <div className="wm-login">
      <div className="wm-login-bg" />

      <div className="wm-login-box">
        <div className="wm-login-brand">
          <div className="wm-logo-mark">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round">
              <path d="M4 18v-6M8 18V8M12 18V4M16 18v-8M20 18v-4" />
            </svg>
          </div>
          <div className="wm-logo-text">
            <div className="t1">通信设备WMS</div>
            <div className="t2">MONA WMS v3.2</div>
          </div>
        </div>

        <Card className="wm-login-card">
          <Title level={3} className="wm-login-title">
            欢迎登录
          </Title>
          <Text className="wm-login-sub">请输入您的账户信息以进入智能仓储管理系统</Text>

          {error && <div className="wm-login-error">{error}</div>}

          <Form onFinish={handleSubmit(onSubmit)} layout="vertical" requiredMark={false}>
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
                    disabled={isLoading || isSubmitting}
                    size="large"
                    iconRender={(visible) => (
                      <span onClick={() => setShowPassword(!visible)}>
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
                className="wm-login-submit"
              >
                {isLoading || isSubmitting ? '登录中...' : '登 录'}
              </Button>
            </Form.Item>
          </Form>

          {isLoading && (
            <div style={{ textAlign: 'center' }}>
              <Spin size="small" />
            </div>
          )}

          <div className="wm-login-foot">
            <Text>© 2026 MonaWMS · 通信设备智能仓储管理系统</Text>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;

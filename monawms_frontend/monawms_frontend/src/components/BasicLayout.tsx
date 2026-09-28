import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Avatar, Layout, Menu, Space, Typography, Button, theme } from 'antd';
import { UserOutlined } from '@ant-design/icons';

import WarehouseSwitcher from './WarehouseSwitcher';
import { useAuthStore } from '../stores/auth';
import { useWarehouseStore } from '../stores/warehouse';
import { can } from '../hooks/usePermission';
import { menuItems } from '../router';
import { ROLE_LABEL } from '../api/permission';

const { Header, Sider, Content } = Layout;

/**
 * 主布局：左侧菜单 + 顶栏（仓库切换器 + 用户信息）
 *
 * 菜单按权限过滤：无权限的入口直接不渲染，
 * 与 PermissionRoute 形成双重保险（菜单不显示 + 路由也进不去）。
 */
export default function BasicLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clear);
  const list = useWarehouseStore((s) => s.list);
  const currentId = useWarehouseStore((s) => s.currentId);
  const resetWarehouse = useWarehouseStore((s) => s.reset);

  const grantRole = list.find((w) => w.warehouseId === currentId)?.grantRole ?? null;

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const items = menuItems
    .filter((m) => !m.action || can(m.action as never, { user, grantRole, hasWarehouse: !!currentId }))
    .map((m) => ({ key: m.key, label: m.label }));

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
        <div
          style={{
            height: 48,
            margin: 12,
            color: '#fff',
            fontWeight: 600,
            fontSize: 16,
            lineHeight: '48px',
            textAlign: 'center',
          }}
        >
          {collapsed ? 'WMS' : 'MonaWMS'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={items}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingInline: 24,
          }}
        >
          {/* 仓库切换器：只展示已授权仓库，切换后所有请求自动带 warehouse_id */}
          <WarehouseSwitcher />

          <Space size={12}>
            <Avatar size="small" icon={<UserOutlined />} />
            <Typography.Text style={{ color: '#fff' }}>{user?.username}</Typography.Text>
            <Typography.Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>
              {ROLE_LABEL[user?.role ?? 'operator']}
              {grantRole ? ` · ${ROLE_LABEL[grantRole]}` : ''}
            </Typography.Text>
            <Button
              size="small"
              type="text"
              style={{ color: 'rgba(255,255,255,0.65)' }}
              onClick={() => {
                clearAuth();
                resetWarehouse();
                navigate('/login');
              }}
            >
              退出
            </Button>
          </Space>
        </Header>

        <Content style={{ margin: 16 }}>
          <div
            style={{
              padding: 24,
              minHeight: 360,
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}

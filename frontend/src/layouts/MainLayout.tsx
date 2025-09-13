import React, { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Badge, Typography, Divider } from 'antd';
import type { MenuProps } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  HomeOutlined,
  ShoppingOutlined,
  AppstoreOutlined,
  ShoppingCartOutlined,
  CarOutlined,
  BarcodeOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
  ToolOutlined,
  UnorderedListOutlined,
  ProjectOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../store/authStore';

const { Header, Sider, Content } = Layout;

const drawerWidth = 240;

// 导航菜单项
const menuItems = [
  {
    key: 'dashboard',
    icon: <DashboardOutlined />,
    label: '仪表盘',
  },
  {
    key: 'warehouses',
    icon: <HomeOutlined />,
    label: '仓库管理',
  },
  {
    key: 'devices',
    icon: <ToolOutlined />,
    label: '设备管理',
  },
  {
    key: 'products',
    icon: <ShoppingOutlined />,
    label: '产品管理',
  },
  {
    key: '/categories',
    icon: <AppstoreOutlined />,
    label: '分类管理',
  },
  {
    key: '/inventory',
    icon: <ShoppingCartOutlined />,
    label: '库存管理',
  },
  {
    key: '/inbound',
    icon: <CarOutlined />,
    label: '入库管理',
  },
  {
    key: '/outbound',
    icon: <CarOutlined />,
    label: '出库管理',
  },
  {
    key: '/wireless-spare-parts',
    icon: <ShoppingOutlined />,
    label: '无线备件登记表',
  },
  {
    key: '/serial-numbers',
    icon: <BarcodeOutlined />,
    label: '序列号管理',
  },
  {
    key: '/bom',
    icon: <UnorderedListOutlined />,
    label: 'BOM管理',
  },
  {
    key: '/projects',
    icon: <ProjectOutlined />,
    label: '项目管理',
  },
  {
    key: '/settings',
    icon: <SettingOutlined />,
    label: '系统设置',
  },
];

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  
  const [collapsed, setCollapsed] = useState(false);

  const handleMenuClick = (key: string) => {
    navigate(key);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleProfile = () => {
    navigate('/profile');
  };

  // 获取用户角色显示文本
  const getRoleText = (role: string) => {
    const roleMap: Record<string, string> = {
      ADMIN: '管理员',
      MANAGER: '经理',
      OPERATOR: '操作员',
      VIEWER: '查看者',
    };
    return roleMap[role] || role;
  };

  // 用户下拉菜单项
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人资料',
      onClick: handleProfile,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        width={drawerWidth}
        breakpoint="lg"
        onBreakpoint={(broken) => {
          setCollapsed(broken);
        }}
      >
        <div style={{ height: 64, padding: 16, display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start' }}>
          <Typography.Title level={4} style={{ margin: 0, color: '#fff' }}>
            {collapsed ? 'M' : 'MonaWMS'}
          </Typography.Title>
        </div>
        <Divider style={{ margin: 0, borderColor: 'rgba(255,255,255,0.1)' }} />
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => handleMenuClick(key)}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: 0, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ paddingLeft: 16 }}>
            {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
              className: 'trigger',
              onClick: () => setCollapsed(!collapsed),
              style: { fontSize: 18 }
            })}
            <span style={{ marginLeft: 16, fontSize: 16 }}>仓库管理系统</span>
          </div>
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', paddingRight: 16 }}>
              <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <Avatar style={{ marginRight: 8 }}>
                    {user.fullName?.charAt(0) || user.username?.charAt(0) || 'U'}
                  </Avatar>
                  <span>{user.fullName || user.username || '用户'}</span>
                </div>
              </Dropdown>
            </div>
          )}
        </Header>
        <Content style={{ margin: '24px 16px', padding: 24, background: '#fff', minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
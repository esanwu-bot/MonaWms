import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Dropdown, Avatar, Input, Tooltip, Badge } from 'antd';
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
  DeleteOutlined,
  DatabaseOutlined,
  SafetyOutlined,
  FileTextOutlined,
  SearchOutlined,
  BellOutlined,
  GlobalOutlined,
  TeamOutlined,
  FileSearchOutlined,
  ContainerOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../store/authStore';
import { useWarehouseStore } from '../store/warehouseStore';
import { usePermission } from '../hooks/usePermission';
import WarehouseSwitcher from '../components/WarehouseSwitcher';

interface NavItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: '主要功能',
    items: [
      { key: '/dashboard', label: '仪表板', icon: <DashboardOutlined /> },
      { key: '/warehouses', label: '仓库管理', icon: <HomeOutlined /> },
      // G1 收敛：设备已并入产品主数据（products），设备页仅保留台账查询，入口隐藏（路由 /devices 仍可直接访问）
      // { key: '/devices', label: '设备登记', icon: <ToolOutlined /> },
      { key: '/products', label: '产品管理', icon: <ShoppingOutlined /> },
    ],
  },
  {
    label: '库存管理',
    items: [
      { key: '/inventory', label: '库存查询', icon: <ShoppingCartOutlined /> },
      { key: '/inbound', label: '入库管理', icon: <CarOutlined /> },
      { key: '/outbound', label: '出库管理', icon: <CarOutlined /> },
      { key: '/scrap', label: '报废管理', icon: <DeleteOutlined /> },
      { key: '/stocktakes', label: '库存盘点', icon: <FileSearchOutlined /> },
      { key: '/reconcile', label: '库存对账', icon: <ContainerOutlined /> },
      { key: '/serial-numbers', label: '序列号管理', icon: <BarcodeOutlined /> },
      { key: '/wireless-spare-parts', label: '无线备件登记', icon: <ShoppingOutlined /> },
    ],
  },
  {
    label: '系统功能',
    items: [
      { key: '/users', label: '会员管理', icon: <TeamOutlined /> },
      { key: '/operation-logs', label: '操作日志', icon: <FileTextOutlined /> },
      { key: '/grant-matrix', label: '仓库授权', icon: <SafetyOutlined /> },
      { key: '/categories', label: '分类管理', icon: <AppstoreOutlined /> },
      { key: '/bom', label: 'BOM 管理', icon: <UnorderedListOutlined /> },
      { key: '/projects', label: '项目管理', icon: <ProjectOutlined /> },
      { key: '/dictionary', label: '数据字典', icon: <DatabaseOutlined /> },
      { key: '/settings', label: '系统设置', icon: <SettingOutlined /> },
    ],
  },
];

const PAGE_NAME: Record<string, string> = {
  '/dashboard': '仪表板',
  '/warehouses': '仓库管理',
  '/devices': '设备登记',
  '/products': '产品管理',
  '/categories': '分类管理',
  '/inventory': '库存查询',
  '/inbound': '入库管理',
  '/outbound': '出库管理',
  '/scrap': '报废管理',
  '/stocktakes': '库存盘点',
  '/stocktake/:id/execute': '盘点执行',
  '/stocktakes/:id/count': '盘点执行',
  '/reconcile': '库存对账',
  '/serial-numbers': '序列号管理',
  '/wireless-spare-parts': '无线备件登记表',
  '/bom': 'BOM 管理',
  '/projects': '项目管理',
  '/dictionary': '数据字典',
  '/users': '会员管理',
  '/operation-logs': '操作日志',
  '/grant-matrix': '仓库授权',
  '/settings': '系统设置',
  '/profile': '个人资料',
};

/** 侧边栏 logo 标记：通信信号柱 */
const LogoMark: React.FC = () => (
  <div className="wm-logo-mark">
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round">
      <path d="M4 18v-6M8 18V8M12 18V4M16 18v-8M20 18v-4" />
    </svg>
  </div>
);

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { fetchWarehouses } = useWarehouseStore();
  const { can, globalRole } = usePermission();
  const [collapsed, setCollapsed] = useState(false);
  const [clock, setClock] = useState('');
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    if (user?.id) {
      fetchWarehouses(Number(user.id));
    }
  }, [user?.id, fetchWarehouses]);

  // 顶栏实时时钟（原型 .clock）
  useEffect(() => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const tick = () => {
      const d = new Date();
      setClock(
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
          d.getMinutes()
        )}:${pad(d.getSeconds())}`
      );
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const visibleGroups = useMemo(
    () =>
      NAV_GROUPS.map((g) => ({
        ...g,
        items: g.items.filter((it) => {
          if (it.key === '/users') return can('user:manage');
          if (it.key === '/grant-matrix') return can('grant:manage');
          if (it.key === '/operation-logs') return can('operation_log:view');
          return true;
        }),
      })).filter((g) => g.items.length > 0),
    [can]
  );

  // 参数路由（/stocktakes/123/count 等）按前缀兜底匹配
  const currentName =
    PAGE_NAME[location.pathname] ||
    (location.pathname.startsWith('/stocktake')
      ? '盘点执行'
      : undefined) ||
    '控制面板';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人资料',
      onClick: () => navigate('/profile'),
    },
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: handleLogout },
  ];

  return (
    <div className="wm-app">
      <aside className={`wm-sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="wm-logo">
          <LogoMark />
          <div className="wm-logo-text">
            <div className="t1">通信设备WMS</div>
            <div className="t2">MONA WMS v3.2</div>
          </div>
        </div>

        <nav className="wm-nav">
          {visibleGroups.map((g) => (
            <div key={g.label}>
              <div className="wm-nav-label">{g.label}</div>
              {g.items.map((it) => (
                <div
                  key={it.key}
                  className={`wm-nav-item ${location.pathname.startsWith(it.key) ? 'active' : ''}`}
                  onClick={() => navigate(it.key)}
                >
                  <span className="ico">{it.icon}</span>
                  <span>{it.label}</span>
                  {it.badge && <span className="badge">{it.badge}</span>}
                </div>
              ))}
            </div>
          ))}
        </nav>

        <div className="wm-sidebar-foot">
          <Dropdown menu={{ items: userMenuItems }} placement="topLeft" trigger={['click']}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, cursor: 'pointer', minWidth: 0, flex: 1 }}>
              <Avatar size={36} style={{ background: 'linear-gradient(135deg,#0e7490,#155e75)', flexShrink: 0 }}>
                {user?.fullName?.charAt(0) || user?.username?.charAt(0) || 'U'}
              </Avatar>
              <div className="wm-user-meta">
                <div className="nm">{user?.fullName || user?.username || '未登录用户'}</div>
                <div className="rl">
                  <span className="wm-dot-live" />
                  在线 · {globalRole === 'admin' ? '管理员' : '录入员'}
                </div>
              </div>
            </div>
          </Dropdown>
        </div>
      </aside>

      <div className="wm-main">
        <header className="wm-topbar">
          <Tooltip title={collapsed ? '展开菜单' : '收起菜单'}>
            <div className="wm-icon-btn" onClick={() => setCollapsed(!collapsed)}>
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </div>
          </Tooltip>

          <div className="wm-crumb">
            <span>通信设备WMS</span>
            <span className="sep">/</span>
            <b>{currentName}</b>
          </div>

          <div className="wm-search">
            <span className="ico">
              <SearchOutlined />
            </span>
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索设备、单号、序列号、供应商…"
              allowClear
              variant="outlined"
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <WarehouseSwitcher />
            <div className="wm-clock">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
              <span>{clock || '--:--:--'}</span>
            </div>
            <Tooltip title="通知">
              <Badge dot>
                <div className="wm-icon-btn">
                  <BellOutlined />
                </div>
              </Badge>
            </Tooltip>
            <Tooltip title="仓库上下文">
              <div className="wm-icon-btn">
                <GlobalOutlined />
              </div>
            </Tooltip>
          </div>
        </header>

        <main className="wm-content">
          <div className="wm-page" key={location.pathname}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;

import React, { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

import PermissionRoute from '../router/PermissionRoute';

const Login = lazy(() => import('../pages/Login'));
const Dashboard = lazy(() => import('../pages/Dashboard'));
const InventoryList = lazy(() => import('../pages/inventory/List'));
const InboundList = lazy(() => import('../pages/inbound/List'));
const OutboundList = lazy(() => import('../pages/outbound/List'));
const ReportCenter = lazy(() => import('../pages/reports/Center'));
const GrantMatrix = lazy(() => import('../pages/grant/Matrix'));

/**
 * 路由表
 *
 * 权限写在路由层：action 对应后端 config/permission.php 的键。
 * requireWarehouse=true 的页面必须在顶栏选了仓库才能进。
 */
export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  { path: '/', element: <Navigate to="/dashboard" replace /> },

  // 只读页面：已登录即可
  {
    element: <PermissionRoute />,
    children: [{ path: 'dashboard', element: <Dashboard /> }],
  },

  // 仓库内只读：需要仓库上下文
  {
    element: <PermissionRoute action="inventory:read" requireWarehouse />,
    children: [{ path: 'inventory', element: <InventoryList /> }],
  },

  // 出入库录入：仓库管理员与录入员都可进
  {
    element: <PermissionRoute action="inbound:write" requireWarehouse />,
    children: [{ path: 'inbound', element: <InboundList /> }],
  },
  {
    element: <PermissionRoute action="outbound:write" requireWarehouse />,
    children: [{ path: 'outbound', element: <OutboundList /> }],
  },

  // 报表导出
  {
    element: <PermissionRoute action="report:export" requireWarehouse />,
    children: [{ path: 'reports', element: <ReportCenter /> }],
  },

  // 授权管理：系统级动作，仅全局 admin
  {
    element: <PermissionRoute action="grant:manage" />,
    children: [{ path: 'grants', element: <GrantMatrix /> }],
  },

  { path: '*', element: <Navigate to="/dashboard" replace /> },
]);

/** 侧边菜单（按权限过滤后再渲染） */
export const menuItems = [
  { key: '/dashboard', label: '首页看板', action: undefined },
  { key: '/inventory', label: '库存查询', action: 'inventory:read' },
  { key: '/inbound', label: '入库管理', action: 'inbound:write' },
  { key: '/outbound', label: '出库管理', action: 'outbound:write' },
  { key: '/reports', label: '报表中心', action: 'report:export' },
  { key: '/grants', label: '授权管理', action: 'grant:manage' },
] as const;

export default router;

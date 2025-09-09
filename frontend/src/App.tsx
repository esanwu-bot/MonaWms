import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/zh-cn';

import { theme } from './utils/theme';
import { queryClient } from './utils/queryClient';
import { useAuthStore } from './store/authStore';

// 布局组件
import MainLayout from './layouts/MainLayout';

// 页面组件
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import WarehousesPage from './pages/WarehousesPage';
import ProductsPage from './pages/ProductsPage';
import CategoriesPage from './pages/CategoriesPage';
import InventoryPage from './pages/InventoryPage';
import InboundPage from './pages/InboundPage';
import OutboundPage from './pages/OutboundPage';
// ReportsPage已删除
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import DebugTokenPage from './pages/DebugTokenPage';
import WirelessSparePartsPage from './pages/WirelessSparePartsPage';

// 路由保护组件
interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();
  
  // 如果正在加载，显示加载状态
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// 公共路由组件（已登录用户不能访问）
const PublicRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();
  
  // 如果正在加载，显示加载状态
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

function App() {
  const { initializeAuth } = useAuthStore();

  // 初始化认证状态
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="zh-cn">
          <CssBaseline />
          <Router>
            <Routes>
              {/* 公共路由 */}
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <LoginPage />
                  </PublicRoute>
                }
              />
              
              {/* 受保护的路由 */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <MainLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                
                {/* 仓库管理 */}
                <Route path="warehouses" element={<WarehousesPage />} />
                
                {/* 产品管理 */}
                <Route path="products" element={<ProductsPage />} />
                
                {/* 分类管理 */}
                <Route path="categories" element={<CategoriesPage />} />
                
                {/* 库存管理 */}
                <Route path="inventory" element={<InventoryPage />} />
                
                {/* 入库管理 */}
                <Route path="inbound" element={<InboundPage />} />
                
                {/* 出库管理 */}
                <Route path="outbound" element={<OutboundPage />} />
                
                {/* 无线备件出入库登记表 */}
                <Route path="wireless-spare-parts" element={<WirelessSparePartsPage />} />
                
                {/* 报表分析页面已删除 */}
                
                {/* 系统设置 */}
                <Route path="settings" element={<SettingsPage />} />
                
                {/* 个人资料 */}
                <Route path="profile" element={<ProfilePage />} />
                
                {/* Token调试页面 */}
                <Route path="debug-token" element={<DebugTokenPage />} />
              </Route>
              
              {/* 404页面 */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Router>
          
          {/* React Query开发工具 */}
          {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
        </LocalizationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

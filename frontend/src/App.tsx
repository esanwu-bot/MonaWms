import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import 'dayjs/locale/zh-cn';
// 引入Ant Design样式
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import 'antd/dist/reset.css';

import { queryClient } from './utils/queryClient';
import { useAuthStore } from './store/authStore';

// 布局组件
import MainLayout from './layouts/MainLayout';

// 页面组件
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import WarehousesPage from './pages/WarehousesPage';
import DevicesPage from './pages/DevicesPage';
import ProductsPage from './pages/ProductsPage';
import CategoriesPage from './pages/CategoriesPage';
import SerialNumbersPage from './pages/SerialNumbersPage';
import InventoryPage from './pages/InventoryPage';
import InboundPage from './pages/InboundPage';
import OutboundPage from './pages/OutboundPage';
// ReportsPage已删除
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';

import WirelessSparePartsPage from './pages/WirelessSparePartsPage';
import BOMPage from './pages/BOMPage';
import ProjectsPage from './pages/ProjectsPage';
import ScrapPage from './pages/ScrapPage';
import DictionaryPage from './pages/DictionaryPage';

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
      <ConfigProvider locale={zhCN} theme={{
        token: {
          colorPrimary: '#1890ff',
        },
      }}>
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
                
                {/* 设备管理 */}
                <Route path="devices" element={<DevicesPage />} />
                
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
                
                {/* 序列号管理 */}
                <Route path="serial-numbers" element={<SerialNumbersPage />} />
                
                {/* BOM管理 */}
                <Route path="bom" element={<BOMPage />} />
                
                {/* 项目管理 */}
                <Route path="projects" element={<ProjectsPage />} />
                
                {/* 报废管理 */}
                <Route path="scrap" element={<ScrapPage />} />
                
                {/* 数据字典 */}
                <Route path="dictionary" element={<DictionaryPage />} />
                
                {/* 报表分析页面已删除 */}
                
                {/* 系统设置 */}
                <Route path="settings" element={<SettingsPage />} />
                
                {/* 个人资料 */}
                <Route path="profile" element={<ProfilePage />} />
                
                {/* Token调试页面已移除 */}
              </Route>
              
              {/* 404页面 */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </Router>
        
        {/* React Query开发工具 */}
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </ConfigProvider>
    </QueryClientProvider>
  );
}

export default App;
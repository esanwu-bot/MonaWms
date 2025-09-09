import { QueryClient } from '@tanstack/react-query';
import type { ErrorResponse } from '../types/api';

// 创建QueryClient实例
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 数据保持新鲜的时间（5分钟）
      staleTime: 5 * 60 * 1000,
      // 缓存时间（10分钟）
      gcTime: 10 * 60 * 1000,
      // 重试次数
      retry: (failureCount, error: any) => {
        // 对于401错误不重试
        if (error?.response?.status === 401) {
          return false;
        }
        // 最多重试2次
        return failureCount < 2;
      },
      // 重试延迟
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // 窗口重新获得焦点时重新获取数据
      refetchOnWindowFocus: false,
      // 网络重连时重新获取数据
      refetchOnReconnect: true,
    },
    mutations: {
      // 错误处理
      onError: (error: ErrorResponse) => {
        console.error('Mutation error:', error);
        // 这里可以添加全局错误处理逻辑
        // 比如显示错误通知
      },
    },
  },
});

// 查询键工厂
export const queryKeys = {
  // 认证相关
  auth: {
    user: ['auth', 'user'] as const,
  },
  
  // 仓库相关
  warehouses: {
    all: ['warehouses'] as const,
    lists: () => [...queryKeys.warehouses.all, 'list'] as const,
    list: (params?: any) => [...queryKeys.warehouses.lists(), params] as const,
    details: () => [...queryKeys.warehouses.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.warehouses.details(), id] as const,
    stats: () => [...queryKeys.warehouses.all, 'stats'] as const,
    active: () => [...queryKeys.warehouses.all, 'active'] as const,
  },

  // 项目相关
  projects: {
    all: ['projects'] as const,
    lists: () => [...queryKeys.projects.all, 'list'] as const,
    list: (params?: any) => [...queryKeys.projects.lists(), params] as const,
    detail: (id: string) => [...queryKeys.projects.all, id] as const,
  },
  
  // 产品相关
  products: {
    all: ['products'] as const,
    lists: () => [...queryKeys.products.all, 'list'] as const,
    list: (params?: any) => [...queryKeys.products.lists(), params] as const,
    details: () => [...queryKeys.products.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.products.details(), id] as const,
    stats: () => [...queryKeys.products.all, 'stats'] as const,
    lowStock: () => [...queryKeys.products.all, 'lowStock'] as const,
    bySku: (sku: string) => [...queryKeys.products.all, 'sku', sku] as const,
    byBarcode: (barcode: string) => [...queryKeys.products.all, 'barcode', barcode] as const,
  },
  
  // 分类相关
  categories: {
    all: ['categories'] as const,
    lists: () => [...queryKeys.categories.all, 'list'] as const,
    list: (params?: any) => [...queryKeys.categories.lists(), params] as const,
    tree: () => [...queryKeys.categories.all, 'tree'] as const,
    details: () => [...queryKeys.categories.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.categories.details(), id] as const,
    stats: () => [...queryKeys.categories.all, 'stats'] as const,
    root: () => [...queryKeys.categories.all, 'root'] as const,
    children: (parentId: string) => [...queryKeys.categories.all, 'children', parentId] as const,
    path: (id: string) => [...queryKeys.categories.all, 'path', id] as const,
  },
  
  // 供应商相关
  suppliers: {
    all: ['suppliers'] as const,
    lists: () => [...queryKeys.suppliers.all, 'list'] as const,
    list: (params?: any) => [...queryKeys.suppliers.lists(), params] as const,
    details: () => [...queryKeys.suppliers.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.suppliers.details(), id] as const,
    stats: () => [...queryKeys.suppliers.all, 'stats'] as const,
    active: () => [...queryKeys.suppliers.all, 'active'] as const,
  },
  
  // 客户相关
  customers: {
    all: ['customers'] as const,
    lists: () => [...queryKeys.customers.all, 'list'] as const,
    list: (params?: any) => [...queryKeys.customers.lists(), params] as const,
    details: () => [...queryKeys.customers.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.customers.details(), id] as const,
    stats: () => [...queryKeys.customers.all, 'stats'] as const,
    active: () => [...queryKeys.customers.all, 'active'] as const,
  },
  
  // 库存相关
  inventory: {
    all: ['inventory'] as const,
    lists: () => [...queryKeys.inventory.all, 'list'] as const,
    list: (params?: any) => [...queryKeys.inventory.lists(), params] as const,
    byProduct: (productId: string) => [...queryKeys.inventory.all, 'product', productId] as const,
    byWarehouse: (warehouseId: string) => [...queryKeys.inventory.all, 'warehouse', warehouseId] as const,
  },
  
  // 入库相关
  inbound: {
    all: ['inbound'] as const,
    lists: () => [...queryKeys.inbound.all, 'list'] as const,
    list: (params?: any) => [...queryKeys.inbound.lists(), params] as const,
    details: () => [...queryKeys.inbound.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.inbound.details(), id] as const,
  },
  
  // 出库相关
  outbound: {
    all: ['outbound'] as const,
    lists: () => [...queryKeys.outbound.all, 'list'] as const,
    list: (params?: any) => [...queryKeys.outbound.lists(), params] as const,
    details: () => [...queryKeys.outbound.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.outbound.details(), id] as const,
  },
  
  // 报表相关
  reports: {
    all: ['reports'] as const,
    dashboard: () => [...queryKeys.reports.all, 'dashboard'] as const,
  },
};
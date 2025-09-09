import { api } from './api';
import {
  Warehouse,
  CreateWarehouseRequest,
  UpdateWarehouseRequest,
  QueryParams,
  PaginatedResponse,
} from '../types/api';

// 仓库服务
export const warehouseService = {
  // 获取仓库列表
  getWarehouses: async (params?: QueryParams): Promise<PaginatedResponse<Warehouse[]>> => {
    const response = await api.get<Warehouse[]>('/warehouses', { params });
    return response.data;
  },
  
  // 根据ID获取仓库
  getWarehouseById: async (id: string): Promise<Warehouse> => {
    const response = await api.get<Warehouse>(`/warehouses/${id}`);
    return response.data.data;
  },
  
  // 根据编码获取仓库
  getWarehouseByCode: async (code: string): Promise<Warehouse> => {
    const response = await api.get<Warehouse>(`/warehouses/code/${code}`);
    return response.data.data;
  },
  
  // 创建仓库
  createWarehouse: async (data: CreateWarehouseRequest): Promise<Warehouse> => {
    const response = await api.post<Warehouse>('/warehouses', data);
    return response.data.data;
  },
  
  // 更新仓库
  updateWarehouse: async (id: string, data: UpdateWarehouseRequest): Promise<Warehouse> => {
    const response = await api.put<Warehouse>(`/warehouses/${id}`, data);
    return response.data.data;
  },
  
  // 切换仓库状态
  toggleWarehouseStatus: async (id: string): Promise<Warehouse> => {
    const response = await api.patch<Warehouse>(`/warehouses/${id}/toggle-status`);
    return response.data.data;
  },
  
  // 删除仓库
  deleteWarehouse: async (id: string): Promise<void> => {
    await api.delete(`/warehouses/${id}`);
  },
  
  // 获取仓库统计信息
  getWarehouseStats: async (): Promise<{
    total: number;
    active: number;
    inactive: number;
  }> => {
    const response = await api.get('/warehouses/stats');
    return response.data.data;
  },
  
  // 获取所有活跃仓库（用于下拉选择）
  getActiveWarehouses: async (): Promise<Warehouse[]> => {
    const response = await api.get<Warehouse[]>('/warehouses', {
      params: { isActive: true, pageSize: 1000 }
    });
    return response.data.data;
  },
};
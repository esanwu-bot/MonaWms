import { api } from './api';
import type {
  Category,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  QueryParams,
} from '../types/api';

// 分类服务
export const categoryService = {
  // 获取分类列表
  getCategories: async (params?: QueryParams & {
    parentId?: string;
    level?: number;
  }): Promise<any> => {
    const response = await api.get<Category[]>('/categories', { params });
    return response.data;
  },
  
  // 获取分类树结构
  getCategoryTree: async (): Promise<Category[]> => {
    const response = await api.get<Category[]>('/categories/tree');
    return response.data.data;
  },
  
  // 根据ID获取分类
  getCategoryById: async (id: string): Promise<Category> => {
    const response = await api.get<Category>(`/categories/${id}`);
    return response.data.data;
  },
  
  // 根据编码获取分类
  getCategoryByCode: async (code: string): Promise<Category> => {
    const response = await api.get<Category>(`/categories/code/${code}`);
    return response.data.data;
  },
  
  // 创建分类
  createCategory: async (data: CreateCategoryRequest): Promise<Category> => {
    const response = await api.post<Category>('/categories', data);
    return response.data.data;
  },
  
  // 更新分类
  updateCategory: async (id: string, data: UpdateCategoryRequest): Promise<Category> => {
    const response = await api.put<Category>(`/categories/${id}`, data);
    return response.data.data;
  },
  
  // 移动分类
  moveCategory: async (id: string, newParentId?: string): Promise<Category> => {
    const response = await api.patch<Category>(`/categories/${id}/move`, {
      newParentId,
    });
    return response.data.data;
  },
  
  // 删除分类
  deleteCategory: async (id: string): Promise<void> => {
    await api.delete(`/categories/${id}`);
  },
  
  // 获取分类统计信息
  getCategoryStats: async (): Promise<{
    total: number;
    rootCategories: number;
    maxLevel: number;
    productsCount: Record<string, number>;
  }> => {
    const response = await api.get('/categories/stats');
    return response.data.data;
  },
  
  // 获取根分类列表
  getRootCategories: async (): Promise<Category[]> => {
    const response = await api.get<Category[]>('/categories', {
      params: { parentId: null, pageSize: 1000 }
    });
    return response.data.data;
  },
  
  // 获取子分类列表
  getChildCategories: async (parentId: string): Promise<Category[]> => {
    const response = await api.get<Category[]>('/categories', {
      params: { parentId, pageSize: 1000 }
    });
    return response.data.data;
  },
  
  // 检查分类编码是否可用
  checkCodeAvailability: async (code: string, excludeId?: string): Promise<boolean> => {
    const response = await api.get('/categories/check-code', {
      params: { code, excludeId }
    });
    return response.data.data.available;
  },
  
  // 获取分类路径
  getCategoryPath: async (id: string): Promise<Category[]> => {
    const response = await api.get<Category[]>(`/categories/${id}/path`);
    return response.data.data;
  },
};
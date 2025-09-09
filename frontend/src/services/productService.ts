import { api } from './api';
import {
  Product,
  CreateProductRequest,
  UpdateProductRequest,
  QueryParams,
  PaginatedResponse,
} from '../types/api';

// 产品服务
export const productService = {
  // 获取产品列表
  getProducts: async (params?: QueryParams & {
    categoryId?: string;
    warehouseId?: string;
    lowStock?: boolean;
  }): Promise<PaginatedResponse<Product[]>> => {
    const response = await api.get<Product[]>('/products', { params });
    return response.data;
  },
  
  // 根据ID获取产品
  getProductById: async (id: string): Promise<Product> => {
    const response = await api.get<Product>(`/products/${id}`);
    return response.data.data;
  },
  
  // 根据SKU获取产品
  getProductBySku: async (sku: string): Promise<Product> => {
    const response = await api.get<Product>(`/products/sku/${sku}`);
    return response.data.data;
  },
  
  // 根据条形码获取产品
  getProductByBarcode: async (barcode: string): Promise<Product> => {
    const response = await api.get<Product>(`/products/barcode/${barcode}`);
    return response.data.data;
  },
  
  // 创建产品
  createProduct: async (data: CreateProductRequest): Promise<Product> => {
    const response = await api.post<Product>('/products', data);
    return response.data.data;
  },
  
  // 更新产品
  updateProduct: async (id: string, data: UpdateProductRequest): Promise<Product> => {
    const response = await api.put<Product>(`/products/${id}`, data);
    return response.data.data;
  },
  
  // 批量更新产品
  batchUpdateProducts: async (updates: {
    ids: string[];
    data: Partial<UpdateProductRequest>;
  }): Promise<Product[]> => {
    const response = await api.patch<Product[]>('/products/batch', updates);
    return response.data.data;
  },
  
  // 切换产品状态
  toggleProductStatus: async (id: string): Promise<Product> => {
    const response = await api.patch<Product>(`/products/${id}/toggle-status`);
    return response.data.data;
  },
  
  // 删除产品
  deleteProduct: async (id: string): Promise<void> => {
    await api.delete(`/products/${id}`);
  },
  
  // 获取产品统计信息
  getProductStats: async (): Promise<{
    total: number;
    active: number;
    inactive: number;
    lowStock: number;
    categories: number;
  }> => {
    const response = await api.get('/products/stats');
    return response.data.data;
  },
  
  // 获取低库存产品
  getLowStockProducts: async (params?: QueryParams): Promise<PaginatedResponse<Product[]>> => {
    const response = await api.get<Product[]>('/products', {
      params: { ...params, lowStock: true }
    });
    return response.data;
  },
  
  // 检查SKU是否可用
  checkSkuAvailability: async (sku: string, excludeId?: string): Promise<boolean> => {
    const response = await api.get('/products/check-sku', {
      params: { sku, excludeId }
    });
    return response.data.data.available;
  },
  
  // 检查条形码是否可用
  checkBarcodeAvailability: async (barcode: string, excludeId?: string): Promise<boolean> => {
    const response = await api.get('/products/check-barcode', {
      params: { barcode, excludeId }
    });
    return response.data.data.available;
  },
};
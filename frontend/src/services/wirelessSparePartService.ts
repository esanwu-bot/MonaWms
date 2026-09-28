import { apiClient } from '../utils/apiClient';
import axios from 'axios';

export interface WirelessSparePart {
  id: number;
  part_name: string;
  model: string;
  serial_number: string;
  type: string;
  quantity: number;
  operator: string;
  operation_date: string;
  status: string;
  project: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateWirelessSparePartRequest {
  part_name: string;
  model: string;
  serial_number: string;
  type: string;
  quantity: number;
  operator: string;
  operation_date: string;
  status: string;
  project: string;
  notes?: string;
}

export interface UpdateWirelessSparePartRequest extends Partial<CreateWirelessSparePartRequest> {}

export interface WirelessSparePartListParams {
  page?: number;
  limit?: number;
  part_name?: string;
  model?: string;
  serial_number?: string;
  type?: string;
  status?: string;
  project?: string;
  operator?: string;
  start_date?: string;
  end_date?: string;
}

export interface WirelessSparePartListResponse {
  list: WirelessSparePart[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}

// 获取无线备件列表
export const getWirelessSpareParts = async (
  params: WirelessSparePartListParams = {}
): Promise<WirelessSparePartListResponse> => {
  const response = await apiClient.get('/wireless-spare-parts', { params });
  return response.data.data;
};

// 获取无线备件详情
export const getWirelessSparePart = async (id: number): Promise<WirelessSparePart> => {
  const response = await apiClient.get(`/wireless-spare-parts/${id}`);
  return response.data.data;
};

// 创建无线备件记录
export const createWirelessSparePart = async (
  data: CreateWirelessSparePartRequest
): Promise<WirelessSparePart> => {
  const response = await apiClient.post('/wireless-spare-parts', data);
  return response.data.data;
};

// 更新无线备件记录
export const updateWirelessSparePart = async (
  id: number,
  data: UpdateWirelessSparePartRequest
): Promise<WirelessSparePart> => {
  const response = await apiClient.put(`/wireless-spare-parts/${id}`, data);
  return response.data.data;
};

// 删除无线备件记录
export const deleteWirelessSparePart = async (id: number): Promise<void> => {
  await apiClient.delete(`/wireless-spare-parts/${id}`);
};

// 批量导入无线备件记录
export const bulkImportWirelessSpareParts = async (
  data: CreateWirelessSparePartRequest[]
): Promise<{ success_count: number; failure_count: number; failures: any[] }> => {
  const response = await apiClient.post('/wireless-spare-parts/bulk-import', {
    wireless_spare_parts: data,
  });
  return response.data.data;
};

// 导出无线备件记录
export const exportWirelessSpareParts = async (
  params: WirelessSparePartListParams = {}
): Promise<Blob> => {
  // 对于 blob 响应，需要使用原始的 axios 实例
  const response = await axios.get('/wireless-spare-parts/export', {
    params,
    responseType: 'blob',
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
    },
  });
  return response.data;
};

// 获取统计数据
export const getWirelessSparePartStats = async (): Promise<{
  total_count: number;
  inbound_count: number;
  outbound_count: number;
  by_type: { type: string; count: number }[];
  by_project: { project: string; count: number }[];
}> => {
  const response = await apiClient.get('/wireless-spare-parts/stats');
  return response.data.data;
};
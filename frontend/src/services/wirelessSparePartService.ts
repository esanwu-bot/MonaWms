import { api } from './api';
import type {
  WirelessSparePart,
  CreateWirelessSparePartRequest,
  UpdateWirelessSparePartRequest,
  PaginatedResponse,
} from '../types/api';

// 获取无线备件列表
export const getWirelessSpareParts = async (params?: {
  page?: number;
  limit?: number;
  part_name?: string;
  model?: string;
  type?: string;
  status?: string;
}) => {
  const response = await api.get<PaginatedResponse<WirelessSparePart[]>>('/wireless-spare-parts', { params });
  return response.data;
};

// 获取无线备件详情
export const getWirelessSparePart = async (id: string) => {
  const response = await api.get<WirelessSparePart>(`/wireless-spare-parts/${id}`);
  return response.data;
};

// 创建无线备件
export const createWirelessSparePart = async (data: CreateWirelessSparePartRequest) => {
  const response = await api.post<WirelessSparePart>('/wireless-spare-parts', data);
  return response.data;
};

// 更新无线备件
export const updateWirelessSparePart = async (id: string, data: UpdateWirelessSparePartRequest) => {
  const response = await api.put<WirelessSparePart>(`/wireless-spare-parts/${id}`, data);
  return response.data;
};

// 删除无线备件
export const deleteWirelessSparePart = async (id: string) => {
  const response = await api.delete(`/wireless-spare-parts/${id}`);
  return response.data;
};

// 批量删除无线备件
export const batchDeleteWirelessSpareParts = async (ids: string[]) => {
  const response = await api.post('/wireless-spare-parts/batch-delete', { ids });
  return response.data;
};
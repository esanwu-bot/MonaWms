import { api } from './api';
import type {
  SerialNumber,
  CreateSerialNumberRequest,
  UpdateSerialNumberRequest,
  QueryByBarcodeResponse,
  PaginatedResponse,
} from '../types/api';

// 获取序列号列表
export const getSerialNumbers = async (params?: {
  page?: number;
  limit?: number;
  serial_number?: string;
  product_id?: string;
  status?: string;
}) => {
  const response = await api.get<PaginatedResponse<SerialNumber[]>>('/serial-numbers', { params });
  return response.data;
};

// 获取序列号详情
export const getSerialNumber = async (id: string) => {
  const response = await api.get<SerialNumber>(`/serial-numbers/${id}`);
  return response.data;
};

// 创建序列号
export const createSerialNumber = async (data: CreateSerialNumberRequest) => {
  const response = await api.post<SerialNumber>('/serial-numbers', data);
  return response.data;
};

// 更新序列号
export const updateSerialNumber = async (id: string, data: UpdateSerialNumberRequest) => {
  const response = await api.put<SerialNumber>(`/serial-numbers/${id}`, data);
  return response.data;
};

// 删除序列号
export const deleteSerialNumber = async (id: string) => {
  const response = await api.delete(`/serial-numbers/${id}`);
  return response.data;
};

// 通过条码查询设备信息
export const queryByBarcode = async (barcode: string) => {
  const response = await api.get<QueryByBarcodeResponse>('/serial-numbers/query-by-barcode', {
    params: { barcode },
  });
  return response.data;
};

// 批量导入序列号
export const bulkImportSerialNumbers = async (serialNumbers: CreateSerialNumberRequest[]) => {
  const response = await api.post('/serial-numbers/bulk-import', { serial_numbers: serialNumbers });
  return response.data;
};
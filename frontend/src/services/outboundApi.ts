import { api } from './api';
import type { OutboundOrder, OutboundOrderQueryParams } from '../types/api';

// 批量拣货请求参数
export interface BatchPickingRequest {
  order_ids: string[];
}

// 批量拣货结果
export interface BatchPickingResult {
  order_id: string;
  order_number: string;
  success: boolean;
  message: string;
  status?: string;
  status_text?: string;
}

// 批量拣货响应
export interface BatchPickingResponse {
  total: number;
  success_count: number;
  fail_count: number;
  results: BatchPickingResult[];
}

// 出库API服务
export const outboundApi = {
  // 获取出库单列表
  getList: (params?: OutboundOrderQueryParams) => {
    return api.get<OutboundOrder[]>('/outbound-orders', { params });
  },

  // 获取出库单详情
  getDetail: (id: string) => {
    return api.get<OutboundOrder>(`/outbound-orders/${id}`);
  },

  // 创建出库单
  create: (data: any) => {
    return api.post<OutboundOrder>('/outbound-orders', data);
  },

  // 更新出库单
  update: (id: string, data: any) => {
    return api.put<OutboundOrder>(`/outbound-orders/${id}`, data);
  },

  // 删除出库单
  delete: (id: string) => {
    return api.delete(`/outbound-orders/${id}`);
  },

  // 开始拣货
  startPicking: (id: string) => {
    return api.post(`/outbound-orders/${id}/start-picking`);
  },

  // 拣货
  picking: (id: string, data: any) => {
    return api.post(`/outbound-orders/${id}/picking`, data);
  },

  // 完成拣货
  completePicking: (id: string) => {
    return api.post(`/outbound-orders/${id}/complete-picking`);
  },

  // 打包
  packing: (id: string, data: any) => {
    return api.post(`/outbound-orders/${id}/packing`, data);
  },

  // 发货
  shipping: (id: string, data: any) => {
    return api.post(`/outbound-orders/${id}/shipping`, data);
  },

  // 批量拣货
  batchPicking: (data: BatchPickingRequest) => {
    return api.post<BatchPickingResponse>('/outbound-orders/batch-picking', data);
  },

  // 批量完成拣货
  batchCompletePicking: (data: BatchPickingRequest) => {
    return api.post<BatchPickingResponse>('/outbound-orders/batch-complete-picking', data);
  },

  // 获取出库统计
  getStats: (params?: any) => {
    return api.get('/outbound-orders/statistics', { params });
  },
};

export default outboundApi;
import { api } from './api';
import type { OperationLog, OperationLogQueryParams, Pagination } from '../types/api';

interface OperationLogListData {
  list: OperationLog[];
  pagination: Pagination;
}

export const operationLogService = {
  getLogs: async (params: OperationLogQueryParams = {}): Promise<OperationLogListData> => {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.operator_id) query.set('operator_id', String(params.operator_id));
    if (params.action) query.set('action', params.action);
    if (params.target_type) query.set('target_type', params.target_type);
    if (params.target_id) query.set('target_id', String(params.target_id));
    if (params.start_time) query.set('start_time', params.start_time);
    if (params.end_time) query.set('end_time', params.end_time);

    const url = `/logs?${query.toString()}`;
    const response = await api.get<OperationLogListData>(url);
    return response.data.data;
  },

  getLogDetail: async (id: number): Promise<OperationLog> => {
    const response = await api.get<OperationLog>(`/logs/${id}`);
    return response.data.data;
  },
};

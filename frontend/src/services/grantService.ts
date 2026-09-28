import { api } from './api';
import type {
  ApiResponse,
  GrantMatrix,
  WarehouseGrant,
  Warehouse,
} from '../types/api';

interface GrantPayload {
  user_id: number;
  warehouse_id: number;
  grant_role: 'manager' | 'operator';
  remark?: string;
}

interface RevokePayload {
  user_id: number;
  warehouse_id: number;
  remark?: string;
}

interface ChangeRolePayload {
  user_id: number;
  warehouse_id: number;
  grant_role: 'manager' | 'operator';
}

export const grantService = {
  // 获取当前账号被授权的仓库列表（供仓库切换器）
  getUserGrants: async (userId: number): Promise<Warehouse[]> => {
    const response = await api.get<WarehouseGrant[]>(`/grants/user/${userId}`);
    return (response.data.data || []).map((g) => ({
      id: g.warehouse_id,
      code: g.warehouse_code || String(g.warehouse_id),
      name: g.warehouse_name || `仓库 ${g.warehouse_id}`,
      description: '',
      status: g.status === 'active' ? 'active' : 'inactive',
      status_text: g.status === 'active' ? '启用' : '禁用',
      created_at: g.granted_at || '',
      grant_role: g.grant_role,
    }));
  },

  // 授权矩阵
  getMatrix: async (): Promise<GrantMatrix> => {
    const response = await api.get<GrantMatrix>('/grants/matrix');
    return response.data.data;
  },

  // 某仓库的已授权账号
  getWarehouseGrants: async (warehouseId: number): Promise<WarehouseGrant[]> => {
    const response = await api.get<WarehouseGrant[]>(`/grants/warehouse/${warehouseId}`);
    return response.data.data || [];
  },

  grant: async (payload: GrantPayload): Promise<unknown> => {
    const response = await api.post<unknown>('/grants/grant', payload);
    return response.data.data;
  },

  revoke: async (payload: RevokePayload): Promise<unknown> => {
    const response = await api.post<unknown>('/grants/revoke', payload);
    return response.data.data;
  },

  changeRole: async (payload: ChangeRolePayload): Promise<unknown> => {
    const response = await api.post<unknown>('/grants/change-role', payload);
    return response.data.data;
  },
};

import { http, unwrap } from './client';

import type {
  GrantedWarehouse,
  GrantMatrix,
  GrantRole,
  GrantStatus,
} from '../types/grant';

/** 某账号被授权的仓库列表（仓库切换器数据源） */
export function fetchMyWarehouses(userId: number) {
  return unwrap<GrantedWarehouse[]>(http.get(`/grants/user/${userId}`));
}

/** 授权矩阵：行=账号，列=仓库 */
export function fetchGrantMatrix(vendorId?: number) {
  return unwrap<GrantMatrix>(
    http.get('/grants/matrix', { params: vendorId ? { vendor_id: vendorId } : {} }),
  );
}

export interface GrantPayload {
  user_id: number;
  warehouse_id: number;
  grant_role: GrantRole;
  remark?: string;
}

/** 授予 / 重新授予（幂等） */
export function grantWarehouse(payload: GrantPayload) {
  return unwrap(http.post('/grants/grant', payload));
}

/** 撤销授权 */
export function revokeWarehouse(user_id: number, warehouse_id: number, remark?: string) {
  return unwrap(http.post('/grants/revoke', { user_id, warehouse_id, remark }));
}

/** 修改仓库级角色 */
export function changeGrantRole(
  user_id: number,
  warehouse_id: number,
  grant_role: GrantRole,
) {
  return unwrap(http.post('/grants/change-role', { user_id, warehouse_id, grant_role }));
}

export interface BatchPayload {
  user_ids: number[];
  warehouse_ids: number[];
  grant_role: GrantRole;
  vendor_id?: number | null;
  remark?: string;
}

/** 批量授权（新增代维方时一次配好） */
export function batchGrant(payload: BatchPayload) {
  return unwrap<{ count: number }>(http.post('/grants/batch', payload));
}

/** 按代维方批量撤销（更换代维方时一次性收回） */
export function revokeByVendor(vendor_id: number, remark?: string) {
  return unwrap<{ count: number }>(http.post('/grants/revoke-vendor', { vendor_id, remark }));
}

/** 某仓库的已授权账号列表 */
export function fetchWarehouseGrants(warehouseId: number) {
  return unwrap<
    {
      id: number;
      user_id: number;
      username: string;
      global_role: string;
      grant_role: GrantRole;
      status: GrantStatus;
      granted_at: string;
      remark: string | null;
    }[]
  >(http.get(`/grants/warehouse/${warehouseId}`));
}

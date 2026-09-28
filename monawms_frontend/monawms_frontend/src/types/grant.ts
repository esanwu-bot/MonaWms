/**
 * 权限与授权相关类型
 * 与后端 config/permission.php 保持一致
 */

/** 全局角色：admin 管理员 / operator 录入员 */
export type GlobalRole = 'admin' | 'operator';

/** 仓库级授权角色：manager 仓库管理员（可审核过账）/ operator 录入员（仅录入） */
export type GrantRole = 'manager' | 'operator';

export type GrantStatus = 'active' | 'revoked';

/** 仓库级动作，与后端 config/permission.php warehouse_actions 对应 */
export type WarehouseAction =
  | 'inbound:write'
  | 'outbound:write'
  | 'stocktake:write'
  | 'inventory:read'
  | 'report:export'
  | 'inbound:post'
  | 'outbound:post'
  | 'stocktake:post'
  | 'inventory:adjust'
  | 'inventory:transfer'
  | 'doc:reverse'
  | 'location:write_scoped';

/** 系统级动作，与后端 system_actions 对应（仅全局 admin） */
export type SystemAction =
  | 'user:manage'
  | 'grant:manage'
  | 'warehouse:write'
  | 'zone:write'
  | 'location:write'
  | 'product:write'
  | 'category:write'
  | 'supplier:write'
  | 'customer:write'
  | 'report:global';

export type Action = WarehouseAction | SystemAction;

/** 当前登录用户 */
export interface AuthUser {
  id: number;
  username: string;
  role: GlobalRole;
  vendorId?: number | null;
  vendorName?: string | null;
}

/** 已授权的单个仓库 */
export interface GrantedWarehouse {
  id: number;
  warehouseId: number;
  warehouseCode: string;
  warehouseName: string;
  grantRole: GrantRole;
  status: GrantStatus;
  grantedAt: string;
}

/** 授权矩阵列定义 */
export interface MatrixWarehouse {
  id: number;
  code: string;
  name: string;
}

/** 授权矩阵单元格 */
export interface MatrixCell {
  warehouseId: number;
  grantRole: GrantRole | null; // null = 未授权
}

/** 授权矩阵行 */
export interface MatrixRow {
  userId: number;
  username: string;
  globalRole: GlobalRole;
  vendorId: number | null;
  cells: MatrixCell[];
}

export interface GrantMatrix {
  warehouses: MatrixWarehouse[];
  rows: MatrixRow[];
}

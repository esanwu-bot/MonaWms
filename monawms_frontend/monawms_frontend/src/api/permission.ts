/**
 * 权限常量 —— 与后端 config/permission.php 一一对应
 *
 * 注意：前端这份只用于「按钮显隐 / 菜单渲染」的体验优化，
 * 真正的权限判定永远在后端。前端隐藏不构成任何安全保证。
 */

/** 系统级动作：仅全局 admin，不受仓库授权约束 */
export const SYSTEM_ACTIONS = [
  'user:manage',
  'grant:manage',
  'warehouse:write',
  'zone:write',
  'location:write',
  'product:write',
  'category:write',
  'supplier:write',
  'customer:write',
  'report:global',
] as const;

/**
 * 仓库级动作 => 允许的 grant_role
 * 未登记的动作一律视为无权限（与后端「配置漏项 = 拒绝」保持一致）
 */
export const WAREHOUSE_ACTIONS: Record<string, ('manager' | 'operator')[]> = {
  // 录入类
  'inbound:write': ['manager', 'operator'],
  'outbound:write': ['manager', 'operator'],
  'stocktake:write': ['manager', 'operator'],
  'inventory:read': ['manager', 'operator'],
  'report:export': ['manager', 'operator'],
  // 审核类
  'inbound:post': ['manager'],
  'outbound:post': ['manager'],
  'stocktake:post': ['manager'],
  'inventory:adjust': ['manager'],
  'inventory:transfer': ['manager'],
  'doc:reverse': ['manager'],
  'location:write_scoped': ['manager'],
};

/** 单据状态机允许推进的角色 */
export const DOC_STATUS_FLOW: Record<'operator' | 'manager', string[]> = {
  operator: ['draft', 'confirmed'],
  manager: ['draft', 'confirmed', 'posted'],
};

export const ROLE_LABEL: Record<string, string> = {
  admin: '管理员',
  operator: '录入员',
  manager: '仓库管理员',
};

export const STATUS_LABEL: Record<string, string> = {
  active: '已授权',
  revoked: '已撤销',
};

/**
 * 仓库授权判定
 *
 * 公式（与后端一致）：有效权限 = 全局角色 ∩ 仓库授权
 * 只用于前端按钮/菜单显隐，后端仍会再校验一次。
 */

import type { AuthUser, GrantRole, WarehouseAction, SystemAction } from '../types/grant';
import { SYSTEM_ACTIONS, WAREHOUSE_ACTIONS } from '../api/permission';

interface CanParams {
  user: AuthUser | null;
  /** 当前仓库的授权角色，未授权为 null */
  grantRole: GrantRole | null;
  /** 是否有仓库上下文（仓库级动作必传） */
  hasWarehouse: boolean;
}

export function can(
  action: WarehouseAction | SystemAction,
  { user, grantRole, hasWarehouse }: CanParams,
): boolean {
  if (!user) return false;

  // 1) 系统级动作：仅全局 admin，与仓库授权无关
  //    保证「全局 operator 被授予仓库 manager 后仍不能做用户管理/授权管理」
  if ((SYSTEM_ACTIONS as readonly string[]).includes(action)) {
    return user.role === 'admin';
  }

  // 2) 仓库级动作必须有仓库上下文与授权
  if (!hasWarehouse || !grantRole) return false;

  const allowed = WAREHOUSE_ACTIONS[action];
  if (!allowed) return false; // 未登记的动作一律拒绝

  return allowed.includes(grantRole);
}

/** 是否已授权当前仓库 */
export function hasWarehouseGrant(grantRole: GrantRole | null): boolean {
  return grantRole !== null;
}

/** 按钮不可用时的提示文案 */
export function denyReason(action: string, grantRole: GrantRole | null): string {
  if (!grantRole) return '未授权该仓库';
  const allowed = WAREHOUSE_ACTIONS[action];
  if (allowed && !allowed.includes(grantRole)) return '需仓库管理员操作';
  return '权限不足';
}

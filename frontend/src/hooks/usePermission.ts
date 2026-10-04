import { useMemo } from 'react';
import { useAuthStore } from '../store/authStore';
import { useWarehouseStore } from '../store/warehouseStore';
import type { GrantRole } from '../types/api';

const SYSTEM_ACTIONS = new Set([
  'product:manage',
  'category:manage',
  'warehouse:manage',
  'location:manage',
  'supplier:manage',
  'customer:manage',
  'user:manage',
  'grant:manage',
  'form:manage',
]);

function normalize(role?: string): string {
  return (role || '').toLowerCase();
}

export function usePermission() {
  const user = useAuthStore((state) => state.user);
  const currentWarehouse = useWarehouseStore((state) => state.currentWarehouse);

  const globalRole = normalize(user?.role);
  const grantRole = normalize(currentWarehouse?.grant_role);

  const can = useMemo(() => {
    return (action: string): boolean => {
      if (!action) return true;

      // 系统级管理动作仅 admin 可用
      if (SYSTEM_ACTIONS.has(action)) {
        return globalRole === 'admin';
      }

      // 操作日志任何登录用户可看
      if (action === 'operation_log:view') {
        return true;
      }

      // 仓库级动作必须已选择仓库且拥有授权
      if (!currentWarehouse || !grantRole) {
        return false;
      }

      if (action.endsWith(':post') || action.endsWith(':adjust') || action.endsWith(':transfer')) {
        return grantRole === 'manager';
      }

      if (
        action.endsWith(':write') ||
        action.endsWith(':view') ||
        action.endsWith(':export')
      ) {
        return grantRole === 'manager' || grantRole === 'operator';
      }

      return false;
    };
  }, [globalRole, grantRole, currentWarehouse]);

  return { can, globalRole, grantRole: currentWarehouse?.grant_role as GrantRole | undefined, currentWarehouse };
}

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Alert, Result, Button } from 'antd';

import { useAuthStore } from '../stores/auth';
import { useWarehouseStore } from '../stores/warehouse';
import type { SystemAction, WarehouseAction } from '../types/grant';
import { can } from '../hooks/usePermission';

interface Props {
  /** 访问该路由所需的动作权限，不传表示只需登录 */
  action?: WarehouseAction | SystemAction;
  /** 是否要求已进入某个仓库（需要仓库上下文的页面） */
  requireWarehouse?: boolean;
}

/**
 * 路由级权限守卫
 *
 * 与 <Permission> 组件的区别：
 * - Permission 控按钮显隐（页面内）
 * - PermissionRoute 控整页访问（路由级）
 *
 * 两者都只是体验层，后端 WarehouseScope + Service 才是真正的闸门。
 */
export default function PermissionRoute({ action, requireWarehouse = false }: Props) {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const list = useWarehouseStore((s) => s.list);
  const currentId = useWarehouseStore((s) => s.currentId);

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const grantRole = list.find((w) => w.warehouseId === currentId)?.grantRole ?? null;

  if (requireWarehouse && !currentId) {
    return (
      <Alert
        type="warning"
        showIcon
        message="请先在顶部选择一个仓库"
        description={
          list.length === 0
            ? '你的账号尚未被授权任何仓库，请联系系统管理员授权。'
            : '切换仓库后才能查看该仓库的数据。'
        }
        style={{ margin: 24 }}
      />
    );
  }

  if (action && !can(action, { user, grantRole, hasWarehouse: !!currentId })) {
    return (
      <Result
        status="403"
        title="403"
        subTitle={
          grantRole === null
            ? '你没有被授权访问该仓库，请联系管理员授权'
            : '当前角色没有访问该页面的权限'
        }
        extra={
          <Button type="primary" onClick={() => history.back()}>
            返回
          </Button>
        }
      />
    );
  }

  return <Outlet />;
}

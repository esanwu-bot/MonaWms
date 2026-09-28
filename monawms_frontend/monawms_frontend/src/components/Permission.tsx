import React from 'react';
import { Tooltip } from 'antd';

import { useAuthStore } from '../stores/auth';
import { useWarehouseStore } from '../stores/warehouse';
import { can, denyReason } from '../hooks/usePermission';
import type { SystemAction, WarehouseAction } from '../types/grant';

interface Props {
  action: WarehouseAction | SystemAction;
  children: React.ReactElement;
  /** 无权限时：hide=隐藏（默认），disable=置灰并提示 */
  mode?: 'hide' | 'disable';
  /** 自定义提示文案 */
  tip?: string;
}

/**
 * 权限包裹组件
 *
 * 用法：
 *   <Permission action="inbound:post" mode="disable">
 *     <Button type="primary">过账</Button>
 *   </Permission>
 *
 * 注意：这只是体验优化。后端 WarehouseScope 中间件 + Service 层会再校验一次，
 * 绕过前端直连接口照样被 403 拦下。
 */
export const Permission: React.FC<Props> = ({ action, children, mode = 'hide', tip }) => {
  const user = useAuthStore((s) => s.user);
  const list = useWarehouseStore((s) => s.list);
  const currentId = useWarehouseStore((s) => s.currentId);

  const grantRole = list.find((w) => w.warehouseId === currentId)?.grantRole ?? null;
  const allowed = can(action, { user, grantRole, hasWarehouse: !!currentId });

  if (allowed) return children;

  if (mode === 'hide') return null;

  const reason = tip ?? denyReason(action, grantRole);

  return (
    <Tooltip title={reason}>
      <span style={{ display: 'inline-block', cursor: 'not-allowed' }}>
        {React.cloneElement(children, {
          disabled: true,
          style: { ...(children.props.style ?? {}), pointerEvents: 'none' },
        })}
      </span>
    </Tooltip>
  );
};

import React from 'react';
import { usePermission } from '../hooks/usePermission';

interface PermissionProps {
  action: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const Permission: React.FC<PermissionProps> = ({ action, fallback = null, children }) => {
  const { can } = usePermission();
  return can(action) ? <>{children}</> : <>{fallback}</>;
};

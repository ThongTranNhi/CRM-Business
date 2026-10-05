import { Navigate, Outlet } from 'react-router-dom';
import { useCan } from '../hooks/useCan';
import type { Permission } from '../permissions';

interface RequireAccessProps {
  permission: Permission;
}

/** Vào thẳng URL không có quyền → trang 403 (frontend-spec 1.2). Backend vẫn chặn lại. */
export function RequireAccess({ permission }: RequireAccessProps) {
  const canDo = useCan();
  return canDo(permission) ? <Outlet /> : <Navigate to="/app/403" replace />;
}

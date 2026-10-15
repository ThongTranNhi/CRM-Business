import { Navigate, Outlet } from 'react-router-dom';
import { Skeleton } from '@/components/ui';
import { useCan } from '../hooks/useCan';
import { useCurrentUser } from '../hooks/useCurrentUser';
import type { Permission } from '../permissions';

interface RequireAccessProps {
  permission: Permission;
}

/**
 * Vào thẳng URL không có quyền → trang 403 (frontend-spec 1.2). Backend vẫn chặn lại.
 * Chỉ chờ khi chưa biết người dùng (F5, mở link chia sẻ); lần tải lại sau đó giữ nguyên trang.
 */
export function RequireAccess({ permission }: RequireAccessProps) {
  const canDo = useCan();
  const { data: user } = useCurrentUser();
  if (!user) return <Skeleton className="h-64 w-full" />;
  return canDo(permission) ? <Outlet /> : <Navigate to="/app/403" replace />;
}

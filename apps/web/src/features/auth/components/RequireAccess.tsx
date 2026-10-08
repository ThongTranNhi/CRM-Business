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
 * Chờ biết người dùng (F5, mở link chia sẻ) rồi mới quyết định — trước đó chưa có role để kiểm tra.
 */
export function RequireAccess({ permission }: RequireAccessProps) {
  const canDo = useCan();
  const { isPending } = useCurrentUser();
  if (isPending) return <Skeleton className="h-64 w-full" />;
  return canDo(permission) ? <Outlet /> : <Navigate to="/app/403" replace />;
}

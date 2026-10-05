import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSession } from '../hooks/useSession';
import { useAccountState } from '../hooks/useAccountState';
import { Button } from '@/components/ui';
import { signOut } from '../api/auth.api';

export function ProtectedRoute() {
  const { session, loading } = useSession();
  const location = useLocation();
  const account = useAccountState();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-500" />
      </div>
    );
  }
  if (!session) return <Navigate to="/auth/login" replace state={{ from: location.pathname }} />;
  if (account.isPending) return <p className="p-6">Đang kiểm tra tài khoản...</p>;
  if (account.isError) return (
    <div className="space-y-3 p-6">
      <p role="alert">{account.error.message}</p>
      <Button onClick={() => void account.refetch()}>Thử lại</Button>
      <Button variant="secondary" onClick={() => void signOut()}>Đăng xuất</Button>
    </div>
  );
  if (account.data.mustChangePassword && location.pathname !== '/app/change-password') {
    return <Navigate to="/app/change-password" replace />;
  }
  return <Outlet />;
}

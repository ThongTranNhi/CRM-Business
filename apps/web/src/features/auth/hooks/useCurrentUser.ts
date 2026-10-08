import { useQuery } from '@tanstack/react-query';
import { getCurrentUser } from '../api/auth.api';
import { useSession } from './useSession';

/**
 * Người đang đăng nhập (GET /api/auth/me): role, tên, phòng ban, cờ bắt đổi mật khẩu.
 * Key chỉ theo user id: token tự gia hạn không được làm đổi key, nếu không mọi trang chặn theo
 * quyền sẽ về trạng thái đang tải và mount lại (mất dữ liệu đang nhập). Đổi mật khẩu thì invalidate.
 */
export function useCurrentUser() {
  const { session } = useSession();
  return useQuery({
    queryKey: ['account-state', session?.user.id],
    queryFn: getCurrentUser,
    enabled: Boolean(session),
    staleTime: 0,
    refetchInterval: 30_000,
    retry: false,
  });
}

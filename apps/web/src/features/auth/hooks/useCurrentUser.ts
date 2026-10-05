import { useQuery } from '@tanstack/react-query';
import { getCurrentUser } from '../api/auth.api';
import { useSession } from './useSession';

/** Người đang đăng nhập (GET /api/auth/me): role, tên, phòng ban, cờ bắt đổi mật khẩu. */
export function useCurrentUser() {
  const { session } = useSession();
  return useQuery({
    queryKey: ['account-state', session?.user.id, session?.access_token],
    queryFn: getCurrentUser,
    enabled: Boolean(session),
    staleTime: 0,
    refetchInterval: 30_000,
    retry: false,
  });
}

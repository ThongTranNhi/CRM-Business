import type { QueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/** `undefined` = chưa biết phiên đầu tiên; `null` = đã đăng xuất. */
export function isUserChanged(previous: string | null | undefined, next: string | null): boolean {
  return previous !== undefined && previous !== next;
}

/**
 * Xoá toàn bộ cache React Query khi đăng xuất hoặc đổi sang tài khoản khác trong cùng tab, để không
 * hiện dữ liệu của người trước (thông báo, việc của tôi…). Token tự gia hạn giữ nguyên user id → không xoá.
 */
export function useClearCacheOnUserChange(queryClient: QueryClient): void {
  useEffect(() => {
    let userId: string | null | undefined;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUserId = session?.user.id ?? null;
      if (isUserChanged(userId, nextUserId)) queryClient.clear();
      userId = nextUserId;
    });
    return () => data.subscription.unsubscribe();
  }, [queryClient]);
}

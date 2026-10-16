import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({ supabase: {} }));

const { isUserChanged } = await import('./useClearCacheOnUserChange');

describe('isUserChanged', () => {
  it('không xoá khi nhận phiên đầu tiên', () => {
    expect(isUserChanged(undefined, 'a')).toBe(false);
    expect(isUserChanged(undefined, null)).toBe(false);
  });

  it('không xoá khi token gia hạn cùng người', () => {
    expect(isUserChanged('a', 'a')).toBe(false);
  });

  it('xoá khi đăng xuất', () => {
    expect(isUserChanged('a', null)).toBe(true);
  });

  it('xoá khi đổi sang tài khoản khác', () => {
    expect(isUserChanged('a', 'b')).toBe(true);
    expect(isUserChanged(null, 'b')).toBe(true);
  });
});

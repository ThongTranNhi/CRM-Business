import { supabase } from '@/lib/supabase';
import { apiRequest } from '@/lib/api-client';
import type { AccountState } from '../types';

async function publicAuthRequest<T>(path: string, username: string, password: string): Promise<T> {
  const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: username.trim().toLowerCase(), password }),
  });
  const body = await response.json() as { data: T; error?: { message: string } };
  if (!response.ok) throw new Error(body.error?.message ?? 'Không thể xử lý tài khoản');
  return body.data;
}

export async function registerAccount(username: string, password: string) {
  await publicAuthRequest('register', username, password);
  try { await signInWithPassword(username, password); }
  catch { throw new Error('Tài khoản đã được tạo nhưng chưa đăng nhập được. Quay về trang đăng nhập để thử lại.'); }
}

export async function signInWithGoogle(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
      queryParams: { prompt: 'select_account' },
    },
  });
  if (error) throw error;
}

export async function signInWithPassword(username: string, password: string): Promise<void> {
  const tokens = await publicAuthRequest<{ access_token: string; refresh_token: string }>('login', username, password);
  const { error } = await supabase.auth.setSession(tokens);
  if (error) throw error;
}

export const getAccountState = () => apiRequest<AccountState>('/api/auth/me');
export async function changePassword(username: string, currentPassword: string, password: string) {
  const tokens = await apiRequest<{ access_token: string; refresh_token: string }>('/api/auth/change-password', {
    method: 'POST', body: JSON.stringify({ username, currentPassword, password }),
  });
  const { error } = await supabase.auth.setSession(tokens);
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

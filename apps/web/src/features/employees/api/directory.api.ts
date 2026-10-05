import { supabase } from '@/lib/supabase';
import { apiRequest } from '@/lib/api-client';
import type { AdminEmployeeUpdate, DirectoryEmployee, DirectoryPage } from '../types';

export async function listEmployees(page: number): Promise<DirectoryPage> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error('Bạn cần đăng nhập');
  const response = await fetch(`${import.meta.env.VITE_API_URL}/api/users/employees?page=${page}`, {
    headers: { Authorization: `Bearer ${data.session.access_token}` },
  });
  const result = (await response.json()) as DirectoryPage & { error?: { message: string } };
  if (!response.ok) throw new Error(result.error?.message ?? 'Không tải được danh sách');
  return result;
}
export const getEmployee = (id: string) =>
  apiRequest<DirectoryEmployee>(`/api/users/employees/${id}`);
export const getDepartments = () =>
  apiRequest<{ id: string; name: string }[]>('/api/users/employees/department-options');
export const saveEmployee = (id: string, data: AdminEmployeeUpdate) =>
  apiRequest<DirectoryEmployee>(`/api/users/employees/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
export const resetPassword = (id: string, password: string) =>
  apiRequest(`/api/users/employees/${id}/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ password }),
  });

import { apiPage, apiRequest, withQuery } from '@/lib/api-client';
import type {
  AdminEmployeeUpdate,
  DirectoryEmployee,
  DirectoryParams,
  EmployeeOption,
} from '../types';

const BASE = '/api/users/employees';
export const EMPLOYEE_PAGE_SIZE = 25;

export const listEmployees = ({ status, q, page }: DirectoryParams) =>
  apiPage<DirectoryEmployee>(withQuery(BASE, { status, q, page, pageSize: EMPLOYEE_PAGE_SIZE }));

export const getEmployee = (id: string) => apiRequest<DirectoryEmployee>(`${BASE}/${id}`);

export const getDepartments = () =>
  apiRequest<{ id: string; name: string }[]>(`${BASE}/department-options`);

export const listEmployeeOptions = (q: string) =>
  apiRequest<EmployeeOption[]>(withQuery(`${BASE}/options`, { q }));

export const saveEmployee = (id: string, data: AdminEmployeeUpdate) =>
  apiRequest<DirectoryEmployee>(`${BASE}/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

export const resetPassword = (id: string, password: string) =>
  apiRequest(`${BASE}/${id}/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ password }),
  });

export const deleteEmployee = (id: string, newManagerId: string | null) =>
  apiRequest<{ deleted: true }>(`${BASE}/${id}`, {
    method: 'DELETE',
    body: JSON.stringify({ newManagerId }),
  });

export const restoreEmployee = (id: string) =>
  apiRequest<DirectoryEmployee>(`${BASE}/${id}/restore`, { method: 'POST' });

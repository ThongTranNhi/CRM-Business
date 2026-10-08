import { apiPage, apiRequest, withQuery } from '@/lib/api-client';
import type {
  AdminEmployeeUpdate,
  DeleteEmployeeInput,
  DeleteEmployeeResult,
  DirectoryEmployee,
  DirectoryParams,
  EmployeeDetail,
  EmployeeOption,
} from '../types';

const BASE = '/api/users/employees';
export const EMPLOYEE_PAGE_SIZE = 25;

export const listEmployees = ({ status, q, page }: DirectoryParams) =>
  apiPage<DirectoryEmployee>(withQuery(BASE, { status, q, page, pageSize: EMPLOYEE_PAGE_SIZE }));

export const getEmployee = (id: string) => apiRequest<EmployeeDetail>(`${BASE}/${id}`);

export const getDepartments = () =>
  apiRequest<{ id: string; name: string }[]>(`${BASE}/department-options`);

export const listEmployeeOptions = (q: string, departmentId?: string) =>
  apiRequest<EmployeeOption[]>(withQuery(`${BASE}/options`, { q, departmentId }));

export const saveEmployee = (id: string, data: AdminEmployeeUpdate) =>
  apiRequest<EmployeeDetail>(`${BASE}/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

export const resetPassword = (id: string, password: string) =>
  apiRequest(`${BASE}/${id}/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ password }),
  });

export const deleteEmployee = (id: string, input: DeleteEmployeeInput) =>
  apiRequest<DeleteEmployeeResult>(`${BASE}/${id}`, {
    method: 'DELETE',
    body: JSON.stringify(input),
  });

export const restoreEmployee = (id: string) =>
  apiRequest<EmployeeDetail>(`${BASE}/${id}/restore`, { method: 'POST' });

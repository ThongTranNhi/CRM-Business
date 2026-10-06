import { apiPage, apiRequest, withQuery } from '@/lib/api-client';
import type {
  Department,
  DepartmentChanges,
  DepartmentDetail,
  DepartmentListParams,
  MoveMemberInput,
} from '../types';

const BASE = '/api/departments';
export const DEPARTMENT_PAGE_SIZE = 20;

export const listDepartments = ({ status, q, page }: DepartmentListParams) =>
  apiPage<Department>(withQuery(BASE, { status, q, page, pageSize: DEPARTMENT_PAGE_SIZE }));

/** Ô chọn phòng ban (phòng nhận, chuyển phòng): phòng chưa xoá. */
export const listDepartmentOptions = async () =>
  (await apiPage<Department>(withQuery(BASE, { pageSize: 100 }))).data;

/** Phòng chưa có Dashboard (API trả đủ, không phân trang): modal Tạo Dashboard, ghi chú ở Workspace. */
export const listDepartmentsWithoutDashboard = async () =>
  (await apiPage<Department>(withQuery(BASE, { withoutDashboard: 'true' }))).data;

export const getDepartment = (id: string) => apiRequest<DepartmentDetail>(`${BASE}/${id}`);

export const createDepartment = (input: { name: string; managerId: string | null }) =>
  apiRequest<DepartmentDetail>(BASE, { method: 'POST', body: JSON.stringify(input) });

export const updateDepartment = (id: string, changes: DepartmentChanges) =>
  apiRequest<DepartmentDetail>(`${BASE}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(changes),
  });

/** Dùng cho [Thêm thành viên] và [Chuyển phòng]: đưa nhân viên vào phòng `departmentId`. */
export const addMember = (departmentId: string, input: MoveMemberInput) =>
  apiRequest<DepartmentDetail>(`${BASE}/${departmentId}/members`, {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const deleteDepartment = (id: string, receivingDepartmentId: string | null) =>
  apiRequest<{ movedEmployees: number }>(`${BASE}/${id}`, {
    method: 'DELETE',
    body: JSON.stringify({ receivingDepartmentId }),
  });

export const restoreDepartment = (id: string) =>
  apiRequest<DepartmentDetail>(`${BASE}/${id}/restore`, { method: 'POST' });

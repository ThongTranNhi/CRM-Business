import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getDepartment, listDepartmentOptions, listDepartments } from '../api/departments.api';
import type { DepartmentListParams } from '../types';

// Danh sách phòng ban ít thay đổi (frontend-rules: staleTime vài phút); ghi xong thì invalidate.
const STALE_MS = 3 * 60_000;

const departmentKeys = {
  list: (params: DepartmentListParams) => ['departments', 'list', params] as const,
  detail: (id: string) => ['departments', 'detail', id] as const,
  options: ['departments', 'options'] as const,
};

export function useDepartments(params: DepartmentListParams) {
  return useQuery({
    queryKey: departmentKeys.list(params),
    queryFn: () => listDepartments(params),
    placeholderData: keepPreviousData,
    staleTime: STALE_MS,
  });
}

export function useDepartment(id: string) {
  return useQuery({
    queryKey: departmentKeys.detail(id),
    queryFn: () => getDepartment(id),
    staleTime: STALE_MS,
  });
}

export function useDepartmentOptions() {
  return useQuery({
    queryKey: departmentKeys.options,
    queryFn: listDepartmentOptions,
    staleTime: STALE_MS,
  });
}

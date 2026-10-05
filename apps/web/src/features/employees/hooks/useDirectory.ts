import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  getDepartments,
  getEmployee,
  listEmployeeOptions,
  listEmployees,
} from '../api/directory.api';
import type { DirectoryParams } from '../types';

export function useDirectory(params: DirectoryParams) {
  return useQuery({
    queryKey: ['employee-directory', params],
    queryFn: () => listEmployees(params),
    placeholderData: keepPreviousData,
  });
}

export function useEmployeeDetail(id: string) {
  const employee = useQuery({
    queryKey: ['employee-detail', id],
    queryFn: () => getEmployee(id),
  });
  const departments = useQuery({
    queryKey: ['department-options'],
    queryFn: getDepartments,
  });
  return { employee, departments };
}

/** Ô chọn người: tìm phía server theo tên / mã / username. */
export function useEmployeeOptions(q: string, enabled: boolean) {
  return useQuery({
    queryKey: ['employee-options', q],
    queryFn: () => listEmployeeOptions(q),
    placeholderData: keepPreviousData,
    enabled,
  });
}

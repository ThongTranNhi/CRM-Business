import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/features/auth';
import { getDepartments, getEmployee, listEmployees } from '../api/directory.api';

export function useDirectory(page: number, enabled: boolean) {
  const { session } = useSession();
  return useQuery({
    queryKey: ['employee-directory', session?.user.id, page],
    queryFn: () => listEmployees(page),
    enabled,
  });
}
export function useEmployeeDetail(id: string, enabled: boolean) {
  const { session } = useSession();
  const employee = useQuery({
    queryKey: ['employee-detail', session?.user.id, id],
    queryFn: () => getEmployee(id),
    enabled,
  });
  const departments = useQuery({
    queryKey: ['department-options', session?.user.id],
    queryFn: getDepartments,
    enabled,
  });
  return { employee, departments };
}

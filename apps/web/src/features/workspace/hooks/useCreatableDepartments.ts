import { useCan } from '@/features/auth';
import { useDepartmentsWithoutDashboard } from '@/features/departments';
import type { DepartmentOption } from '../types';

/**
 * Phòng chưa có Dashboard mà người dùng được tạo (Trưởng phòng chỉ thấy phòng mình — BR-05).
 * `created`: phòng vừa tạo trong modal, luôn có trong danh sách kể cả khi danh sách chưa tải lại.
 */
export function useCreatableDepartments(created: DepartmentOption | null) {
  const query = useDepartmentsWithoutDashboard();
  const canDo = useCan();
  const options: DepartmentOption[] = (query.data ?? [])
    .filter((department) => canDo('dashboards.create', { departmentId: department.id }))
    .map((department) => ({
      id: department.id,
      name: department.name,
      isNew: department.id === created?.id,
    }));
  if (created && !options.some((option) => option.id === created.id)) options.push(created);
  return { ...query, options };
}

import { useMutation } from '@tanstack/react-query';
import { useInvalidateQueries } from '@/lib/use-invalidate-queries';
import {
  archiveProject,
  createProject,
  restoreProject,
  setProjectMembers,
  updateProject,
} from '../api/projects.api';
import type { ProjectInput } from '../types';
import { projectKeys } from './project-keys';

// Đổi dự án làm đổi danh sách dự án, trang chi tiết, và ô "Dự án" / tên dự án trên board.
const AFFECTED_KEYS = [projectKeys.all, ['department-dashboards'], ['tasks']];

export function useCreateProject() {
  const invalidate = useInvalidateQueries(AFFECTED_KEYS);
  return useMutation({ mutationFn: createProject, onSuccess: invalidate });
}

export function useUpdateProject(id: string) {
  const invalidate = useInvalidateQueries(AFFECTED_KEYS);
  return useMutation({
    mutationFn: (changes: Partial<ProjectInput>) => updateProject(id, changes),
    onSuccess: invalidate,
  });
}

export function useSetProjectMembers(id: string) {
  const invalidate = useInvalidateQueries(AFFECTED_KEYS);
  return useMutation({
    mutationFn: (employeeIds: string[]) => setProjectMembers(id, employeeIds),
    onSuccess: invalidate,
  });
}

/** Lưu trữ / khôi phục (Super Admin, Trưởng phòng của phòng). */
export function useArchiveProject(id: string) {
  const invalidate = useInvalidateQueries(AFFECTED_KEYS);
  const archive = useMutation({ mutationFn: () => archiveProject(id), onSuccess: invalidate });
  const restore = useMutation({ mutationFn: () => restoreProject(id), onSuccess: invalidate });
  return { archive, restore };
}

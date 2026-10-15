import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
  getProject,
  listEligibleForDepartment,
  listEligibleForProject,
  listProjectActivities,
  listProjectTasks,
  listProjects,
} from '../api/projects.api';
import type { ProjectListParams } from '../types';
import { projectKeys } from './project-keys';

export function useProjects(params: ProjectListParams) {
  return useQuery({
    queryKey: projectKeys.list(params),
    queryFn: () => listProjects(params),
    placeholderData: keepPreviousData,
  });
}

export function useProject(id: string) {
  return useQuery({ queryKey: projectKeys.detail(id), queryFn: () => getProject(id) });
}

export function useProjectTasks(id: string, page: number) {
  return useQuery({
    queryKey: projectKeys.tasks(id, page),
    queryFn: () => listProjectTasks(id, page),
    placeholderData: keepPreviousData,
  });
}

/** Lịch sử dự án mới nhất trước, "Xem thêm" tải trang sau. */
export function useProjectActivities(id: string) {
  return useInfiniteQuery({
    queryKey: projectKeys.activities(id),
    queryFn: ({ pageParam }) => listProjectActivities(id, pageParam),
    initialPageParam: 1,
    getNextPageParam: ({ meta }) =>
      meta.page * meta.pageSize < meta.total ? meta.page + 1 : undefined,
  });
}

/**
 * Người chọn được làm chủ / thành viên (Q6): theo phòng khi tạo dự án, theo dự án khi sửa.
 * `scope` null → chưa chọn phòng, không gọi API.
 */
export function useEligibleMembers(scope: { departmentId: string } | { projectId: string } | null) {
  const key = scope ?? {};
  return useQuery({
    queryKey: projectKeys.eligible(key),
    queryFn: () =>
      scope && 'projectId' in scope
        ? listEligibleForProject(scope.projectId)
        : listEligibleForDepartment(scope?.departmentId ?? ''),
    enabled: scope !== null,
  });
}

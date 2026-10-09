import type { ProjectListParams } from '../types';

export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (params: ProjectListParams) =>
    [...projectKeys.lists(), params.status, params.q, params.page] as const,
  detail: (id: string) => [...projectKeys.all, 'detail', id] as const,
  tasks: (id: string, page: number) => [...projectKeys.all, 'tasks', id, page] as const,
  activities: (id: string) => [...projectKeys.all, 'activities', id] as const,
  eligible: (scope: { departmentId?: string; projectId?: string }) =>
    [...projectKeys.all, 'eligible', scope.departmentId ?? null, scope.projectId ?? null] as const,
};

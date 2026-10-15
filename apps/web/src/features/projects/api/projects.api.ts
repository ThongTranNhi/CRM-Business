import { apiPage, apiRequest, withQuery } from '@/lib/api-client';
import type {
  CreateProjectInput,
  EligibleMember,
  ProjectActivity,
  ProjectDetail,
  ProjectInput,
  ProjectListParams,
  ProjectSummary,
  ProjectTask,
} from '../types';

const BASE = '/api/projects';
export const PROJECT_PAGE_SIZE = 20;

const json = (method: string, body: unknown): RequestInit => ({
  method,
  body: JSON.stringify(body),
});

export const listProjects = ({ status, q, page }: ProjectListParams) =>
  apiPage<ProjectSummary>(
    withQuery(BASE, { status: status ?? undefined, q, page, pageSize: PROJECT_PAGE_SIZE }),
  );

export const getProject = (id: string) => apiRequest<ProjectDetail>(`${BASE}/${id}`);

export const createProject = (input: CreateProjectInput) =>
  apiRequest<ProjectDetail>(BASE, json('POST', input));

export const updateProject = (id: string, changes: Partial<ProjectInput>) =>
  apiRequest<ProjectDetail>(`${BASE}/${id}`, json('PATCH', changes));

export const archiveProject = (id: string) =>
  apiRequest<void>(`${BASE}/${id}`, { method: 'DELETE' });

export const restoreProject = (id: string) =>
  apiRequest<ProjectDetail>(`${BASE}/${id}/restore`, { method: 'POST' });

export const setProjectMembers = (id: string, employeeIds: string[]) =>
  apiRequest<ProjectDetail>(`${BASE}/${id}/members`, json('PUT', { employeeIds }));

/** Người chọn được khi tạo dự án ở phòng này / khi sửa thành viên một dự án (Q6). */
export const listEligibleForDepartment = (departmentId: string) =>
  apiRequest<EligibleMember[]>(withQuery(`${BASE}/eligible-members`, { departmentId }));

export const listEligibleForProject = (id: string) =>
  apiRequest<EligibleMember[]>(`${BASE}/${id}/eligible-members`);

export const listProjectTasks = (id: string, page: number) =>
  apiPage<ProjectTask>(withQuery(`${BASE}/${id}/tasks`, { page, pageSize: PROJECT_PAGE_SIZE }));

export const listProjectActivities = (id: string, page: number) =>
  apiPage<ProjectActivity>(
    withQuery(`${BASE}/${id}/activities`, { page, pageSize: PROJECT_PAGE_SIZE }),
  );

import { apiPage, apiRequest, withQuery } from '@/lib/api-client';
import type {
  ChecklistItem,
  TaskActivity,
  TaskComment,
  TaskDetail,
  UpdateTaskInput,
} from '../types';

// Drawer chi tiết task (docs/api/endpoints/tasks.md).
export const FEED_PAGE_SIZE = 20;

const json = (method: string, body: unknown): RequestInit => ({
  method,
  body: JSON.stringify(body),
});

export const getTask = (taskId: string) => apiRequest<TaskDetail>(`/api/tasks/${taskId}`);

export const updateTask = (taskId: string, changes: UpdateTaskInput) =>
  apiRequest<TaskDetail>(`/api/tasks/${taskId}`, json('PATCH', changes));

export const setCollaborators = (taskId: string, employeeIds: string[]) =>
  apiRequest<TaskDetail>(`/api/tasks/${taskId}/collaborators`, json('PUT', { employeeIds }));

export const getChecklist = (taskId: string) =>
  apiRequest<ChecklistItem[]>(`/api/tasks/${taskId}/checklist`);

export const addChecklistItem = (taskId: string, content: string) =>
  apiRequest<ChecklistItem[]>(`/api/tasks/${taskId}/checklist`, json('POST', { content }));

export const updateChecklistItem = (
  taskId: string,
  itemId: string,
  changes: { content?: string; isDone?: boolean },
) =>
  apiRequest<ChecklistItem[]>(`/api/tasks/${taskId}/checklist/${itemId}`, json('PATCH', changes));

export const removeChecklistItem = (taskId: string, itemId: string) =>
  apiRequest<ChecklistItem[]>(`/api/tasks/${taskId}/checklist/${itemId}`, { method: 'DELETE' });

export const getComments = (taskId: string, page: number) =>
  apiPage<TaskComment>(
    withQuery(`/api/tasks/${taskId}/comments`, { page, pageSize: FEED_PAGE_SIZE }),
  );

/** mentionIds: nhân viên được @nhắc → nhận thông báo (Đợt 3 S3). */
export const addComment = (
  taskId: string,
  comment: { body: string; parentId: string | null; mentionIds: string[] },
) => apiRequest<{ id: string }>(`/api/tasks/${taskId}/comments`, json('POST', comment));

export const getActivities = (taskId: string, page: number) =>
  apiPage<TaskActivity>(
    withQuery(`/api/tasks/${taskId}/activities`, { page, pageSize: FEED_PAGE_SIZE }),
  );

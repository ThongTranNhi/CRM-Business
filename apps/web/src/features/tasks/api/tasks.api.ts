import { apiPage, apiRequest, withQuery } from '@/lib/api-client';
import type {
  BoardData,
  BoardTask,
  CreateTaskInput,
  TaskMove,
  TrashParams,
  TrashTask,
} from '../types';

export const TRASH_PAGE_SIZE = 10;

export const getBoard = (boardId: string, doneLimit: number) =>
  apiRequest<BoardData>(withQuery(`/api/boards/${boardId}`, { doneLimit }));

export const getTrash = (boardId: string, { page, q }: TrashParams) =>
  apiPage<TrashTask>(
    withQuery(`/api/boards/${boardId}/trash`, { page, pageSize: TRASH_PAGE_SIZE, q }),
  );

export const createTask = (boardId: string, input: CreateTaskInput) =>
  apiRequest<BoardTask>(`/api/boards/${boardId}/tasks`, {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const moveTask = ({ taskId, ...move }: TaskMove) =>
  apiRequest<unknown>(`/api/tasks/${taskId}/move`, { method: 'PATCH', body: JSON.stringify(move) });

/** Xoá = lưu trữ (BR-19). */
export const archiveTask = (taskId: string) =>
  apiRequest<void>(`/api/tasks/${taskId}`, { method: 'DELETE' });

export const restoreTask = (taskId: string) =>
  apiRequest<BoardTask>(`/api/tasks/${taskId}/restore`, { method: 'POST' });

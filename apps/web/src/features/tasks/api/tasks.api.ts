import { apiRequest, withQuery } from '@/lib/api-client';
import type { BoardData, BoardTask, CreateTaskInput, TaskMove } from '../types';

export const getBoard = (boardId: string, doneLimit: number) =>
  apiRequest<BoardData>(withQuery(`/api/boards/${boardId}`, { doneLimit }));

export const createTask = (boardId: string, input: CreateTaskInput) =>
  apiRequest<BoardTask>(`/api/boards/${boardId}/tasks`, {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const moveTask = ({ taskId, ...move }: TaskMove) =>
  apiRequest<unknown>(`/api/tasks/${taskId}/move`, { method: 'PATCH', body: JSON.stringify(move) });

import { Hono } from 'hono';
import type { AppEnv } from '../../lib/app-env';
import {
  archive,
  board,
  collaborators,
  create,
  detail,
  move,
  restore,
  trash,
  update,
} from './tasks.controller';
import {
  activities,
  addChecklistItem,
  addComment,
  checklist,
  comments,
  removeChecklistItem,
  updateChecklistItem,
} from './tasks.detail.controller';

// Mọi role đều qua được route; quyền theo dữ liệu (thành viên phòng / board) kiểm tra ở service.

/** /api/boards/:boardId — board + cột + việc (1 request), tạo việc, thùng rác của board. */
export const boardRoutes = new Hono<AppEnv>();
boardRoutes.get('/:boardId', board);
boardRoutes.get('/:boardId/trash', trash);
boardRoutes.post('/:boardId/tasks', create);

/**
 * /api/tasks/:id — chi tiết, sửa, kéo thả, người phối hợp, lưu trữ (xoá mềm), hoàn tác; checklist,
 * bình luận, lịch sử cho drawer chi tiết.
 */
export const taskRoutes = new Hono<AppEnv>();
taskRoutes.get('/:id', detail);
taskRoutes.patch('/:id', update);
taskRoutes.delete('/:id', archive);
taskRoutes.post('/:id/restore', restore);
taskRoutes.patch('/:id/move', move);
taskRoutes.put('/:id/collaborators', collaborators);
taskRoutes.get('/:id/checklist', checklist);
taskRoutes.post('/:id/checklist', addChecklistItem);
taskRoutes.patch('/:id/checklist/:itemId', updateChecklistItem);
taskRoutes.delete('/:id/checklist/:itemId', removeChecklistItem);
taskRoutes.get('/:id/comments', comments);
taskRoutes.post('/:id/comments', addComment);
taskRoutes.get('/:id/activities', activities);

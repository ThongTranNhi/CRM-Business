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

// Mọi role đều qua được route; quyền theo dữ liệu (thành viên phòng / board) kiểm tra ở service.

/** /api/boards/:boardId — board + cột + việc (1 request), tạo việc, thùng rác của board. */
export const boardRoutes = new Hono<AppEnv>();
boardRoutes.get('/:boardId', board);
boardRoutes.get('/:boardId/trash', trash);
boardRoutes.post('/:boardId/tasks', create);

/** /api/tasks/:id — chi tiết, sửa, kéo thả, người phối hợp, lưu trữ (xoá mềm), hoàn tác. */
export const taskRoutes = new Hono<AppEnv>();
taskRoutes.get('/:id', detail);
taskRoutes.patch('/:id', update);
taskRoutes.delete('/:id', archive);
taskRoutes.post('/:id/restore', restore);
taskRoutes.patch('/:id/move', move);
taskRoutes.put('/:id/collaborators', collaborators);

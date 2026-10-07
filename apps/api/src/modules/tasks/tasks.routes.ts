import { Hono } from 'hono';
import type { AppEnv } from '../../lib/app-env';
import { archive, board, collaborators, create, detail, move, update } from './tasks.controller';

// Mọi role đều qua được route; quyền theo dữ liệu (thành viên phòng / board) kiểm tra ở service.

/** /api/boards/:boardId — board + cột + việc (1 request), tạo việc trong board. */
export const boardRoutes = new Hono<AppEnv>();
boardRoutes.get('/:boardId', board);
boardRoutes.post('/:boardId/tasks', create);

/** /api/tasks/:id — chi tiết, sửa, kéo thả, người phối hợp, lưu trữ. */
export const taskRoutes = new Hono<AppEnv>();
taskRoutes.get('/:id', detail);
taskRoutes.patch('/:id', update);
taskRoutes.delete('/:id', archive);
taskRoutes.patch('/:id/move', move);
taskRoutes.put('/:id/collaborators', collaborators);

import { Hono } from 'hono';
import type { AppEnv } from '../../lib/app-env';
import {
  activities,
  archive,
  create,
  detail,
  eligibleForDepartment,
  eligibleForProject,
  list,
  members,
  restore,
  tasks,
  update,
} from './projects.controller';

// Mọi role qua được route; quyền theo dữ liệu (phòng, chủ dự án, thành viên) kiểm tra ở service
// (lib/project-access.ts). Đường dẫn cố định đứng trước /:id.

/** /api/projects — danh sách, tạo, chi tiết, sửa, lưu trữ / khôi phục, thành viên, công việc, lịch sử. */
export const projectRoutes = new Hono<AppEnv>();
projectRoutes.get('/', list);
projectRoutes.post('/', create);
projectRoutes.get('/eligible-members', eligibleForDepartment);
projectRoutes.get('/:id', detail);
projectRoutes.patch('/:id', update);
projectRoutes.delete('/:id', archive);
projectRoutes.post('/:id/restore', restore);
projectRoutes.put('/:id/members', members);
projectRoutes.get('/:id/eligible-members', eligibleForProject);
projectRoutes.get('/:id/tasks', tasks);
projectRoutes.get('/:id/activities', activities);

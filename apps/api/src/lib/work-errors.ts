import { AppError, forbidden } from './app-error';
import { departmentNotFound } from './directory-errors';
import { TASK_PROJECT_ERRORS } from './project-errors';
import type { DatabaseErrorMap } from './supabase';

// Mã lỗi do RPC Work Management raise và tên check của bảng (supabase/migrations/20261006090600_*,
// *090700_*), dùng chung cho department-dashboards và tasks.
export const dashboardNotFound = () =>
  new AppError('DASHBOARD_NOT_FOUND', 'Không tìm thấy Dashboard', 404);

export const boardNotFound = () => new AppError('BOARD_NOT_FOUND', 'Không tìm thấy board', 404);

export const taskNotFound = () => new AppError('TASK_NOT_FOUND', 'Không tìm thấy công việc', 404);

/** BR-04: phòng đã có Dashboard → trả id để giao diện mở Dashboard đó. */
export const dashboardAlreadyExists = (dashboardId: string) =>
  new AppError('DASHBOARD_ALREADY_EXISTS', 'Phòng ban này đã có Dashboard', 409, { dashboardId });

/** BR-06: phòng ban đã xoá → Dashboard chỉ đọc; kiểm tra trước quyền ghi (409, không phải 403). */
export const dashboardReadOnly = () =>
  new AppError('DASHBOARD_READ_ONLY', 'Phòng ban đã bị xoá, Dashboard chỉ xem được', 409);

const invalidDateRange = () =>
  new AppError('INVALID_DATE_RANGE', 'Hạn không được trước ngày bắt đầu', 400);

export const WORK_ERRORS: DatabaseErrorMap = {
  ...TASK_PROJECT_ERRORS,
  FORBIDDEN: forbidden,
  DEPARTMENT_NOT_FOUND: departmentNotFound,
  BOARD_NOT_FOUND: boardNotFound,
  TASK_NOT_FOUND: taskNotFound,
  DASHBOARD_READ_ONLY: dashboardReadOnly,
  ASSIGNEE_REQUIRED: () =>
    new AppError('ASSIGNEE_REQUIRED', 'Mỗi công việc cần đúng một người phụ trách chính', 400),
  EMPLOYEE_NOT_IN_BOARD: () =>
    new AppError(
      'EMPLOYEE_NOT_IN_BOARD',
      'Người được chọn không thuộc phòng ban hoặc không được mời vào Dashboard này',
      422,
    ),
  COLLABORATOR_IS_ASSIGNEE: () =>
    new AppError(
      'COLLABORATOR_IS_ASSIGNEE',
      'Người phụ trách chính không đồng thời là người phối hợp',
      422,
    ),
  INVALID_COLUMN: () => new AppError('INVALID_COLUMN', 'Cột không thuộc board này', 400),
  INVALID_POSITION: () =>
    new AppError('INVALID_POSITION', 'Board đã thay đổi, vui lòng tải lại để kéo thả', 409),
  tasks_date_range_check: invalidDateRange,
  tasks_title_check: () =>
    new AppError('VALIDATION_ERROR', 'Tên công việc cần từ 1 đến 200 ký tự', 400),
  tasks_description_check: () => new AppError('VALIDATION_ERROR', 'Mô tả tối đa 5000 ký tự', 400),
  CHECKLIST_ITEM_NOT_FOUND: () =>
    new AppError('CHECKLIST_ITEM_NOT_FOUND', 'Mục checklist không còn tồn tại', 404),
  COMMENT_NOT_FOUND: () =>
    new AppError('COMMENT_NOT_FOUND', 'Bình luận được trả lời không còn tồn tại', 404),
  COMMENT_REPLY_TOO_DEEP: () =>
    new AppError('COMMENT_REPLY_TOO_DEEP', 'Chỉ trả lời được bình luận gốc', 400),
  task_checklist_items_content_check: () =>
    new AppError('VALIDATION_ERROR', 'Mục checklist cần từ 1 đến 500 ký tự', 400),
  task_comments_body_check: () =>
    new AppError('VALIDATION_ERROR', 'Bình luận cần từ 1 đến 5000 ký tự', 400),
};

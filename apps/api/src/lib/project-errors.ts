import { AppError, forbidden } from './app-error';
import { departmentNotFound } from './directory-errors';
import type { DatabaseErrorMap } from './supabase';

// Mã lỗi RPC dự án (supabase/migrations/20261009090000_projects.sql) — dùng chung cho projects và tasks
// (gắn dự án vào task).
export const projectNotFound = () =>
  new AppError('PROJECT_NOT_FOUND', 'Không tìm thấy dự án hoặc dự án đã lưu trữ', 404);

/** Phòng ban của dự án đã xoá → dự án chỉ xem được (như BR-06). */
export const projectReadOnly = () =>
  new AppError('PROJECT_READ_ONLY', 'Phòng ban đã bị xoá, dự án chỉ xem được', 409);

/** BR-30: dự án phải cùng phòng với task. */
const projectNotInDepartment = () =>
  new AppError('PROJECT_NOT_IN_DEPARTMENT', 'Chỉ gắn được dự án cùng phòng ban với công việc', 422);

/** Lỗi gắn dự án vào task — gộp vào WORK_ERRORS của module tasks. */
export const TASK_PROJECT_ERRORS: DatabaseErrorMap = {
  PROJECT_NOT_FOUND: projectNotFound,
  PROJECT_NOT_IN_DEPARTMENT: projectNotInDepartment,
  tasks_project_department_fk: projectNotInDepartment,
};

export const PROJECT_ERRORS: DatabaseErrorMap = {
  ...TASK_PROJECT_ERRORS,
  FORBIDDEN: forbidden,
  DEPARTMENT_NOT_FOUND: departmentNotFound,
  PROJECT_MEMBER_NOT_ELIGIBLE: () =>
    new AppError(
      'PROJECT_MEMBER_NOT_ELIGIBLE',
      'Chỉ chọn được người thuộc phòng ban hoặc được mời vào Dashboard của phòng',
      422,
    ),
  projects_department_name_key: () =>
    new AppError('PROJECT_NAME_EXISTS', 'Phòng ban đã có dự án cùng tên', 409),
  projects_date_range_check: () =>
    new AppError('INVALID_DATE_RANGE', 'Hạn không được trước ngày bắt đầu', 400),
  projects_name_check: () =>
    new AppError('VALIDATION_ERROR', 'Tên dự án cần từ 1 đến 120 ký tự', 400),
  projects_description_check: () =>
    new AppError('VALIDATION_ERROR', 'Mô tả dự án tối đa 2000 ký tự', 400),
};

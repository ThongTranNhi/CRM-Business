import { AppError, forbidden } from './app-error';
import { departmentNotFound } from './directory-errors';
import type { DatabaseErrorMap } from './supabase';

// Mã lỗi do RPC Work Management raise (supabase/migrations/20261006090700_*), dùng chung cho
// department-dashboards và tasks.
export const dashboardNotFound = () =>
  new AppError('DASHBOARD_NOT_FOUND', 'Không tìm thấy Dashboard', 404);

/** BR-04: phòng đã có Dashboard → trả id để giao diện mở Dashboard đó. */
export const dashboardAlreadyExists = (dashboardId: string) =>
  new AppError('DASHBOARD_ALREADY_EXISTS', 'Phòng ban này đã có Dashboard', 409, { dashboardId });

export const WORK_ERRORS: DatabaseErrorMap = {
  FORBIDDEN: forbidden,
  DEPARTMENT_NOT_FOUND: departmentNotFound,
  BOARD_NOT_FOUND: dashboardNotFound,
};

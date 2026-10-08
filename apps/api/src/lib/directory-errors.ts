import { z } from 'zod';
import { AppError, forbidden } from './app-error';
import type { DatabaseErrorInfo, DatabaseErrorMap } from './supabase';

// Mã lỗi do các RPC phòng ban / nhân viên raise (supabase/migrations/20261006090200_*, *090300_*).
// Hai module departments và users dùng chung vì các RPC dùng chung hàm kiểm tra trong DB.
export const departmentNotFound = () =>
  new AppError('DEPARTMENT_NOT_FOUND', 'Không tìm thấy phòng ban', 404);

export const employeeNotFound = () =>
  new AppError('EMPLOYEE_NOT_FOUND', 'Không tìm thấy nhân viên', 404);

export const departmentNameExists = () =>
  new AppError('DEPARTMENT_NAME_EXISTS', 'Phòng ban này đã tồn tại', 409);

// detail của HANDOVER_EMPLOYEE_NOT_IN_BOARD (migration 20261008090000): các việc người nhận không nhận được.
const blockedTasksSchema = z.array(
  z.object({ taskId: z.string(), title: z.string(), dashboardName: z.string() }),
);
const SHOWN_BLOCKED_TASKS = 3;

function readBlockedTasks(detail: string | null) {
  try {
    const parsed = blockedTasksSchema.safeParse(JSON.parse(detail ?? '[]'));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

/** Nêu rõ việc / Dashboard nào chặn bàn giao (BR-53) để người xoá chọn lại người nhận. */
function handoverBlocked({ detail }: DatabaseErrorInfo): AppError {
  const blockedTasks = readBlockedTasks(detail);
  const named = blockedTasks
    .slice(0, SHOWN_BLOCKED_TASKS)
    .map((task) => `“${task.title}” (${task.dashboardName})`)
    .join(', ');
  const others = blockedTasks.length - SHOWN_BLOCKED_TASKS;
  const list = others > 0 ? `${named} và ${others} việc khác` : named;
  const message = blockedTasks.length
    ? `Người nhận không thuộc Dashboard của ${blockedTasks.length} việc: ${list}. Hãy chọn người cùng phòng, mời họ vào Dashboard đó, hoặc bỏ qua bàn giao.`
    : 'Người nhận không thuộc phòng ban (hoặc Dashboard) của một số việc đang mở. Hãy chọn người cùng phòng, hoặc bỏ qua bàn giao.';
  return new AppError('HANDOVER_EMPLOYEE_NOT_IN_BOARD', message, 422, { blockedTasks });
}

export const DIRECTORY_ERRORS: DatabaseErrorMap = {
  FORBIDDEN: forbidden,
  DEPARTMENT_NOT_FOUND: departmentNotFound,
  DEPARTMENT_NAME_EXISTS: departmentNameExists,
  EMPLOYEE_NOT_FOUND: employeeNotFound,
  EMPLOYEE_IS_MANAGER: () =>
    new AppError('EMPLOYEE_IS_MANAGER', 'Nhân viên này đang là trưởng một phòng ban khác', 409),
  INVALID_REPLACEMENT_MANAGER: () =>
    new AppError('INVALID_REPLACEMENT_MANAGER', 'Trưởng phòng mới phải là người khác', 422),
  RECEIVING_DEPARTMENT_REQUIRED: () =>
    new AppError(
      'RECEIVING_DEPARTMENT_REQUIRED',
      'Phòng ban còn nhân viên: hãy chọn phòng nhận',
      422,
    ),
  RECEIVING_DEPARTMENT_INVALID: () =>
    new AppError('RECEIVING_DEPARTMENT_INVALID', 'Phòng nhận không hợp lệ hoặc đã bị xoá', 422),
  CANNOT_DELETE_SELF: () =>
    new AppError('CANNOT_DELETE_SELF', 'Bạn không thể tự xoá tài khoản của mình', 422),
  CANNOT_DELETE_ADMIN: () =>
    new AppError('CANNOT_DELETE_ADMIN', 'Không thể xoá tài khoản Super Admin', 422),
  // BR-53: bàn giao việc khi xoá nhân viên (migration 20261006090800).
  INVALID_HANDOVER_EMPLOYEE: () =>
    new AppError('INVALID_HANDOVER_EMPLOYEE', 'Người nhận bàn giao phải là người khác', 422),
  HANDOVER_EMPLOYEE_NOT_FOUND: () =>
    new AppError(
      'HANDOVER_EMPLOYEE_NOT_FOUND',
      'Người nhận bàn giao không còn làm việc, hãy chọn người khác',
      422,
    ),
  HANDOVER_EMPLOYEE_NOT_IN_BOARD: handoverBlocked,
  EMPLOYEE_CODE_EXISTS: () =>
    new AppError(
      'EMPLOYEE_CODE_EXISTS',
      'Mã nhân viên đã được dùng, hãy đổi mã trước khi khôi phục',
      409,
    ),
};

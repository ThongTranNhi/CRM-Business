import type { BadgeTone } from '@/components/ui';
import type { DirectoryEmployee } from './types';

/** Nhãn trạng thái hồ sơ: Đã xoá (BR-53) > Đã khoá > Đang làm; chưa có tài khoản thì xám. */
export function employeeStatusBadge(employee: DirectoryEmployee): {
  label: string;
  tone: BadgeTone;
} {
  if (employee.archivedAt) return { label: 'Đã xoá', tone: 'danger' };
  if (!employee.status) return { label: 'Chưa có tài khoản', tone: 'neutral' };
  if (employee.status !== 'active') return { label: 'Đã khoá', tone: 'warning' };
  return { label: 'Đang làm', tone: 'success' };
}

import type { BadgeTone } from '@/components/ui';
import type { DeleteEmployeeResult, DirectoryEmployee, EmployeeDetail } from './types';

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

/** "phụ trách 3 việc chưa xong và làm chủ 2 dự án" — phần cần bàn giao khi xoá nhân viên (BR-53). */
export function handoverScopeText({
  openTaskCount,
  ownedProjectCount,
}: Pick<EmployeeDetail, 'openTaskCount' | 'ownedProjectCount'>): string {
  const parts = [
    openTaskCount > 0 ? `phụ trách ${openTaskCount} việc chưa xong` : '',
    ownedProjectCount > 0 ? `làm chủ ${ownedProjectCount} dự án` : '',
  ].filter(Boolean);
  return parts.join(' và ');
}

/** ", bàn giao 3 việc và 2 dự án cho An" hoặc '' khi không bàn giao gì. */
export function handedOverText(
  { handedOverTaskCount, handedOverProjectCount }: DeleteEmployeeResult,
  receiverName: string,
): string {
  const parts = [
    handedOverTaskCount > 0 ? `${handedOverTaskCount} việc` : '',
    handedOverProjectCount > 0 ? `${handedOverProjectCount} dự án` : '',
  ].filter(Boolean);
  return parts.length > 0 ? `, bàn giao ${parts.join(' và ')} cho ${receiverName}` : '';
}

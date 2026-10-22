import type { BadgeTone } from '@/components/ui';
import {
  EMPLOYEE_TASK_TABS,
  PROFILE_TABS,
  type DeleteEmployeeResult,
  type DirectoryEmployee,
  type EmployeeDetail,
  type EmployeeTaskTab,
  type ProfileTab,
} from './types';

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

/** `?tab=` và `?taskTab=` của hồ sơ nhân viên; giá trị sai → mặc định. */
export function readProfileTabs(params: URLSearchParams): {
  tab: ProfileTab;
  taskTab: EmployeeTaskTab;
} {
  const tab = params.get('tab');
  const taskTab = params.get('taskTab');
  return {
    tab: PROFILE_TABS.find((value) => value === tab) ?? 'info',
    taskTab: EMPLOYEE_TASK_TABS.find((value) => value === taskTab) ?? 'open',
  };
}

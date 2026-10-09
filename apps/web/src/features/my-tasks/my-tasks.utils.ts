import { PRIORITIES, type TaskStatus } from '@/features/tasks';
import { readOption, readPage } from '@/lib/use-url-params';
import {
  MY_TASK_TABS,
  type MyTask,
  type MyTaskCounts,
  type MyTaskParams,
  type MyTaskTab,
} from './types';

export const TAB_LABEL: Record<MyTaskTab, string> = {
  today: 'Hôm nay',
  week: 'Tuần này',
  overdue: 'Quá hạn',
  open: 'Tất cả đang mở',
  done: 'Đã xong',
};

/** "Hôm nay (3)"; chưa có số đếm → chỉ tên tab. */
export const tabLabel = (tab: MyTaskTab, counts: MyTaskCounts | undefined) =>
  counts ? `${TAB_LABEL[tab]} (${counts[tab]})` : TAB_LABEL[tab];

/** Đọc bộ lọc từ URL; giá trị sai → mặc định. */
export function readMyTaskParams(params: URLSearchParams): MyTaskParams {
  const priority = params.get('priority');
  return {
    // Tab đầu (Hôm nay) là mặc định.
    tab: readOption(params, 'tab', MY_TASK_TABS),
    departmentId: params.get('department') ?? '',
    priority: PRIORITIES.find((value) => value === priority) ?? '',
    projectId: params.get('project') ?? '',
    q: params.get('q') ?? '',
    page: readPage(params),
  };
}

export const hasFilters = (params: MyTaskParams) =>
  params.departmentId !== '' ||
  params.priority !== '' ||
  params.projectId !== '' ||
  params.q !== '';

export const STATUS_GROUP_LABEL: Record<TaskStatus, string> = {
  in_progress: 'Đang làm',
  todo: 'Cần làm',
  done: 'Đã xong',
};

/** Nhóm theo trạng thái, giữ thứ tự server trả (Đang làm → Cần làm; trong nhóm theo hạn). */
export function groupByStatus(tasks: MyTask[]): { status: TaskStatus; tasks: MyTask[] }[] {
  const order: TaskStatus[] = ['in_progress', 'todo', 'done'];
  return order
    .map((status) => ({ status, tasks: tasks.filter((task) => task.status === status) }))
    .filter((group) => group.tasks.length > 0);
}

/** Bấm dòng → mở drawer task trên board của Dashboard. */
export const taskLink = (task: MyTask) => `/app/workspace/${task.dashboard.id}?task=${task.id}`;

/** Checkbox hoàn thành nhanh: chỉ việc chưa xong, có quyền sửa, board có cột "done" mặc định. */
export const canComplete = (task: MyTask): task is MyTask & { doneColumnId: string } =>
  task.canEdit && task.status !== 'done' && task.doneColumnId !== null;

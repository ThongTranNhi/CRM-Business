import type { BadgeTone } from '@/components/ui';
import { readOption, readPage } from '@/lib/use-url-params';
import {
  WORKLOAD_SORTS,
  type SortOrder,
  type WorkloadParams,
  type WorkloadRow,
  type WorkloadSort,
} from './types';

/** Trên ngưỡng này việc đang mở → tô warning (frontend-spec 4.6). */
const OVERLOAD_THRESHOLD = 10;

type WorkloadSortState = Pick<WorkloadParams, 'sort' | 'order'>;

/** Tên A → Z; các con số: nhiều trước. */
export const defaultOrder = (sort: WorkloadSort): SortOrder => (sort === 'name' ? 'asc' : 'desc');

/** Đọc bộ lọc từ URL; giá trị sai → mặc định. */
export function readWorkloadParams(params: URLSearchParams): WorkloadParams {
  const sort = readOption(params, 'sort', WORKLOAD_SORTS);
  const order = params.get('order');
  return {
    departmentId: params.get('department') ?? '',
    sort,
    order: order === 'asc' || order === 'desc' ? order : defaultOrder(sort),
    page: readPage(params),
  };
}

/** Bấm lại cột đang sắp xếp → đảo chiều; cột khác → chiều mặc định của cột đó. */
export function nextSort(current: WorkloadSortState, sort: WorkloadSort): WorkloadSortState {
  if (current.sort !== sort) return { sort, order: defaultOrder(sort) };
  return { sort, order: current.order === 'asc' ? 'desc' : 'asc' };
}

export const isWorkloadSort = (key: string): key is WorkloadSort =>
  WORKLOAD_SORTS.some((sort) => sort === key);

/** Quá tải: hơn 10 việc đang mở → thanh tô warning. */
export const isOverloaded = (row: WorkloadRow): boolean => row.open > OVERLOAD_THRESHOLD;

/** Có việc quá hạn → ô Quá hạn tô danger. */
export const overdueTone = (row: WorkloadRow): BadgeTone | null =>
  row.overdue > 0 ? 'danger' : null;

/** Nhóm của một con số → bộ lọc trên board (board.utils: `?status=`, `?due=`). */
export type CountFilter = 'todo' | 'in_progress' | 'overdue' | 'done';

/** Board phòng của nhân viên lọc theo người phụ trách + nhóm; null nếu phòng chưa có Dashboard. */
export function boardLink(row: WorkloadRow, filter: CountFilter): string | null {
  if (!row.dashboardId) return null;
  const params = new URLSearchParams({ assignee: row.employee.id });
  if (filter === 'overdue') params.set('due', 'overdue');
  else params.set('status', filter);
  return `/app/workspace/${row.dashboardId}?${params}`;
}

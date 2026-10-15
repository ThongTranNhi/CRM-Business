// GET /api/workload (docs/api/endpoints/workload.md).

/** Cột sắp xếp; phần tử đầu là mặc định (nhiều việc đang mở nhất trước). */
export const WORKLOAD_SORTS = ['open', 'name', 'todo', 'inProgress', 'overdue', 'done30d'] as const;
export type WorkloadSort = (typeof WORKLOAD_SORTS)[number];
export type SortOrder = 'asc' | 'desc';

/** Số việc người này là người phụ trách chính, trên mọi Dashboard. */
export interface WorkloadRow {
  employee: { id: string; fullName: string };
  department: { id: string; name: string } | null;
  /** Board phòng của nhân viên; null → phòng chưa có Dashboard, con số không bấm được. */
  dashboardId: string | null;
  todo: number;
  inProgress: number;
  open: number;
  overdue: number;
  done30d: number;
}

/** Bộ lọc trên URL: `?department=&sort=&order=&page=`. */
export interface WorkloadParams {
  departmentId: string;
  sort: WorkloadSort;
  order: SortOrder;
  page: number;
}

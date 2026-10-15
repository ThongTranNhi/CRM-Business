// GET /api/workload — Khối lượng việc (docs/api/endpoints/workload.md).

export const WORKLOAD_SORTS = ['name', 'todo', 'inProgress', 'open', 'overdue', 'done30d'] as const;
export type WorkloadSort = (typeof WORKLOAD_SORTS)[number];

/** Việc người này là người phụ trách chính, trên mọi Dashboard chưa bị xoá phòng. */
export interface WorkloadRow {
  employee: { id: string; fullName: string };
  department: { id: string; name: string } | null;
  /** Board phòng của nhân viên — đích khi bấm một con số; null nếu phòng chưa có Dashboard. */
  dashboardId: string | null;
  todo: number;
  inProgress: number;
  open: number;
  overdue: number;
  done30d: number;
}

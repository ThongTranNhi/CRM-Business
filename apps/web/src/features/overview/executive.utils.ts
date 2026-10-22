import { OVERVIEW_PERIODS, type DepartmentTaskStats, type OverviewPeriod } from './types';

export const PERIOD_LABELS: Record<OverviewPeriod, string> = {
  week: 'Tuần này',
  month: 'Tháng này',
  quarter: 'Quý này',
};

/** `?period=` trên URL; thiếu hoặc sai → tháng này. */
export function readPeriod(params: URLSearchParams): OverviewPeriod {
  const value = params.get('period');
  return OVERVIEW_PERIODS.find((period) => period === value) ?? 'month';
}

export const taskTotal = (row: DepartmentTaskStats) => row.todo + row.inProgress + row.done;

/** Độ rộng (%) từng đoạn của thanh chồng, so với phòng nhiều việc nhất (thanh dài nhất = 100%). */
export function segmentWidths(row: DepartmentTaskStats, maxTotal: number) {
  const width = (count: number) => (maxTotal === 0 ? 0 : (count / maxTotal) * 100);
  return { todo: width(row.todo), inProgress: width(row.inProgress), done: width(row.done) };
}

/** "Hôm nay", "Ngày mai", "Còn 3 ngày". */
export function dueLabel(daysLeft: number): string {
  if (daysLeft <= 0) return 'Hôm nay';
  if (daysLeft === 1) return 'Ngày mai';
  return `Còn ${daysLeft} ngày`;
}

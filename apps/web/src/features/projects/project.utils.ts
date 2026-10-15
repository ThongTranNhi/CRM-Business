import type { BadgeTone } from '@/components/ui';
import type { ProjectStatus } from './types';

export const PROJECT_STATUSES = ['planning', 'active', 'on_hold', 'done'] as const;

/** Trạng thái dự án (colors.md mục 4): Lên kế hoạch / Đang chạy / Tạm dừng / Hoàn thành. */
export const PROJECT_STATUS_META: Record<ProjectStatus, { label: string; tone: BadgeTone }> = {
  planning: { label: 'Lên kế hoạch', tone: 'neutral' },
  active: { label: 'Đang chạy', tone: 'info' },
  on_hold: { label: 'Tạm dừng', tone: 'warning' },
  done: { label: 'Hoàn thành', tone: 'success' },
};

/** "1/4 việc xong" hoặc "Chưa có công việc" (BR-31). */
export function progressLabel(progress: { done: number; total: number }): string {
  return progress.total === 0
    ? 'Chưa có công việc'
    : `${progress.done}/${progress.total} việc xong`;
}

/** "09/10/2026" từ YYYY-MM-DD (cột date), không phụ thuộc múi giờ máy. */
export const formatIsoDate = (isoDate: string | null) =>
  isoDate ? isoDate.split('-').reverse().join('/') : '—';

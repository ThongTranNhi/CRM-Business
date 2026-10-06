import { z } from 'zod';
import type { DashboardCard } from '@/features/department-dashboards';
import { ApiError } from '@/lib/api-client';
import type { DepartmentOption } from './types';

// Dải màu trên thẻ Dashboard: suy cố định từ id phòng ban, chỉ dùng token Tailwind (không mã hex).
const ACCENT_CLASSES = [
  'bg-primary-500',
  'bg-accent-500',
  'bg-info-500',
  'bg-warning-500',
  'bg-success-500',
] as const;

export function dashboardAccent(departmentId: string): string {
  let hash = 0;
  for (const char of departmentId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return ACCENT_CLASSES[hash % ACCENT_CLASSES.length] ?? ACCENT_CLASSES[0];
}

/** Bỏ dấu tiếng Việt để tìm "kinh doanh" ra "Kinh Doanh", "ke toan" ra "Kế toán". */
const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .trim();

/** Lọc phía client theo tên Dashboard hoặc tên phòng ban (`?q=` trên URL). */
export function filterDashboards(cards: DashboardCard[], query: string): DashboardCard[] {
  const keyword = normalize(query);
  if (!keyword) return cards;
  return cards.filter(
    (card) =>
      normalize(card.name).includes(keyword) || normalize(card.department.name).includes(keyword),
  );
}

const existingDashboardSchema = z.object({ dashboardId: z.string().min(1) });

/** BR-04: 409 DASHBOARD_ALREADY_EXISTS kèm id Dashboard đã có; lỗi khác → null. */
export function existingDashboardId(error: unknown): string | null {
  if (!(error instanceof ApiError) || error.code !== 'DASHBOARD_ALREADY_EXISTS') return null;
  const parsed = existingDashboardSchema.safeParse(error.details);
  return parsed.success ? parsed.data.dashboardId : null;
}

/**
 * Phòng chọn sẵn trong modal Tạo Dashboard. Có `?createFor=` mà phòng đó không nằm trong danh sách được
 * tạo (đã có Dashboard / không có quyền) → để trống, KHÔNG tự chọn phòng khác.
 */
export function initialDepartment(
  options: DepartmentOption[],
  initialId: string | null,
): { option: DepartmentOption | null; isUnavailable: boolean } {
  if (initialId === null) return { option: options[0] ?? null, isUnavailable: false };
  const option = options.find((candidate) => candidate.id === initialId) ?? null;
  return { option, isUnavailable: option === null };
}

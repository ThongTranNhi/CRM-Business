import { describe, expect, it, vi } from 'vitest';
import type { DashboardCard } from '@/features/department-dashboards';
import { ApiError } from '@/lib/api-client';
import {
  dashboardAccent,
  existingDashboardId,
  filterDashboards,
  initialDepartment,
} from './workspace.utils';

// api-client nạp supabase client (cần biến môi trường); test chỉ dùng lớp ApiError.
vi.mock('@/lib/supabase', () => ({ supabase: {} }));

const card = (name: string, departmentName: string): DashboardCard => ({
  id: name,
  name,
  description: null,
  department: { id: `dept-${name}`, name: departmentName },
  boardId: `board-${name}`,
  counts: { open: 0, inProgress: 0, overdue: 0 },
  manager: null,
  members: { total: 0, preview: [] },
  isReadOnly: false,
});

describe('dashboardAccent', () => {
  it('returns the same token class for the same department', () => {
    expect(dashboardAccent('dept-1')).toBe(dashboardAccent('dept-1'));
    expect(dashboardAccent('dept-1')).toMatch(/^bg-(primary|accent|info|warning|success)-500$/);
  });
});

describe('filterDashboards', () => {
  const cards = [card('Kinh doanh', 'Kinh doanh'), card('Sản phẩm', 'Kỹ thuật')];

  it('keeps everything when the query is empty', () => {
    expect(filterDashboards(cards, '  ')).toHaveLength(2);
  });
  it('matches the dashboard or department name without Vietnamese accents', () => {
    expect(filterDashboards(cards, 'kinh DOANH').map((c) => c.name)).toEqual(['Kinh doanh']);
    expect(filterDashboards(cards, 'ky thuat').map((c) => c.name)).toEqual(['Sản phẩm']);
  });
});

describe('existingDashboardId', () => {
  it('reads dashboardId from 409 DASHBOARD_ALREADY_EXISTS', () => {
    const error = new ApiError('Đã có', 'DASHBOARD_ALREADY_EXISTS', 409, { dashboardId: 'd-1' });
    expect(existingDashboardId(error)).toBe('d-1');
  });
  it('ignores other errors', () => {
    expect(existingDashboardId(new ApiError('Lỗi', 'FORBIDDEN', 403))).toBeNull();
    expect(existingDashboardId(new Error('x'))).toBeNull();
  });
});

describe('initialDepartment', () => {
  const options = [
    { id: 'a', name: 'Kinh doanh', isNew: false },
    { id: 'b', name: 'Kỹ thuật', isNew: false },
  ];

  it('selects the first department when the modal opens without createFor', () => {
    expect(initialDepartment(options, null)).toEqual({ option: options[0], isUnavailable: false });
  });
  it('selects createFor when the user may create it', () => {
    expect(initialDepartment(options, 'b').option?.name).toBe('Kỹ thuật');
  });
  it('leaves the selection empty when createFor is not creatable', () => {
    expect(initialDepartment(options, 'x')).toEqual({ option: null, isUnavailable: true });
  });
});

import type { IconName } from '@/components/ui';

export interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  /** false: module chưa xây dựng, hiển thị mờ kèm nhãn "Sắp có". */
  ready: boolean;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

// Theo sitemap. Khi một module xong: đổi ready = true và thêm route trong app/router.tsx.
export const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Công việc',
    items: [
      { to: '/app', label: 'Tổng quan', icon: 'home', ready: true },
      { to: '/app/workspace', label: 'Workspace', icon: 'grid', ready: false },
      { to: '/app/my-tasks', label: 'Việc của tôi', icon: 'checkSquare', ready: false },
      { to: '/app/projects', label: 'Dự án', icon: 'folder', ready: false },
      { to: '/app/workload', label: 'Khối lượng việc', icon: 'barChart', ready: false },
      { to: '/app/overview', label: 'Tổng quan điều hành', icon: 'trending', ready: false },
    ],
  },
  {
    title: 'Nhân sự',
    items: [
      { to: '/app/hrm/employees', label: 'Nhân viên', icon: 'users', ready: false },
      { to: '/app/hrm/departments', label: 'Phòng ban', icon: 'building', ready: false },
      { to: '/app/hrm/org-chart', label: 'Sơ đồ tổ chức', icon: 'network', ready: false },
      { to: '/app/hrm/attendance', label: 'Chấm công', icon: 'clock', ready: false },
      { to: '/app/hrm/leave', label: 'Nghỉ phép', icon: 'calendar', ready: false },
      { to: '/app/hrm/payroll', label: 'Bảng lương', icon: 'wallet', ready: false },
      { to: '/app/hrm/kpi', label: 'KPI', icon: 'target', ready: false },
      { to: '/app/hrm/recruitment', label: 'Tuyển dụng', icon: 'userPlus', ready: false },
      { to: '/app/hrm/assets', label: 'Tài sản', icon: 'package', ready: false },
      { to: '/app/hrm/documents', label: 'Tài liệu', icon: 'file', ready: false },
      { to: '/app/hrm/approvals', label: 'Phê duyệt', icon: 'approval', ready: false },
    ],
  },
  {
    title: 'Hệ thống',
    items: [{ to: '/app/settings', label: 'Cài đặt', icon: 'settings', ready: false }],
  },
];

import type { IconName } from '@/components/ui';
import type { Permission } from '@/features/auth';

export interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  /** Bỏ trống: mọi người thấy. Không có quyền thì ẩn hẳn (frontend-spec 3.1). */
  permission?: Permission;
  /** false: module chưa làm tới, route hiện trang "Tính năng đang được xây dựng". */
  ready: boolean;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

// Bản đồ route: docs/ui-ux/frontend-spec.md mục 2. Module xong → ready: true + route thật trong app/router.tsx.
export const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Công việc',
    items: [
      { to: '/app', label: 'Tổng quan', icon: 'home', ready: true },
      { to: '/app/workspace', label: 'Workspace', icon: 'grid', ready: true },
      { to: '/app/my-tasks', label: 'Việc của tôi', icon: 'checkSquare', ready: false },
      { to: '/app/projects', label: 'Dự án', icon: 'folder', ready: true },
      {
        to: '/app/workload',
        label: 'Khối lượng việc',
        icon: 'barChart',
        permission: 'workload.view',
        ready: false,
      },
      {
        to: '/app/overview',
        label: 'Tổng quan điều hành',
        icon: 'trending',
        permission: 'executive-overview.view',
        ready: false,
      },
    ],
  },
  {
    title: 'Nhân sự',
    items: [
      {
        to: '/app/employees',
        label: 'Nhân viên',
        icon: 'users',
        permission: 'employees.view',
        ready: true,
      },
      { to: '/app/departments', label: 'Phòng ban', icon: 'building', ready: true },
      { to: '/app/org-chart', label: 'Sơ đồ tổ chức', icon: 'network', ready: false },
      { to: '/app/attendance', label: 'Chấm công', icon: 'clock', ready: false },
      { to: '/app/leave', label: 'Nghỉ phép', icon: 'calendar', ready: false },
      { to: '/app/payroll', label: 'Bảng lương', icon: 'wallet', ready: false },
      { to: '/app/kpi', label: 'KPI & Đánh giá', icon: 'target', ready: false },
      {
        to: '/app/recruitment',
        label: 'Tuyển dụng',
        icon: 'userPlus',
        permission: 'recruitment.view',
        ready: false,
      },
      {
        to: '/app/onboarding',
        label: 'Nhận việc / Nghỉ việc',
        icon: 'transfer',
        permission: 'onboarding.view',
        ready: false,
      },
      { to: '/app/assets', label: 'Tài sản', icon: 'package', ready: false },
      { to: '/app/documents', label: 'Tài liệu', icon: 'file', ready: false },
      { to: '/app/approvals', label: 'Phê duyệt', icon: 'approval', ready: false },
    ],
  },
  {
    title: 'Hệ thống',
    items: [
      {
        to: '/app/reports',
        label: 'Báo cáo',
        icon: 'pieChart',
        permission: 'reports.view',
        ready: false,
      },
      {
        to: '/app/settings',
        label: 'Cài đặt',
        icon: 'settings',
        permission: 'settings.view',
        ready: false,
      },
    ],
  },
];

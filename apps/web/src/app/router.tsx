import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom';
import { Skeleton } from '@/components/ui';
import {
  ChangePasswordPage,
  ForbiddenPage,
  LoginPage,
  NotFoundPage,
  ProtectedRoute,
  RegisterPage,
  RequireAccess,
  type Permission,
} from '@/features/auth';
import { AppLayout } from '@/layouts/AppLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { NAV_GROUPS } from '@/layouts/nav-items';
import { PlaceholderPage } from '@/layouts/PlaceholderPage';

// Trang trong /app lazy load để giảm dung lượng tải ban đầu. Trang đăng nhập nạp sẵn.
const DashboardPage = lazy(() =>
  import('@/features/overview').then((m) => ({ default: m.DashboardPage })),
);
const ProfilePage = lazy(() =>
  import('@/features/employees').then((m) => ({ default: m.ProfilePage })),
);
const EmployeeDirectoryPage = lazy(() =>
  import('@/features/employees').then((m) => ({ default: m.EmployeeDirectoryPage })),
);
const EmployeeDetailPage = lazy(() =>
  import('@/features/employees').then((m) => ({ default: m.EmployeeDetailPage })),
);
const DepartmentListPage = lazy(() =>
  import('@/features/departments').then((m) => ({ default: m.DepartmentListPage })),
);
const DepartmentDetailPage = lazy(() =>
  import('@/features/departments').then((m) => ({ default: m.DepartmentDetailPage })),
);
const WorkspacePage = lazy(() =>
  import('@/features/workspace').then((m) => ({ default: m.WorkspacePage })),
);

function page(element: ReactNode) {
  return <Suspense fallback={<Skeleton className="h-40 w-full" />}>{element}</Suspense>;
}

/** Vào thẳng URL không có quyền → /app/403. */
function guarded(permission: Permission | undefined, route: RouteObject): RouteObject {
  if (!permission) return route;
  return { element: <RequireAccess permission={permission} />, children: [route] };
}

const toChildPath = (to: string) => to.replace(/^\/app\/?/, '');

// Module chưa làm tới: route + mục menu có sẵn, hiện "Tính năng đang được xây dựng" (ADR 008).
const unfinishedPages: { path: string; title: string; permission?: Permission }[] = [
  ...NAV_GROUPS.flatMap((group) => group.items)
    .filter((item) => !item.ready)
    .map((item) => ({
      path: toChildPath(item.to),
      title: item.label,
      permission: item.permission,
    })),
  { path: 'workspace/:dashboardId', title: 'Board phòng ban' },
  { path: 'projects/:id', title: 'Chi tiết dự án' },
  { path: 'payroll/:periodId', title: 'Chi tiết kỳ lương', permission: 'payroll.manage' },
  { path: 'notifications', title: 'Thông báo' },
];

const appRoutes: RouteObject[] = [
  { index: true, element: page(<DashboardPage />) },
  { path: 'profile', element: page(<ProfilePage />) },
  { path: 'change-password', element: <ChangePasswordPage /> },
  guarded('employees.view', { path: 'employees', element: page(<EmployeeDirectoryPage />) }),
  guarded('employees.view', { path: 'employees/:id', element: page(<EmployeeDetailPage />) }),
  { path: 'departments', element: page(<DepartmentListPage />) },
  { path: 'departments/:id', element: page(<DepartmentDetailPage />) },
  { path: 'workspace', element: page(<WorkspacePage />) },
  ...unfinishedPages.map(({ path, title, permission }) =>
    guarded(permission, { path, element: <PlaceholderPage title={title} /> }),
  ),
  { path: '403', element: <ForbiddenPage /> },
  { path: '*', element: <NotFoundPage /> },
];

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/app" replace /> },
  { path: '/login', element: <Navigate to="/auth/login" replace /> },
  {
    path: '/auth',
    element: <AuthLayout />,
    children: [
      { index: true, element: <Navigate to="login" replace /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
    ],
  },
  {
    path: '/app',
    element: <ProtectedRoute />,
    children: [{ element: <AppLayout />, children: appRoutes }],
  },
  { path: '*', element: <Navigate to="/app" replace /> },
]);

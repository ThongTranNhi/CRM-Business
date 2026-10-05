import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { EmptyState, Skeleton } from '@/components/ui';
import { ChangePasswordPage, LoginPage, RegisterPage, ProtectedRoute } from '@/features/auth';
import { AppLayout } from '@/layouts/AppLayout';
import { AuthLayout } from '@/layouts/AuthLayout';

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

function page(element: ReactNode) {
  return <Suspense fallback={<Skeleton className="h-40 w-full" />}>{element}</Suspense>;
}

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
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: page(<DashboardPage />) },
          { path: 'profile', element: page(<ProfilePage />) },
          { path: 'employees', element: page(<EmployeeDirectoryPage />) },
          { path: 'employees/:id', element: page(<EmployeeDetailPage />) },
          { path: 'change-password', element: <ChangePasswordPage /> },
          {
            path: '*',
            element: (
              <EmptyState
                icon="search"
                title="Không tìm thấy trang"
                description="Trang này không tồn tại hoặc chưa được xây dựng."
              />
            ),
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/app" replace /> },
]);

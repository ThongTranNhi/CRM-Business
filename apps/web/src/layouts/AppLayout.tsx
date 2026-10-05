import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Button } from '@/components/ui';
import { signOut, useCurrentUser } from '@/features/auth';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: user } = useCurrentUser();

  if (user?.mustChangePassword) return <ForcedPasswordChangeLayout />;
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-sidebar">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="mx-auto max-w-screen-2xl p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/** Đang dùng mật khẩu tạm: chỉ có form đổi mật khẩu và [Đăng xuất] (frontend-spec 4.1). */
function ForcedPasswordChangeLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex h-header items-center justify-between border-b border-gray-200 bg-white px-4 lg:px-6">
        <span className="font-semibold text-gray-900">CRM Business</span>
        <Button variant="secondary" size="sm" onClick={() => void signOut()}>
          Đăng xuất
        </Button>
      </header>
      <main className="p-4 lg:p-6">
        <Outlet />
      </main>
    </div>
  );
}

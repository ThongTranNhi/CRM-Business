import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

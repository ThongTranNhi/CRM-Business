import { Icon } from '@/components/ui';
import { NotificationBell } from '@/features/notifications/bell';
import { HeaderSearch } from '@/features/search';
import { QuickCreateMenu } from './QuickCreateMenu';
import { UserMenu } from './UserMenu';

interface HeaderProps {
  onMenuClick: () => void;
}

/** Header (frontend-spec 3.2): tìm kiếm · + Tạo nhanh · chuông thông báo · menu tài khoản. */
export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex h-header items-center gap-2 border-b border-gray-200 bg-white px-4 lg:gap-3 lg:px-6">
      <button
        aria-label="Mở menu"
        onClick={onMenuClick}
        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
      >
        <Icon name="menu" />
      </button>
      <div className="min-w-0 flex-1">
        <HeaderSearch />
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <QuickCreateMenu />
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  );
}

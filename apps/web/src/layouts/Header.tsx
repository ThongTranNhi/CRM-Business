import { Icon } from '@/components/ui';
import { NotificationBell } from '@/features/notifications/bell';
import { UserMenu } from './UserMenu';

interface HeaderProps {
  onMenuClick: () => void;
}

// Ô tìm kiếm và "+ Tạo nhanh" thêm ở Đợt 3 S4 (frontend-spec mục 8).
export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex h-header items-center gap-3 border-b border-gray-200 bg-white px-4 lg:px-6">
      <button
        aria-label="Mở menu"
        onClick={onMenuClick}
        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
      >
        <Icon name="menu" />
      </button>
      <div className="ml-auto flex items-center gap-1">
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  );
}

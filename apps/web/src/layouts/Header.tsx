import { Icon } from '@/components/ui';
import { UserMenu } from './UserMenu';

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="sticky top-0 z-10 flex h-header items-center gap-3 border-b border-gray-200 bg-white px-4 lg:px-6">
      <button
        aria-label="Mở menu"
        onClick={onMenuClick}
        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
      >
        <Icon name="menu" />
      </button>

      {/* Tìm kiếm toàn cục: giao diện sẵn, chức năng làm cùng module tìm kiếm */}
      <div className="relative hidden max-w-md flex-1 sm:block">
        <Icon
          name="search"
          size={18}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="search"
          placeholder="Tìm công việc, nhân viên, dự án..."
          aria-label="Tìm kiếm"
          className="h-9 w-full rounded-lg border border-gray-200 bg-gray-50 pl-10 pr-3 text-sm placeholder:text-gray-400 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-100"
        />
      </div>

      <div className="ml-auto flex items-center gap-1">
        <button
          aria-label="Thông báo"
          className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100"
        >
          <Icon name="bell" />
        </button>
        <UserMenu />
      </div>
    </header>
  );
}

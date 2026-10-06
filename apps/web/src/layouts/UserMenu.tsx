import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar, Icon } from '@/components/ui';
import { ROLE_LABELS, signOut, useCurrentUser } from '@/features/auth';

const ITEM_CLASS =
  'flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50';

export function UserMenu() {
  const { data: user } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const displayName = user?.fullName ?? user?.username ?? 'Tài khoản';

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 hover:bg-gray-100"
      >
        <Avatar name={displayName} size="sm" />
        <span className="hidden max-w-[10rem] truncate text-sm font-medium text-gray-700 md:block">
          {displayName}
        </span>
        <Icon name="chevronDown" size={16} className="text-gray-500" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-64 rounded-card border border-gray-200 bg-white py-1 shadow-lg"
        >
          <div className="border-b border-gray-100 px-4 py-2.5">
            <p className="truncate text-sm font-medium text-gray-900">{displayName}</p>
            <p className="truncate text-xs text-gray-500">
              {user ? (user.adminTitle ?? ROLE_LABELS[user.role]) : ''}
              {user?.departmentName ? ` · ${user.departmentName}` : ''}
            </p>
          </div>
          <Link
            to="/app/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className={ITEM_CLASS}
          >
            <Icon name="users" size={16} />
            Hồ sơ của tôi
          </Link>
          {user?.username && (
            <Link
              to="/app/change-password"
              role="menuitem"
              onClick={() => setOpen(false)}
              className={ITEM_CLASS}
            >
              <Icon name="lock" size={16} />
              Đổi mật khẩu
            </Link>
          )}
          <button role="menuitem" onClick={() => void signOut()} className={ITEM_CLASS}>
            <Icon name="logOut" size={16} />
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}

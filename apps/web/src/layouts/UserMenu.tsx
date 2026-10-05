import { useEffect, useRef, useState } from 'react';
import { Avatar, Icon } from '@/components/ui';
import { signOut, useSession } from '@/features/auth';
import { Link } from 'react-router-dom';

export function UserMenu() {
  const { session } = useSession();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const email = session?.user.email ?? '';
  const displayName = (session?.user.user_metadata.full_name as string | undefined) ?? email;

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
        <Icon name="chevronDown" size={16} className="text-gray-400" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 rounded-card border border-gray-200 bg-white py-1 shadow-lg"
        >
          <div className="border-b border-gray-100 px-4 py-2.5">
            <p className="truncate text-sm font-medium text-gray-900">{displayName}</p>
            <p className="truncate text-xs text-gray-500">{email}</p>
          </div>
          <button
            role="menuitem"
            onClick={() => void signOut()}
            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Icon name="logOut" size={16} />
            Đăng xuất
          </button>
          <Link to="/app/profile" role="menuitem" onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Hồ sơ của tôi</Link>
        </div>
      )}
    </div>
  );
}

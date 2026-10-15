import { NavLink } from 'react-router-dom';
import { Icon } from '@/components/ui';
import { useCan } from '@/features/auth';
import { useOverdueCount } from '@/features/my-tasks/badge';
import { cn } from '@/lib/cn';
import { NAV_GROUPS, type NavItem } from './nav-items';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const canDo = useCan();
  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.permission || canDo(item.permission)),
  })).filter((group) => group.items.length > 0);

  return (
    <>
      {open && (
        <button
          aria-label="Đóng menu"
          onClick={onClose}
          className="fixed inset-0 z-20 bg-gray-900/40 lg:hidden"
        />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 flex w-sidebar flex-col border-r border-gray-200 bg-white transition-transform lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-header shrink-0 items-center gap-2.5 border-b border-gray-200 px-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500 text-sm font-bold text-white">
            C
          </span>
          <span className="font-semibold text-gray-900">CRM Business</span>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4" aria-label="Điều hướng chính">
          {groups.map((group) => (
            <div key={group.title}>
              <p className="mb-1.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                {group.title}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.to}>
                    <SidebarLink item={item} onNavigate={onClose} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}

interface SidebarLinkProps {
  item: NavItem;
  onNavigate: () => void;
}

function SidebarLink({ item, onNavigate }: SidebarLinkProps) {
  return (
    <NavLink
      to={item.to}
      end={item.to === '/app'}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-primary-50 text-primary-700'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon name={item.icon} size={18} className={isActive ? 'text-primary-500' : undefined} />
          <span className="truncate">{item.label}</span>
          {item.to === '/app/my-tasks' && <OverdueBadge />}
        </>
      )}
    </NavLink>
  );
}

/** Số việc quá hạn của tôi cạnh "Việc của tôi"; 0 → ẩn. */
function OverdueBadge() {
  const count = useOverdueCount();
  if (count === 0) return null;
  return (
    <span
      aria-label={`${count} việc quá hạn`}
      className="ml-auto rounded-full bg-danger-100 px-2 py-0.5 text-xs font-semibold text-danger-800"
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

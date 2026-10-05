import { NavLink } from 'react-router-dom';
import { Icon } from '@/components/ui';
import { cn } from '@/lib/cn';
import { NAV_GROUPS, type NavItem } from './nav-items';
import { useAccountState } from '@/features/auth';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const account = useAccountState();
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
          {NAV_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="mb-1.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                {group.title}
              </p>
              <ul className="space-y-0.5">
                {group.items
                  .filter((item) => !item.adminOnly || account.data?.role === 'super_admin')
                  .map((item) => (
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

function SidebarLink({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
  const base = 'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium';

  if (!item.ready) {
    return (
      <span className={cn(base, 'cursor-not-allowed text-gray-400')} aria-disabled="true">
        <Icon name={item.icon} size={18} />
        <span className="min-w-0 flex-1 truncate" title={item.label}>
          {item.label}
        </span>
        <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
          Sắp có
        </span>
      </span>
    );
  }

  return (
    <NavLink
      to={item.to}
      end
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          base,
          'transition-colors',
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
        </>
      )}
    </NavLink>
  );
}

import { Link } from 'react-router-dom';
import { AvatarGroup, Badge, Icon } from '@/components/ui';
import type { DashboardCard, DashboardLinkState } from '@/features/department-dashboards';
import { cn } from '@/lib/cn';
import { dashboardAccent } from '../workspace.utils';

const TILE_CLASSES =
  'flex h-full min-h-48 flex-col overflow-hidden rounded-card border bg-white shadow-sm transition';

interface DashboardTileProps {
  card: DashboardCard;
}

/** Cả thẻ là một link vào board; truyền boardId qua state để board tải song song với header (Q1). */
export function DashboardTile({ card }: DashboardTileProps) {
  const state: DashboardLinkState = { boardId: card.boardId };
  return (
    <Link
      to={`/app/workspace/${card.id}`}
      state={state}
      className={cn(
        TILE_CLASSES,
        'border-gray-200 hover:-translate-y-0.5 hover:shadow-md',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300',
      )}
    >
      <span
        aria-hidden="true"
        className={cn('h-1.5 shrink-0', dashboardAccent(card.department.id))}
      />
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-gray-900">{card.name}</h2>
            {card.department.name !== card.name && (
              <p className="truncate text-sm text-gray-500">{card.department.name}</p>
            )}
          </div>
          {card.isReadOnly && <Badge>Chỉ xem</Badge>}
        </div>
        <dl className="grid grid-cols-3 gap-2">
          <TileStat label="Đang mở" value={card.counts.open} />
          <TileStat label="Đang làm" value={card.counts.inProgress} />
          <TileStat label="Quá hạn" value={card.counts.overdue} isAlert={card.counts.overdue > 0} />
        </dl>
        <div className="mt-auto flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-xs text-gray-500">
            {card.manager ? `Trưởng phòng: ${card.manager.fullName}` : 'Chưa có trưởng phòng'}
          </p>
          <AvatarGroup people={card.members.preview} total={card.members.total} />
        </div>
      </div>
    </Link>
  );
}

interface TileStatProps {
  label: string;
  value: number;
  isAlert?: boolean;
}

function TileStat({ label, value, isAlert = false }: TileStatProps) {
  return (
    <div className={cn('rounded-lg px-2.5 py-2', isAlert ? 'bg-danger-50' : 'bg-gray-50')}>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className={cn('text-lg font-semibold', isAlert ? 'text-danger-800' : 'text-gray-900')}>
        {value}
      </dd>
    </div>
  );
}

interface NewDashboardTileProps {
  onClick: () => void;
}

/** Ô cuối lưới, chỉ hiện với người được tạo Dashboard (BR-05). */
export function NewDashboardTile({ onClick }: NewDashboardTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        TILE_CLASSES,
        'w-full items-center justify-center gap-2 border-dashed border-gray-300 text-gray-500 shadow-none',
        'hover:border-primary-500 hover:bg-primary-50 hover:text-primary-800',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300',
      )}
    >
      <Icon name="plus" size={22} />
      <span className="text-sm font-semibold">Tạo Dashboard</span>
      <span className="text-xs">Cho phòng ban chưa có</span>
    </button>
  );
}

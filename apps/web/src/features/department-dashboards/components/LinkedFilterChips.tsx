import { Icon } from '@/components/ui';
import type { PersonRef } from '@/features/departments';
import { TASK_STATUS_LABEL } from '@/features/tasks';
import type { BoardFilters } from '../board.utils';

interface LinkedFilterChipsProps {
  filters: BoardFilters;
  members: PersonRef[];
  onChange: (changes: Partial<BoardFilters>) => void;
}

/**
 * Bộ lọc chỉ đến từ link (Khối lượng việc: `?assignee=&status=`) — không có ô chọn, nên hiện thành nhãn có nút ✕
 * để người xem biết board đang bị lọc và gỡ từng cái.
 */
export function LinkedFilterChips({ filters, members, onChange }: LinkedFilterChipsProps) {
  const assigneeName = members.find((member) => member.id === filters.assignee)?.fullName;
  return (
    <>
      {filters.assignee && (
        <RemovableChip
          label={`Phụ trách: ${assigneeName ?? 'người đã chọn'}`}
          onRemove={() => onChange({ assignee: null })}
        />
      )}
      {filters.status && (
        <RemovableChip
          label={`Trạng thái: ${TASK_STATUS_LABEL[filters.status]}`}
          onRemove={() => onChange({ status: null })}
        />
      )}
    </>
  );
}

interface RemovableChipProps {
  label: string;
  onRemove: () => void;
}

function RemovableChip({ label, onRemove }: RemovableChipProps) {
  return (
    <span className="inline-flex h-9 items-center gap-1 rounded-lg border border-primary-500 bg-primary-50 pl-3 pr-1 text-sm font-medium text-primary-800">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Bỏ lọc ${label}`}
        className="rounded p-1 hover:bg-primary-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
      >
        <Icon name="x" size={14} />
      </button>
    </span>
  );
}

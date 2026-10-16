import { StatCard, type IconName, type StatCardTone } from '@/components/ui';
import type { OverviewCounts } from '../types';

interface TaskCard {
  key: keyof OverviewCounts;
  label: string;
  icon: IconName;
  tone: StatCardTone;
  /** Việc của tôi lọc đúng nhóm của thẻ — số trên thẻ bằng số trên tab (cùng bộ lọc ở API). */
  to: string;
}

const TASK_CARDS: TaskCard[] = [
  {
    key: 'todo',
    label: 'Cần làm',
    icon: 'list',
    tone: 'info',
    to: '/app/my-tasks?tab=open&status=todo',
  },
  {
    key: 'inProgress',
    label: 'Đang làm',
    icon: 'clock',
    tone: 'warning',
    to: '/app/my-tasks?tab=open&status=in_progress',
  },
  {
    key: 'overdue',
    label: 'Quá hạn',
    icon: 'alert',
    tone: 'danger',
    to: '/app/my-tasks?tab=overdue',
  },
  {
    key: 'doneThisWeek',
    label: 'Xong tuần này',
    icon: 'checkSquare',
    tone: 'success',
    to: '/app/my-tasks?tab=done&status=done_week',
  },
];

interface TaskStatCardsProps {
  counts: OverviewCounts;
}

/** 4 thẻ việc của tôi (frontend-spec 4.2): bấm → Việc của tôi đã lọc tương ứng. */
export function TaskStatCards({ counts }: TaskStatCardsProps) {
  return (
    <section aria-label="Việc của tôi" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {TASK_CARDS.map(({ key, ...card }) => (
        <StatCard key={key} value={counts[key]} {...card} />
      ))}
    </section>
  );
}

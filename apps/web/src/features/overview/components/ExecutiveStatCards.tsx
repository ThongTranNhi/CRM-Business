import { StatCard, type IconName, type StatCardTone } from '@/components/ui';
import type { ExecutiveOverview } from '../types';

interface TotalCard {
  key: keyof ExecutiveOverview['totals'];
  label: string;
  icon: IconName;
  tone: StatCardTone;
  to: string;
}

const CARDS: TotalCard[] = [
  { key: 'total', label: 'Tổng việc', icon: 'grid', tone: 'primary', to: '/app/workload' },
  { key: 'todo', label: 'Cần làm', icon: 'list', tone: 'info', to: '/app/workload?sort=todo' },
  {
    key: 'inProgress',
    label: 'Đang làm',
    icon: 'clock',
    tone: 'warning',
    to: '/app/workload?sort=inProgress',
  },
  {
    key: 'done',
    label: 'Hoàn thành',
    icon: 'checkSquare',
    tone: 'success',
    to: '/app/workload?sort=done30d',
  },
  {
    key: 'overdue',
    label: 'Quá hạn',
    icon: 'alert',
    tone: 'danger',
    to: '/app/workload?sort=overdue',
  },
];

interface ExecutiveStatCardsProps {
  totals: ExecutiveOverview['totals'];
}

/** 5 thẻ số việc tạo trong kỳ. Bấm → Khối lượng việc (Đợt 7 đổi sang Báo cáo — chốt 22/10/2026). */
export function ExecutiveStatCards({ totals }: ExecutiveStatCardsProps) {
  return (
    <section aria-label="Số việc trong kỳ" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {CARDS.map(({ key, ...card }) => (
        <StatCard key={key} value={totals[key]} {...card} />
      ))}
    </section>
  );
}

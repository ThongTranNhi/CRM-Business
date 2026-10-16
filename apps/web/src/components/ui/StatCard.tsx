import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from './Icon';

/** Màu ô biểu tượng (chữ tông đậm trên nền nhạt — docs/ui-ux/colors.md). */
export type StatCardTone = 'primary' | 'info' | 'warning' | 'danger' | 'success';

const TONE_CLASSES: Record<StatCardTone, string> = {
  primary: 'bg-primary-50 text-primary-700',
  info: 'bg-info-50 text-info-800',
  warning: 'bg-warning-50 text-warning-800',
  danger: 'bg-danger-50 text-danger-700',
  success: 'bg-success-50 text-success-700',
};

interface StatCardProps {
  label: string;
  value: number;
  icon: IconName;
  tone: StatCardTone;
  /** Bấm thẻ → danh sách chi tiết đã lọc tương ứng. */
  to: string;
}

/** Thẻ một con số bấm được (frontend-spec 3.3). */
export function StatCard({ label, value, icon, tone, to }: StatCardProps) {
  return (
    <Link
      to={to}
      className="flex items-center gap-4 rounded-card border border-gray-200 bg-white p-4 shadow-sm hover:border-primary-300 hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
    >
      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-lg',
          TONE_CLASSES[tone],
        )}
      >
        <Icon name={icon} size={20} />
      </span>
      <span className="min-w-0">
        <span className="block text-2xl font-semibold tabular-nums text-gray-900">{value}</span>
        <span className="block truncate text-sm text-gray-500">{label}</span>
      </span>
    </Link>
  );
}

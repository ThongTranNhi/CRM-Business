import { cn } from '@/lib/cn';

interface ProgressBarProps {
  /** 0 → 100. */
  value: number;
  label: string;
  className?: string;
}

/** Thanh tiến độ mảnh: info khi đang làm, success khi đủ 100% (demo, colors.md). */
export function ProgressBar({ value, label, className }: ProgressBarProps) {
  const percent = Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className={cn('h-1 overflow-hidden rounded-full bg-gray-100', className)}
    >
      <div
        className={cn('h-full rounded-full', percent === 100 ? 'bg-success-500' : 'bg-info-500')}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

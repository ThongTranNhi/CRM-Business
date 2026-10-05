import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type BadgeTone =
  'neutral' | 'primary' | 'accent' | 'info' | 'warning' | 'success' | 'danger';

// Nền tông 100 + chữ tông 800: đạt tương phản AA cho mọi màu (docs/ui-ux/colors.md)
const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: 'bg-gray-100 text-gray-700',
  primary: 'bg-primary-100 text-primary-800',
  accent: 'bg-accent-100 text-accent-800',
  info: 'bg-info-100 text-info-800',
  warning: 'bg-warning-100 text-warning-800',
  success: 'bg-success-100 text-success-800',
  danger: 'bg-danger-100 text-danger-800',
};

interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}

export function Badge({ tone = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

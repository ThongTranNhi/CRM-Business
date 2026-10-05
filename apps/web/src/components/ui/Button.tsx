import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700',
  secondary: 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
  ghost: 'text-gray-600 hover:bg-gray-100',
  // danger-600: chữ trắng đạt chuẩn tương phản (docs/ui-ux/colors.md)
  danger: 'bg-danger-600 text-white hover:bg-danger-700',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
};

/** Class chung cho Button và ButtonLink. */
export function buttonClasses(variant: ButtonVariant, size: ButtonSize): string {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-1',
    'disabled:cursor-not-allowed disabled:opacity-60',
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(buttonClasses(variant, size), className)}
      {...props}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
      )}
      {children}
    </button>
  );
}

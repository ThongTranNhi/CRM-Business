import { useId, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label: string;
  options: SelectOption[];
  /** Dòng đầu với value rỗng, vd. "Chọn sau". */
  placeholder?: string;
  error?: string;
}

export function Select({
  label,
  options,
  placeholder,
  error,
  className,
  id,
  ...props
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const errorId = `${selectId}-error`;

  return (
    <div className="space-y-1.5">
      <label htmlFor={selectId} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <select
        id={selectId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          'block h-10 w-full rounded-lg border bg-white px-3 text-sm text-gray-900',
          'focus:outline-none focus:ring-2',
          error
            ? 'border-danger-500 focus:ring-danger-200'
            : 'border-gray-200 focus:border-primary-500 focus:ring-primary-100',
          className,
        )}
        {...props}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={errorId} className="text-sm text-danger-700">
          {error}
        </p>
      )}
    </div>
  );
}

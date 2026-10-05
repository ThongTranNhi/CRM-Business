import { useId, useState } from 'react';
import { Avatar, Button, SearchInput, Skeleton } from '@/components/ui';
import { useEmployeeOptions } from '../hooks/useDirectory';
import type { EmployeeOption } from '../types';

export interface PickedEmployee {
  id: string;
  fullName: string;
}

interface EmployeePickerProps {
  label: string;
  value: PickedEmployee | null;
  onChange: (value: PickedEmployee | null) => void;
  /** Người không cho chọn (vd. đã là thành viên phòng). */
  excludeIds?: string[];
}

/** Chọn một nhân viên chưa bị xoá; tìm phía server, debounce 300ms. Chỉ Super Admin / HR dùng. */
export function EmployeePicker({ label, value, onChange, excludeIds = [] }: EmployeePickerProps) {
  const labelId = useId();
  const [query, setQuery] = useState('');
  const options = useEmployeeOptions(query, value === null);

  return (
    <div className="space-y-1.5" role="group" aria-labelledby={labelId}>
      <p id={labelId} className="text-sm font-medium text-gray-700">
        {label}
      </p>
      {value ? (
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2">
          <Avatar name={value.fullName} size="sm" />
          <span className="flex-1 truncate text-sm text-gray-900">{value.fullName}</span>
          <Button variant="ghost" size="sm" onClick={() => onChange(null)}>
            Đổi người
          </Button>
        </div>
      ) : (
        <>
          <SearchInput
            value={query}
            onSearch={setQuery}
            label={`Tìm ${label.toLowerCase()}`}
            placeholder="Tìm theo tên, mã nhân viên, username"
          />
          <OptionList
            isLoading={options.isPending}
            isError={options.isError}
            onRetry={() => void options.refetch()}
            items={(options.data ?? []).filter((option) => !excludeIds.includes(option.id))}
            onSelect={(option) => onChange({ id: option.id, fullName: option.fullName })}
          />
        </>
      )}
    </div>
  );
}

interface OptionListProps {
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  items: EmployeeOption[];
  onSelect: (option: EmployeeOption) => void;
}

function OptionList({ isLoading, isError, onRetry, items, onSelect }: OptionListProps) {
  const boxClass = 'rounded-lg border border-gray-200 px-3 py-3 text-sm text-gray-500';
  if (isLoading) return <Skeleton className="h-24 w-full" />;
  if (isError) {
    return (
      <div role="alert" className={boxClass}>
        Không tải được danh sách nhân viên.{' '}
        <button type="button" onClick={onRetry} className="font-medium text-primary-700 underline">
          Thử lại
        </button>
      </div>
    );
  }
  if (items.length === 0) return <p className={boxClass}>Không tìm thấy nhân viên phù hợp.</p>;
  return (
    <ul className="max-h-56 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200">
      {items.map((option) => (
        <li key={option.id}>
          <button
            type="button"
            onClick={() => onSelect(option)}
            className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 focus-visible:bg-primary-50 focus-visible:outline-none"
          >
            <Avatar name={option.fullName} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-gray-900">
                {option.fullName}
              </span>
              <span className="block truncate text-xs text-gray-500">
                {[option.jobTitle, option.departmentName ?? 'Chưa có phòng ban']
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

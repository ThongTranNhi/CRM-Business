import { cn } from '@/lib/cn';

export interface TabItem<T extends string> {
  value: T;
  label: string;
}

interface TabsProps<T extends string> {
  label: string;
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** Tab chọn bộ lọc/khung nhìn; trạng thái nên lưu trên URL (`?tab=`, `?status=`). */
export function Tabs<T extends string>({ label, items, value, onChange }: TabsProps<T>) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 border-b border-gray-200">
      {items.map((item) => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(item.value)}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300',
              selected
                ? 'border-primary-500 text-primary-800'
                : 'border-transparent text-gray-500 hover:text-gray-900',
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';

export interface TableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
  /** Tiêu đề bấm được để sắp xếp (cần `sort` + `onSort` của bảng). */
  sortable?: boolean;
}

export interface TableSort {
  key: string;
  order: 'asc' | 'desc';
}

interface TableProps<T> {
  /** Mô tả bảng cho trình đọc màn hình. */
  caption: string;
  columns: TableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  /** Cột đang sắp xếp; bấm tiêu đề cột `sortable` → `onSort(key)`, nơi gọi quyết định chiều mới. */
  sort?: TableSort;
  onSort?: (key: string) => void;
}

export function Table<T>({ caption, columns, rows, getRowKey, sort, onSort }: TableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-card border border-gray-200 bg-white">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
          <tr>
            {columns.map((column) => (
              <HeaderCell key={column.key} column={column} sort={sort} onSort={onSort} />
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row) => (
            <tr key={getRowKey(row)} className="hover:bg-gray-50">
              {columns.map((column) => (
                <td key={column.key} className={cn('px-4 py-3 text-gray-700', column.className)}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const ARIA_SORT = { asc: 'ascending', desc: 'descending' } as const;

interface HeaderCellProps<T> {
  column: TableColumn<T>;
  sort: TableSort | undefined;
  onSort: ((key: string) => void) | undefined;
}

function HeaderCell<T>({ column, sort, onSort }: HeaderCellProps<T>) {
  const className = cn('px-4 py-3', column.className);
  if (!column.sortable || !onSort) {
    return (
      <th scope="col" className={className}>
        {column.header}
      </th>
    );
  }
  const order = sort?.key === column.key ? sort.order : null;
  return (
    <th scope="col" className={className} aria-sort={order ? ARIA_SORT[order] : 'none'}>
      <button
        type="button"
        onClick={() => onSort(column.key)}
        className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
      >
        {column.header}
        {order && <Icon name={order === 'asc' ? 'chevronUp' : 'chevronDown'} size={14} />}
      </button>
    </th>
  );
}

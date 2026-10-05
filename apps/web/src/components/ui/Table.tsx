import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface TableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

interface TableProps<T> {
  /** Mô tả bảng cho trình đọc màn hình. */
  caption: string;
  columns: TableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
}

export function Table<T>({ caption, columns, rows, getRowKey }: TableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-card border border-gray-200 bg-white">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" className={cn('px-4 py-3', column.className)}>
                {column.header}
              </th>
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

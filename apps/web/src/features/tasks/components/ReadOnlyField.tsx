import type { ReactNode } from 'react';

/** Một thuộc tính chỉ đọc trong drawer chi tiết (nhãn trên, giá trị dưới — cùng bố cục với ô nhập). */
export function ReadOnlyField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-gray-700">{label}</p>
      <div className="text-sm text-gray-900">{children}</div>
    </div>
  );
}

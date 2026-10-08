import type { ReactNode } from 'react';

export interface TimelineItem {
  id: string;
  /** Thời điểm đã định dạng, vd. "15:00 07/10/2026". */
  time: string;
  content: ReactNode;
}

interface TimelineProps {
  items: TimelineItem[];
  label: string;
}

/** Dòng thời gian dọc (lịch sử hoạt động, các bước duyệt): chấm + thời điểm + nội dung. */
export function Timeline({ items, label }: TimelineProps) {
  return (
    <ol aria-label={label} className="space-y-3 border-l border-gray-200 pl-4">
      {items.map((item) => (
        <li key={item.id} className="relative">
          <span
            aria-hidden="true"
            className="absolute -left-[1.3rem] top-1.5 h-2 w-2 rounded-full bg-gray-300 ring-4 ring-white"
          />
          <p className="text-xs text-gray-500">{item.time}</p>
          <div className="text-sm text-gray-800">{item.content}</div>
        </li>
      ))}
    </ol>
  );
}

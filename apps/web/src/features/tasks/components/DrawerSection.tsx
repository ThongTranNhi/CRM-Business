import { useId, type ReactNode } from 'react';
import { Button } from '@/components/ui';

interface DrawerSectionProps {
  title: string;
  /** Bên phải tiêu đề, vd. "2/5". */
  aside?: ReactNode;
  children: ReactNode;
}

/** Một mục của drawer chi tiết (Checklist, Bình luận, Lịch sử). */
export function DrawerSection({ title, aside, children }: DrawerSectionProps) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 id={headingId} className="text-base font-semibold text-gray-900">
          {title}
        </h3>
        {aside && <span className="text-sm text-gray-500">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

/** Lỗi tải một mục: câu ngắn + [Thử lại], không chiếm cả drawer. */
export function SectionError({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="flex items-center gap-3 rounded-lg bg-danger-50 px-3 py-2 text-sm">
      <span className="flex-1 text-danger-800">Không tải được dữ liệu.</span>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        Thử lại
      </Button>
    </div>
  );
}

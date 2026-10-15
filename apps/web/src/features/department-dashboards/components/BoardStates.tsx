import { Icon, Skeleton } from '@/components/ui';

const COLUMN_CLASSES = 'min-w-[280px] flex-1 rounded-card bg-gray-100 p-3';

/** Đang tải: 3 cột với vài thẻ xám cùng kích thước thẻ thật. */
export function BoardSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2" aria-label="Đang tải board">
      {[3, 2, 1].map((cards, column) => (
        <div key={column} className={COLUMN_CLASSES}>
          <Skeleton className="mb-3 h-4 w-32" />
          <div className="grid gap-2">
            {Array.from({ length: cards }, (_, card) => (
              <Skeleton key={card} className="h-24 w-full rounded-lg bg-white" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

interface ReadOnlyBannerProps {
  isDepartmentArchived: boolean;
}

/** Dải "Chỉ xem": HR Admin không phải thành viên, hoặc phòng ban đã xoá (BR-06). */
export function ReadOnlyBanner({ isDepartmentArchived }: ReadOnlyBannerProps) {
  return (
    <p
      role="status"
      className="mb-4 flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700"
    >
      <Icon name="lock" size={16} />
      <span>
        <b className="font-semibold">Chỉ xem.</b>{' '}
        {isDepartmentArchived
          ? 'Phòng ban đã bị xoá nên Dashboard không sửa được.'
          : 'Bạn không phải thành viên của Dashboard này nên không thêm, sửa hay kéo công việc được.'}
      </span>
    </p>
  );
}

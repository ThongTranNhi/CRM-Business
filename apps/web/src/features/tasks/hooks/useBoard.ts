import { useQuery } from '@tanstack/react-query';
import { getBoard } from '../api/tasks.api';
import { taskKeys } from './task-keys';

// Đợt 2 chưa có Realtime: tự tải lại mỗi 30 giây và khi quay lại tab (Đợt 3 thay bằng Realtime).
const REFRESH_MS = 30_000;

interface UseBoardOptions {
  doneLimit: number;
  /** Đang kéo thẻ → tạm dừng tự tải lại để danh sách không nhảy dưới tay người dùng. */
  isPaused: boolean;
}

/** `boardId` null: chưa biết board (mở thẳng URL, chờ header Dashboard). */
export function useBoard(boardId: string | null, { doneLimit, isPaused }: UseBoardOptions) {
  return useQuery({
    queryKey: taskKeys.board(boardId ?? '', doneLimit),
    queryFn: () => getBoard(boardId ?? '', doneLimit),
    enabled: boardId !== null,
    // [Xem thêm] đổi doneLimit: giữ thẻ đang hiện; sang board khác thì không giữ dữ liệu board cũ.
    placeholderData: (previous) => (previous?.boardId === boardId ? previous : undefined),
    refetchInterval: isPaused ? false : REFRESH_MS,
    refetchOnWindowFocus: !isPaused,
  });
}

import { useCallback } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';

/** Drawer được mở từ chính board (có mục lịch sử riêng) → đóng bằng Back để nút Back cũng đóng drawer. */
const openedHereSchema = z.object({ taskDrawer: z.literal(true) });

/**
 * `?task=<id>` mở drawer chi tiết (frontend-spec 1.2): chia sẻ link được, F5 giữ nguyên, nút Back của
 * trình duyệt đóng drawer.
 */
export function useTaskParam() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const taskId = params.get('task');
  const isOpenedHere = openedHereSchema.safeParse(location.state).success;

  const open = useCallback(
    (id: string) =>
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          next.set('task', id);
          return next;
        },
        { state: { taskDrawer: true } },
      ),
    [setParams],
  );

  const close = useCallback(() => {
    if (isOpenedHere) return navigate(-1);
    // Mở thẳng từ link: không có trang trước trong board → bỏ tham số, không thêm lịch sử.
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete('task');
        return next;
      },
      { replace: true },
    );
  }, [isOpenedHere, navigate, setParams]);

  return { taskId, open, close };
}

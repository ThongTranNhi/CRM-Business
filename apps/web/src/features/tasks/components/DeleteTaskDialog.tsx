import type { QueryKey } from '@tanstack/react-query';
import { ConfirmDialog } from '@/components/ui';
import { useArchiveTask } from '../hooks/useArchiveTask';

interface DeleteTaskDialogProps {
  /** Task cần xoá; null = đóng hộp thoại. */
  task: { id: string; title: string } | null;
  boardKey: QueryKey;
  relatedKeys: readonly QueryKey[];
  onClose: () => void;
  /** Sau khi xác nhận xoá (vd. drawer chi tiết tự đóng). */
  onDeleted?: () => void;
}

/** Xác nhận xoá (lưu trữ, BR-19). Đóng ngay khi xác nhận: thẻ biến mất tức thì, toast có [Hoàn tác]. */
export function DeleteTaskDialog({
  task,
  boardKey,
  relatedKeys,
  onClose,
  onDeleted,
}: DeleteTaskDialogProps) {
  const archive = useArchiveTask({ boardKey, relatedKeys });
  return (
    <ConfirmDialog
      open={task !== null}
      title="Xoá công việc"
      description={`Xoá công việc '${task?.title ?? ''}'? Công việc sẽ chuyển vào Thùng rác của board và khôi phục được.`}
      confirmLabel="Xoá công việc"
      tone="danger"
      onConfirm={() => {
        if (task) archive.mutate(task.id);
        onClose();
        onDeleted?.();
      }}
      onClose={onClose}
    />
  );
}

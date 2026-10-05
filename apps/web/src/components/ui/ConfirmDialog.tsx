import type { ReactNode } from 'react';
import { Button } from './Button';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  tone?: 'danger' | 'primary';
  loading?: boolean;
  /** Khoá nút xác nhận khi còn thiếu lựa chọn bắt buộc (vd. phòng nhận). */
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  /** Ô chọn thêm trong hộp thoại (vd. chọn trưởng phòng mới). */
  children?: ReactNode;
}

/** Xác nhận thao tác không hoàn tác được. Không dùng window.confirm. */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  tone = 'danger',
  loading = false,
  confirmDisabled = false,
  onConfirm,
  onClose,
  children,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Huỷ
          </Button>
          <Button variant={tone} loading={loading} disabled={confirmDisabled} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-4 text-sm text-gray-700">
        {description}
        {children}
      </div>
    </Modal>
  );
}

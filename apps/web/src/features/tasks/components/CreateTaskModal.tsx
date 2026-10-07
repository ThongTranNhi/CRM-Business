import { Modal } from '@/components/ui';
import { CreateTaskForm, type CreateTaskFormProps } from './CreateTaskForm';

interface CreateTaskModalProps extends Omit<CreateTaskFormProps, 'onDone'> {
  open: boolean;
  onClose: () => void;
}

/** Modal "Thêm công việc" (demo). Form chỉ render khi mở nên luôn bắt đầu sạch. */
export function CreateTaskModal({ open, onClose, ...formProps }: CreateTaskModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Thêm công việc">
      <CreateTaskForm {...formProps} onDone={onClose} />
    </Modal>
  );
}

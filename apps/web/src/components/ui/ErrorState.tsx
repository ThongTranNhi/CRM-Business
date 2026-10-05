import { Button } from './Button';
import { Icon } from './Icon';

interface ErrorStateProps {
  message?: string;
  onRetry: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div role="alert" className="flex flex-col items-center px-6 py-12 text-center">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger-50 text-danger-700">
        <Icon name="alert" size={24} />
      </span>
      <h3 className="text-base font-semibold text-gray-900">Không tải được dữ liệu</h3>
      <p className="mt-1 max-w-sm text-sm text-gray-500">
        {message ?? 'Đã có lỗi xảy ra, vui lòng thử lại.'}
      </p>
      <Button variant="secondary" className="mt-5" onClick={onRetry}>
        Thử lại
      </Button>
    </div>
  );
}

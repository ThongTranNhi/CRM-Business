import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';

const TOAST_DURATION_MS = 5000;

interface ToastOptions {
  message: string;
  tone?: 'success' | 'error';
  /** Nút trong toast, vd. "Hoàn tác" hoặc "Xem đơn". */
  action?: { label: string; onClick: () => void };
}

interface ToastItem extends ToastOptions {
  id: number;
}

const ToastContext = createContext<(options: ToastOptions) => void>(() => undefined);

let nextToastId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const dismiss = useCallback(
    (id: number) => setToasts((current) => current.filter((toast) => toast.id !== id)),
    [],
  );
  const show = useCallback(
    (options: ToastOptions) => {
      const id = nextToastId++;
      setToasts((current) => [...current, { ...options, id }]);
      setTimeout(() => dismiss(id), TOAST_DURATION_MS);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2"
      >
        {toasts.map((toast) => (
          <ToastMessage key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

interface ToastMessageProps {
  toast: ToastItem;
  onDismiss: () => void;
}

function ToastMessage({ toast, onDismiss }: ToastMessageProps) {
  const isError = toast.tone === 'error';
  return (
    <div
      role={isError ? 'alert' : 'status'}
      className={cn(
        'flex items-center gap-3 rounded-lg border bg-white px-4 py-3 text-sm shadow-lg',
        isError ? 'border-danger-200 text-danger-800' : 'border-success-200 text-gray-800',
      )}
    >
      <Icon name={isError ? 'alert' : 'check'} size={18} className="shrink-0" />
      <p className="flex-1">{toast.message}</p>
      {toast.action && (
        <button
          type="button"
          onClick={() => {
            toast.action?.onClick();
            onDismiss();
          }}
          className="font-semibold text-primary-700 hover:underline"
        >
          {toast.action.label}
        </button>
      )}
      <button
        type="button"
        aria-label="Đóng thông báo"
        onClick={onDismiss}
        className="text-gray-400 hover:text-gray-700"
      >
        <Icon name="x" size={16} />
      </button>
    </div>
  );
}

/** Toast ngắn sau thao tác ghi (frontend-spec 1.2). */
export const useToast = () => useContext(ToastContext);

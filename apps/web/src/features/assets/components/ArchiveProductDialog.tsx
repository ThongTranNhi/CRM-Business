import { ConfirmDialog, useToast } from '@/components/ui';
import { errorMessage } from '@/lib/api-client';
import { useArchiveProduct } from '../hooks/useProducts';
import type { Product } from '../types';

interface ArchiveProductDialogProps {
  product: Product | null;
  onClose: () => void;
}

/** Xoá = lưu trữ: sản phẩm ẩn khỏi danh sách, lịch sử vẫn giữ (không xoá dữ liệu). */
export function ArchiveProductDialog({ product, onClose }: ArchiveProductDialogProps) {
  const toast = useToast();
  const archive = useArchiveProduct();
  return (
    <ConfirmDialog
      open={product !== null}
      title="Xoá sản phẩm"
      description={
        <>
          Xoá <strong>{product?.name}</strong> khỏi danh sách sản phẩm? Lịch sử thay đổi vẫn được
          lưu.
        </>
      }
      confirmLabel="Xoá sản phẩm"
      tone="danger"
      loading={archive.isPending}
      onClose={onClose}
      onConfirm={() => {
        if (!product) return;
        archive.mutate(product.id, {
          onSuccess: () => {
            toast({ message: 'Đã xoá sản phẩm' });
            onClose();
          },
          onError: (error) => toast({ tone: 'error', message: errorMessage(error) }),
        });
      }}
    />
  );
}

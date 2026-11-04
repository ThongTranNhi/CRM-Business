import { ConfirmDialog, useToast } from '@/components/ui';
import { errorMessage } from '@/lib/api-client';
import { useArchiveIssuedAsset } from '../hooks/useIssuedAssets';
import type { IssuedAsset } from '../types';

interface ArchiveIssuedAssetDialogProps {
  asset: IssuedAsset;
  onClose: () => void;
}

/** Xoá = lưu trữ: tài sản ẩn khỏi danh sách, lịch sử cấp vẫn giữ. Tài sản đang cấp phải thu hồi trước. */
export function ArchiveIssuedAssetDialog({ asset, onClose }: ArchiveIssuedAssetDialogProps) {
  const toast = useToast();
  const archive = useArchiveIssuedAsset();
  return (
    <ConfirmDialog
      open
      title="Xoá tài sản"
      description={
        <>
          Xoá <strong>{asset.name}</strong> khỏi danh sách tài sản? Lịch sử cấp / thu hồi vẫn được
          lưu.
        </>
      }
      confirmLabel="Xoá tài sản"
      tone="danger"
      loading={archive.isPending}
      onClose={onClose}
      onConfirm={() =>
        archive.mutate(asset.id, {
          onSuccess: () => {
            toast({ message: 'Đã xoá tài sản' });
            onClose();
          },
          onError: (error) => toast({ tone: 'error', message: errorMessage(error) }),
        })
      }
    />
  );
}

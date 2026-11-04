import { useState } from 'react';
import { ConfirmDialog, Input, Textarea, useToast } from '@/components/ui';
import { errorMessage } from '@/lib/api-client';
import { todayInVietnam } from '@/lib/format-date';
import { useReturnAsset } from '../hooks/useIssuedAssets';
import { holderName } from '../issued-assets.utils';
import type { IssuedAsset } from '../types';

interface ReturnAssetDialogProps {
  asset: IssuedAsset;
  onClose: () => void;
}

/** [Thu hồi]: ghi ngày trả (không trước ngày cấp — server kiểm tra lại), tài sản về Trong kho. */
export function ReturnAssetDialog({ asset, onClose }: ReturnAssetDialogProps) {
  const toast = useToast();
  const returnAsset = useReturnAsset(asset.id);
  const [returnedOn, setReturnedOn] = useState(todayInVietnam);
  const [note, setNote] = useState('');
  const issuedOn = asset.assignment?.issuedOn;
  const dateError =
    issuedOn && returnedOn < issuedOn ? 'Ngày thu hồi không được trước ngày cấp' : '';
  return (
    <ConfirmDialog
      open
      title="Thu hồi tài sản"
      description={
        <>
          Thu hồi <strong>{asset.name}</strong>
          {asset.assignment && <> từ {holderName(asset.assignment.holder)}</>}? Lịch sử cấp vẫn được
          lưu.
        </>
      }
      confirmLabel="Thu hồi"
      tone="primary"
      loading={returnAsset.isPending}
      confirmDisabled={!returnedOn || dateError !== ''}
      onClose={onClose}
      onConfirm={() =>
        returnAsset.mutate(
          { returnedOn, note: note.trim() || null },
          {
            onSuccess: () => {
              toast({ message: `Đã thu hồi ${asset.name}` });
              onClose();
            },
            onError: (error) => toast({ tone: 'error', message: errorMessage(error) }),
          },
        )
      }
    >
      <div className="mt-4 space-y-4">
        <Input
          type="date"
          label="Ngày thu hồi"
          value={returnedOn}
          min={issuedOn}
          error={dateError || undefined}
          onChange={(event) => setReturnedOn(event.target.value)}
        />
        <Textarea
          label="Lý do / ghi chú (tuỳ chọn)"
          value={note}
          maxLength={2000}
          onChange={(event) => setNote(event.target.value)}
        />
      </div>
    </ConfirmDialog>
  );
}

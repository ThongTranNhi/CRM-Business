import { useState } from 'react';
import { Button, Card, EmptyState, ErrorState, Icon, Pagination, Skeleton } from '@/components/ui';
import { useCan } from '@/features/auth';
import { useUrlParams } from '@/lib/use-url-params';
import { useIssuedAssets } from '../hooks/useIssuedAssets';
import { hasIssuedAssetFilters, readIssuedAssetParams } from '../issued-assets.utils';
import type { IssuedAsset } from '../types';
import { ArchiveIssuedAssetDialog } from './ArchiveIssuedAssetDialog';
import { AssetHistoryDrawer } from './AssetHistoryDrawer';
import type { AssetAction } from './IssuedAssetCells';
import { IssuedAssetFilters } from './IssuedAssetFilters';
import { IssuedAssetFormModal } from './IssuedAssetFormModal';
import { IssuedAssetTable } from './IssuedAssetTable';
import { IssueAssetModal } from './IssueAssetModal';
import { ReturnAssetDialog } from './ReturnAssetDialog';

/** Hộp thoại đang mở: thêm mới (`create`) hoặc một thao tác trên một tài sản. */
type OpenDialog = { action: 'create' } | { action: AssetAction; asset: IssuedAsset } | null;

/**
 * Tab Tài sản được cấp: bộ lọc trên URL, bảng, [Thêm tài sản]. Super Admin / HR Admin cấp, thu hồi, sửa, xoá, xem
 * lịch sử; người khác chỉ thấy tài sản đang cấp cho mình, phòng mình hoặc công ty (API lọc).
 */
export function IssuedAssetsTab() {
  const canDo = useCan();
  const [urlParams, updateParams] = useUrlParams();
  const params = readIssuedAssetParams(urlParams);
  const query = useIssuedAssets(params);
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const canManage = canDo('issued-assets.manage');
  const close = () => setDialog(null);
  const openCreate = () => setDialog({ action: 'create' });
  const clearFilters = () =>
    updateParams({ q: null, category: null, status: null, holder: null, page: null });

  function renderBody() {
    if (query.isPending) return <Skeleton className="h-64 w-full" />;
    if (query.isError) {
      return <ErrorState message={query.error.message} onRetry={() => void query.refetch()} />;
    }
    if (query.data.data.length === 0) {
      return (
        <Card>
          {hasIssuedAssetFilters(params) ? (
            <EmptyState
              icon="search"
              title="Không có tài sản phù hợp"
              action={
                <Button variant="secondary" onClick={clearFilters}>
                  Xoá lọc
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon="package"
              title={canManage ? 'Chưa có tài sản nào' : 'Bạn chưa được cấp tài sản nào'}
              description="Phần mềm, thiết bị cấp cho cá nhân, phòng ban hoặc toàn công ty."
              action={canManage && <Button onClick={openCreate}>Thêm tài sản</Button>}
            />
          )}
        </Card>
      );
    }
    return (
      <>
        <IssuedAssetTable
          assets={query.data.data}
          canOpenProfile={canDo('employees.view')}
          onAction={(action, asset) => setDialog({ action, asset })}
        />
        <Pagination {...query.data.meta} onChange={(page) => updateParams({ page })} />
      </>
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <IssuedAssetFilters
            params={params}
            onChange={(changes) => updateParams({ ...changes, page: null })}
          />
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Icon name="plus" size={16} />
            Thêm tài sản
          </Button>
        )}
      </div>
      {renderBody()}
      {dialog && <AssetDialog dialog={dialog} onClose={close} />}
    </>
  );
}

function AssetDialog({
  dialog,
  onClose,
}: {
  dialog: NonNullable<OpenDialog>;
  onClose: () => void;
}) {
  if (dialog.action === 'create') return <IssuedAssetFormModal onClose={onClose} />;
  const { asset } = dialog;
  switch (dialog.action) {
    case 'edit':
      return <IssuedAssetFormModal asset={asset} onClose={onClose} />;
    case 'issue':
      return <IssueAssetModal asset={asset} onClose={onClose} />;
    case 'return':
      return <ReturnAssetDialog asset={asset} onClose={onClose} />;
    case 'archive':
      return <ArchiveIssuedAssetDialog asset={asset} onClose={onClose} />;
    case 'history':
      return <AssetHistoryDrawer asset={asset} onClose={onClose} />;
  }
}

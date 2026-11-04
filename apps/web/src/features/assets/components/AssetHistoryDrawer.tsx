import { EmptyState, ErrorState, Modal, Skeleton, Timeline } from '@/components/ui';
import { formatIsoDate } from '@/lib/format-date';
import { useAssetHistory } from '../hooks/useIssuedAssets';
import { ASSET_HOLDER_LABELS, holderName } from '../issued-assets.utils';
import type { AssetAssignment, IssuedAsset } from '../types';

interface AssetHistoryDrawerProps {
  asset: IssuedAsset;
  onClose: () => void;
}

/** Lịch sử cấp / thu hồi của một tài sản, mới nhất trước (không xoá được). */
export function AssetHistoryDrawer({ asset, onClose }: AssetHistoryDrawerProps) {
  const history = useAssetHistory(asset.id);
  return (
    <Modal open placement="right" onClose={onClose} title={`Lịch sử cấp: ${asset.name}`}>
      {history.isPending ? (
        <Skeleton className="h-48 w-full" />
      ) : history.isError ? (
        <ErrorState message={history.error.message} onRetry={() => void history.refetch()} />
      ) : history.data.length === 0 ? (
        <EmptyState icon="package" title="Tài sản này chưa được cấp lần nào" />
      ) : (
        <Timeline
          label="Lịch sử cấp và thu hồi"
          items={history.data.map((assignment) => ({
            id: assignment.id,
            time: periodOf(assignment),
            content: <AssignmentContent assignment={assignment} />,
          }))}
        />
      )}
    </Modal>
  );
}

const periodOf = ({ issuedOn, returnedOn }: AssetAssignment) =>
  `${formatIsoDate(issuedOn)} → ${returnedOn ? formatIsoDate(returnedOn) : 'nay'}`;

function AssignmentContent({ assignment }: { assignment: AssetAssignment }) {
  const { holder, issuer } = assignment;
  return (
    <div className="space-y-0.5 text-sm">
      <p>
        Cấp cho <strong>{ASSET_HOLDER_LABELS[holder.type].toLowerCase()}</strong>:{' '}
        {holderName(holder)}
      </p>
      <p className="text-gray-600">
        Người cấp: {issuer.isArchived ? `${issuer.fullName} (đã nghỉ)` : issuer.fullName}
      </p>
      {assignment.note && <p className="text-gray-600">Ghi chú: {assignment.note}</p>}
      {assignment.returnedOn ? (
        assignment.returnNote && (
          <p className="text-gray-600">Lý do thu hồi: {assignment.returnNote}</p>
        )
      ) : (
        <p className="font-medium text-info-800">Đang sử dụng</p>
      )}
    </div>
  );
}

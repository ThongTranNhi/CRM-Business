import { Link } from 'react-router-dom';
import { Badge, Button, Icon, type IconName } from '@/components/ui';
import { ASSET_HOLDER_LABELS, holderName } from '../issued-assets.utils';
import type { AssetHolder, IssuedAsset } from '../types';

interface HolderCellProps {
  holder: AssetHolder;
  /** Có quyền xem hồ sơ nhân viên → tên người là link. */
  canOpenProfile: boolean;
}

/** Ô "Đối tượng sử dụng": nhãn loại (Cá nhân / Phòng ban / Công ty) + tên, bấm được khi có trang tương ứng. */
export function HolderCell({ holder, canOpenProfile }: HolderCellProps) {
  const name = holderName(holder);
  return (
    <div className="space-y-0.5">
      <Badge tone="primary">{ASSET_HOLDER_LABELS[holder.type]}</Badge>
      <p>
        {holder.type === 'department' ? (
          <Link to={`/app/departments/${holder.id}`} className="hover:underline">
            {name}
          </Link>
        ) : holder.type === 'employee' && canOpenProfile ? (
          <Link to={`/app/employees/${holder.id}`} className="hover:underline">
            {name}
          </Link>
        ) : (
          name
        )}
      </p>
    </div>
  );
}

/** Thao tác trên một dòng tài sản; chỉ người quản lý (server vẫn kiểm tra lại khi ghi). */
export type AssetAction = 'edit' | 'issue' | 'return' | 'archive' | 'history';

interface IssuedAssetActionsProps {
  asset: IssuedAsset;
  onAction: (action: AssetAction, asset: IssuedAsset) => void;
}

export function IssuedAssetActions({ asset, onAction }: IssuedAssetActionsProps) {
  if (!asset.permissions.canManage) return <span className="text-gray-400">—</span>;
  const isIssued = asset.status === 'issued';
  const button = (action: AssetAction, label: string, icon: IconName) => (
    <Button
      variant="ghost"
      size="sm"
      aria-label={`${label} ${asset.name}`}
      onClick={() => onAction(action, asset)}
    >
      <Icon name={icon} size={16} />
      {label}
    </Button>
  );
  return (
    <div className="flex flex-wrap gap-1">
      {isIssued && button('return', 'Thu hồi', 'restore')}
      {asset.status === 'in_stock' && button('issue', 'Cấp', 'transfer')}
      {button('history', 'Lịch sử', 'clock')}
      {button('edit', 'Sửa', 'edit')}
      {!isIssued && button('archive', 'Xoá', 'trash')}
    </div>
  );
}

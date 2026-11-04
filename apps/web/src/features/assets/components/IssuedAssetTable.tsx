import { Link } from 'react-router-dom';
import { Badge, Table, type TableColumn } from '@/components/ui';
import { formatIsoDate } from '@/lib/format-date';
import { ASSET_CATEGORY_LABELS, ASSET_STATUS_META } from '../issued-assets.utils';
import type { IssuedAsset } from '../types';
import { HolderCell, IssuedAssetActions, type AssetAction } from './IssuedAssetCells';

interface IssuedAssetTableProps {
  assets: IssuedAsset[];
  /** Có quyền xem hồ sơ nhân viên → tên người là link. */
  canOpenProfile: boolean;
  onAction: (action: AssetAction, asset: IssuedAsset) => void;
}

const emptyCell = <span className="text-gray-400">—</span>;

/** Bảng tài sản: tên + mã, loại, trạng thái, đối tượng sử dụng, người cấp, ngày cấp, hết hạn, thao tác. */
export function IssuedAssetTable({ assets, canOpenProfile, onAction }: IssuedAssetTableProps) {
  const columns: TableColumn<IssuedAsset>[] = [
    {
      key: 'name',
      header: 'Tài sản',
      className: 'min-w-44',
      render: (asset) => (
        <div className="min-w-0">
          <p className="font-medium text-gray-900">{asset.name}</p>
          {asset.code && <p className="text-xs text-gray-500">Mã: {asset.code}</p>}
        </div>
      ),
    },
    { key: 'category', header: 'Loại', render: (asset) => ASSET_CATEGORY_LABELS[asset.category] },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (asset) => (
        <Badge tone={ASSET_STATUS_META[asset.status].tone}>
          {ASSET_STATUS_META[asset.status].label}
        </Badge>
      ),
    },
    {
      key: 'holder',
      header: 'Đối tượng sử dụng',
      className: 'min-w-40',
      render: (asset) =>
        asset.assignment ? (
          <HolderCell holder={asset.assignment.holder} canOpenProfile={canOpenProfile} />
        ) : (
          emptyCell
        ),
    },
    {
      key: 'issuer',
      header: 'Người cấp',
      render: ({ assignment }) => {
        if (!assignment) return emptyCell;
        const { issuer } = assignment;
        const label = issuer.isArchived ? `${issuer.fullName} (đã nghỉ)` : issuer.fullName;
        if (!canOpenProfile) return label;
        return (
          <Link to={`/app/employees/${issuer.id}`} className="hover:underline">
            {label}
          </Link>
        );
      },
    },
    {
      key: 'issuedOn',
      header: 'Ngày cấp',
      render: (asset) => (asset.assignment ? formatIsoDate(asset.assignment.issuedOn) : emptyCell),
    },
    {
      key: 'expiresOn',
      header: 'Hết hạn',
      render: (asset) => (asset.expiresOn ? formatIsoDate(asset.expiresOn) : emptyCell),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      render: (asset) => <IssuedAssetActions asset={asset} onAction={onAction} />,
    },
  ];
  return (
    <Table
      caption="Tài sản được cấp"
      columns={columns}
      rows={assets}
      getRowKey={(asset) => asset.id}
    />
  );
}

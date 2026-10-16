import { Link } from 'react-router-dom';
import { Badge, Icon, Table, type TableColumn } from '@/components/ui';
import { displayUrl, PRODUCT_STATUS_META } from '../assets.utils';
import type { Product } from '../types';
import { ProductActions, ResponsiblePeople } from './ProductCells';

interface ProductTableProps {
  products: Product[];
  /** Có quyền xem hồ sơ nhân viên → tên người là link. */
  canOpenProfile: boolean;
  onEdit: (product: Product) => void;
  onArchive: (product: Product) => void;
}

const emptyCell = <span className="text-gray-400">—</span>;

/** Bảng sản phẩm: tên + link (mở tab mới), mô tả, phòng ban, người phụ trách, dự án, trạng thái, thao tác. */
export function ProductTable({ products, canOpenProfile, onEdit, onArchive }: ProductTableProps) {
  const columns: TableColumn<Product>[] = [
    {
      key: 'name',
      header: 'Sản phẩm',
      className: 'min-w-48',
      render: (product) => (
        <div className="min-w-0">
          <p className="font-medium text-gray-900">{product.name}</p>
          {/* noopener noreferrer: trang được mở không điều khiển được tab CRM. */}
          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex max-w-xs items-center gap-1 text-xs text-primary-700 hover:underline"
          >
            <Icon name="link" size={12} className="shrink-0" />
            <span className="truncate">{displayUrl(product.url)}</span>
          </a>
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Mô tả',
      className: 'min-w-56 max-w-sm',
      render: (product) =>
        product.description ? (
          <p className="line-clamp-2 whitespace-pre-line" title={product.description}>
            {product.description}
          </p>
        ) : (
          emptyCell
        ),
    },
    {
      key: 'department',
      header: 'Phòng ban',
      render: (product) => (
        <Link to={`/app/departments/${product.department.id}`} className="hover:underline">
          {product.department.name}
        </Link>
      ),
    },
    {
      key: 'people',
      header: 'Người phụ trách',
      className: 'min-w-44',
      render: (product) => <ResponsiblePeople product={product} canOpenProfile={canOpenProfile} />,
    },
    {
      key: 'project',
      header: 'Dự án',
      render: (product) =>
        product.project ? (
          <Link to={`/app/projects/${product.project.id}`} className="hover:underline">
            {product.project.name}
          </Link>
        ) : (
          emptyCell
        ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (product) => (
        <Badge tone={PRODUCT_STATUS_META[product.status].tone}>
          {PRODUCT_STATUS_META[product.status].label}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      render: (product) => (
        <ProductActions product={product} onEdit={onEdit} onArchive={onArchive} />
      ),
    },
  ];
  return (
    <Table
      caption="Sản phẩm công ty"
      columns={columns}
      rows={products}
      getRowKey={(product) => product.id}
    />
  );
}

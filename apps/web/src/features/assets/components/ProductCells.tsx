import { Link } from 'react-router-dom';
import { Badge, Button, Icon } from '@/components/ui';
import type { Product, ProductPerson } from '../types';

interface ResponsiblePeopleProps {
  product: Product;
  /** Có quyền xem hồ sơ nhân viên → tên là link. */
  canOpenProfile: boolean;
}

/** Ô "Người phụ trách": người chính (nhãn Chính) + người cùng phụ trách. */
export function ResponsiblePeople({ product, canOpenProfile }: ResponsiblePeopleProps) {
  return (
    <div className="space-y-0.5">
      <p className="flex flex-wrap items-center gap-1.5">
        <PersonName person={product.owner} canOpenProfile={canOpenProfile} />
        <Badge tone="primary">Chính</Badge>
      </p>
      {product.members.length > 0 && (
        <p className="text-xs text-gray-500">
          Cùng phụ trách:{' '}
          {product.members.map((member, index) => (
            <span key={member.id}>
              {index > 0 && ', '}
              <PersonName person={member} canOpenProfile={canOpenProfile} />
            </span>
          ))}
        </p>
      )}
    </div>
  );
}

interface PersonNameProps {
  person: ProductPerson;
  canOpenProfile: boolean;
}

function PersonName({ person, canOpenProfile }: PersonNameProps) {
  const label = person.isArchived ? `${person.fullName} (đã nghỉ)` : person.fullName;
  if (!canOpenProfile) return <span>{label}</span>;
  return (
    <Link to={`/app/employees/${person.id}`} className="hover:underline">
      {label}
    </Link>
  );
}

interface ProductActionsProps {
  product: Product;
  onEdit: (product: Product) => void;
  onArchive: (product: Product) => void;
}

/** Nút theo quyền của từng sản phẩm (server tính `permissions`, server vẫn kiểm tra lại khi ghi). */
export function ProductActions({ product, onEdit, onArchive }: ProductActionsProps) {
  const { canEditContent, canArchive } = product.permissions;
  if (!canEditContent && !canArchive) return <span className="text-gray-400">—</span>;
  return (
    <div className="flex gap-1">
      {canEditContent && (
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Sửa ${product.name}`}
          onClick={() => onEdit(product)}
        >
          <Icon name="edit" size={16} />
          Sửa
        </Button>
      )}
      {canArchive && (
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Xoá ${product.name}`}
          onClick={() => onArchive(product)}
        >
          <Icon name="trash" size={16} />
          Xoá
        </Button>
      )}
    </div>
  );
}

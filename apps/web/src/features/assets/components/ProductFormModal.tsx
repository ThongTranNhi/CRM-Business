import { useState, type FormEvent } from 'react';
import { Button, ErrorState, Modal, ModalActions, Skeleton } from '@/components/ui';
import { useCurrentUser } from '@/features/auth';
import { productFormOf } from '../assets.utils';
import { useProductFormOptions } from '../hooks/useProducts';
import { useSubmitProduct } from '../hooks/useSubmitProduct';
import type { ProductFormErrors } from '../schemas/product.schema';
import type { Product } from '../types';
import { ProductFormFields } from './ProductFormFields';

interface ProductFormModalProps {
  onClose: () => void;
  /** Có: sửa sản phẩm này (không đổi phòng ban). Không: thêm mới. */
  product?: Product;
}

/**
 * Thêm / sửa sản phẩm. Chờ tải xong người dùng rồi mới dựng form (phòng của Trưởng phòng chọn sẵn đúng ngay từ
 * đầu — tránh lỗi ô phòng ban khoá mà trống như P-05 của form dự án).
 */
export function ProductFormModal({ onClose, product }: ProductFormModalProps) {
  const user = useCurrentUser();
  return (
    <Modal open onClose={onClose} title={product ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}>
      {user.isError ? (
        <ErrorState onRetry={() => void user.refetch()} />
      ) : !user.data ? (
        <Skeleton className="h-64" />
      ) : (
        <ProductFormBody
          product={product}
          departmentId={
            user.data.role === 'super_admin' ? '' : (user.data.managedDepartmentId ?? '')
          }
          onClose={onClose}
        />
      )}
    </Modal>
  );
}

interface ProductFormBodyProps {
  product: Product | undefined;
  departmentId: string;
  onClose: () => void;
}

function ProductFormBody({ product, departmentId, onClose }: ProductFormBodyProps) {
  const [form, setForm] = useState(() => productFormOf(product, departmentId));
  const [errors, setErrors] = useState<ProductFormErrors>({});
  const canEditAll = product ? product.permissions.canEdit : true;
  const options = useProductFormOptions(form.departmentId, canEditAll);
  const { submit, isPending } = useSubmitProduct(product, onClose);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrors(await submit(form));
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <ProductFormFields
        form={form}
        errors={errors}
        isEditing={Boolean(product)}
        canEditAll={canEditAll}
        options={options}
        onChange={(changes) => setForm((current) => ({ ...current, ...changes }))}
      />
      <ModalActions>
        <Button variant="secondary" onClick={onClose}>
          Huỷ
        </Button>
        <Button type="submit" loading={isPending}>
          {product ? 'Lưu thay đổi' : 'Thêm sản phẩm'}
        </Button>
      </ModalActions>
    </form>
  );
}

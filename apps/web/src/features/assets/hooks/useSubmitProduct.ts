import { z } from 'zod';
import { useToast } from '@/components/ui';
import { ApiError, errorMessage } from '@/lib/api-client';
import { productChanges, productInputOf } from '../assets.utils';
import {
  productFormSchema,
  type ProductForm,
  type ProductFormErrors,
} from '../schemas/product.schema';
import type { Product } from '../types';
import { useCreateProduct, useUpdateProduct } from './useProducts';

/** Lỗi API hiện dưới đúng ô (docs/api/endpoints/assets.md). */
const FIELD_OF_ERROR: Partial<Record<string, keyof ProductForm>> = {
  PRODUCT_NAME_EXISTS: 'name',
  PRODUCT_PERSON_NOT_FOUND: 'ownerEmployeeId',
  PROJECT_NOT_IN_DEPARTMENT: 'projectId',
  PROJECT_NOT_FOUND: 'projectId',
  DEPARTMENT_NOT_FOUND: 'departmentId',
};

/**
 * Validate (zod) rồi tạo / sửa. Trả lỗi theo ô; thành công → toast + `onDone()`; lỗi không gắn được ô nào → toast,
 * giữ nguyên dữ liệu đã nhập.
 */
export function useSubmitProduct(product: Product | undefined, onDone: () => void) {
  const toast = useToast();
  const create = useCreateProduct();
  const update = useUpdateProduct(product?.id ?? '');

  async function save(form: ProductForm) {
    const input = productInputOf(form);
    if (!product) {
      await create.mutateAsync({ ...input, departmentId: form.departmentId });
      return;
    }
    const changes = productChanges(product, input);
    if (Object.keys(changes).length > 0) await update.mutateAsync(changes);
  }

  async function submit(form: ProductForm): Promise<ProductFormErrors> {
    const parsed = productFormSchema.safeParse(form);
    if (!parsed.success) {
      const fields = z.flattenError(parsed.error).fieldErrors;
      return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, value?.[0]]));
    }
    try {
      await save(parsed.data);
      toast({ message: product ? 'Đã cập nhật sản phẩm' : 'Đã thêm sản phẩm' });
      onDone();
      return {};
    } catch (error) {
      const field = error instanceof ApiError ? FIELD_OF_ERROR[error.code] : undefined;
      if (field) return { [field]: errorMessage(error) };
      toast({ tone: 'error', message: errorMessage(error) });
      return {};
    }
  }

  return { submit, isPending: create.isPending || update.isPending };
}

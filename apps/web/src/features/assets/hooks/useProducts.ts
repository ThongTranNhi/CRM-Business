import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { useInvalidateQueries } from '@/lib/use-invalidate-queries';
import {
  archiveProduct,
  createProduct,
  getProductFormOptions,
  listProducts,
  updateProduct,
} from '../api/products.api';
import type { ProductInput, ProductParams } from '../types';

export const productKeys = {
  all: ['products'] as const,
  list: (params: ProductParams) => [...productKeys.all, 'list', params] as const,
  formOptions: (departmentId: string) =>
    [...productKeys.all, 'form-options', departmentId] as const,
};

export function useProducts(params: ProductParams) {
  return useQuery({
    queryKey: productKeys.list(params),
    queryFn: () => listProducts(params),
    placeholderData: keepPreviousData,
  });
}

/** Người (mọi phòng) + dự án của phòng cho form; chỉ tải khi đã có phòng và người dùng được sửa đủ trường. */
export function useProductFormOptions(departmentId: string, enabled: boolean) {
  return useQuery({
    queryKey: productKeys.formOptions(departmentId),
    queryFn: () => getProductFormOptions(departmentId),
    enabled: enabled && departmentId !== '',
  });
}

export function useCreateProduct() {
  const invalidate = useInvalidateQueries([productKeys.all]);
  return useMutation({ mutationFn: createProduct, onSuccess: invalidate });
}

export function useUpdateProduct(id: string) {
  const invalidate = useInvalidateQueries([productKeys.all]);
  return useMutation({
    mutationFn: (changes: Partial<ProductInput>) => updateProduct(id, changes),
    onSuccess: invalidate,
  });
}

export function useArchiveProduct() {
  const invalidate = useInvalidateQueries([productKeys.all]);
  return useMutation({ mutationFn: archiveProduct, onSuccess: invalidate });
}

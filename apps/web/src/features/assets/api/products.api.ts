import { apiPage, apiRequest, withQuery } from '@/lib/api-client';
import type { Product, ProductFormOptions, ProductInput, ProductParams } from '../types';

export const PRODUCT_PAGE_SIZE = 20;

export const listProducts = ({ page, ...filters }: ProductParams) =>
  apiPage<Product>(
    withQuery('/api/assets/products', { ...filters, page, pageSize: PRODUCT_PAGE_SIZE }),
  );

export const getProductFormOptions = (departmentId: string) =>
  apiRequest<ProductFormOptions>(withQuery('/api/assets/products/form-options', { departmentId }));

export const createProduct = (input: ProductInput & { departmentId: string }) =>
  apiRequest<Product>('/api/assets/products', { method: 'POST', body: JSON.stringify(input) });

export const updateProduct = (id: string, changes: Partial<ProductInput>) =>
  apiRequest<Product>(`/api/assets/products/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(changes),
  });

export const archiveProduct = (id: string) =>
  apiRequest<void>(`/api/assets/products/${id}`, { method: 'DELETE' });

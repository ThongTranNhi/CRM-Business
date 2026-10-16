import { Hono } from 'hono';
import type { AppEnv } from '../../lib/app-env';
import {
  archiveProduct,
  createProduct,
  listProducts,
  productFormOptions,
  updateProduct,
} from './assets.controller';

/**
 * /api/assets — trang Tài sản. Tab Sản phẩm: mọi role xem; thêm / sửa / xoá theo lib/product-access.ts (kiểm tra ở
 * service vì phụ thuộc phòng của sản phẩm). Tab Tài sản được cấp thêm sau.
 */
export const assetRoutes = new Hono<AppEnv>();
assetRoutes.get('/products', listProducts);
assetRoutes.post('/products', createProduct);
// Đặt trước '/products/:id' để 'form-options' không bị hiểu là id.
assetRoutes.get('/products/form-options', productFormOptions);
assetRoutes.patch('/products/:id', updateProduct);
assetRoutes.delete('/products/:id', archiveProduct);

import { Hono } from 'hono';
import type { AppEnv } from '../../lib/app-env';
import {
  archiveProduct,
  createProduct,
  listProducts,
  productFormOptions,
  updateProduct,
} from './assets.controller';
import {
  archiveIssuedAsset,
  assetHistory,
  createIssuedAsset,
  issueAsset,
  issueFormOptions,
  listIssuedAssets,
  returnAsset,
  updateIssuedAsset,
} from './assets.issued.controller';

/**
 * /api/assets — trang Tài sản. Tab Sản phẩm: mọi role xem; thêm / sửa / xoá theo lib/product-access.ts (kiểm tra ở
 * service vì phụ thuộc phòng của sản phẩm). Tab Tài sản được cấp: lib/issued-asset-access.ts — mọi role xem trong
 * phạm vi của mình, Super Admin / HR Admin ghi (service và RPC đều kiểm tra).
 */
export const assetRoutes = new Hono<AppEnv>();
assetRoutes.get('/products', listProducts);
assetRoutes.post('/products', createProduct);
// Đặt trước '/products/:id' để 'form-options' không bị hiểu là id.
assetRoutes.get('/products/form-options', productFormOptions);
assetRoutes.patch('/products/:id', updateProduct);
assetRoutes.delete('/products/:id', archiveProduct);

assetRoutes.get('/issued', listIssuedAssets);
assetRoutes.post('/issued', createIssuedAsset);
assetRoutes.get('/issued/form-options', issueFormOptions);
assetRoutes.patch('/issued/:id', updateIssuedAsset);
assetRoutes.delete('/issued/:id', archiveIssuedAsset);
assetRoutes.get('/issued/:id/history', assetHistory);
assetRoutes.post('/issued/:id/issue', issueAsset);
assetRoutes.post('/issued/:id/return', returnAsset);

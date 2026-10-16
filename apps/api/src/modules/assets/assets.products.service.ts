import { forbidden } from '../../lib/app-error';
import { toPage } from '../../lib/pagination';
import {
  canManageProducts,
  productPermissions,
  type ProductViewer,
} from '../../lib/product-access';
import type { RequestScope } from '../../lib/request-scope';
import { getEmployeeSummary } from '../auth/auth.service';
import { listProjectOptions } from '../projects/projects.service';
import { listPeopleOptions } from '../users/users.service';
import { productNotFound } from './assets.errors';
import * as productsRepository from './assets.products.repository';
import type { CreateProductInput, ListProductsQuery, UpdateProductInput } from './assets.schema';
import type { Product, ProductFormOptions, ProductRecord } from './assets.types';

// Tab Sản phẩm của /app/assets. Quyền: lib/product-access.ts. RPC kiểm tra lại toàn vẹn dữ liệu: phòng còn hoạt
// động, người phụ trách còn làm việc, dự án cùng phòng, tên không trùng, link http(s).

/** Trường người phụ trách (chính / cùng phụ trách) được sửa; trường khác cần quyền quản lý. */
const CONTENT_FIELDS = new Set<keyof UpdateProductInput>(['url', 'description']);

async function viewerOf({ env, actor }: RequestScope): Promise<ProductViewer> {
  const employee = await getEmployeeSummary(env, actor.id);
  return {
    role: actor.role,
    employeeId: employee?.employeeId ?? null,
    managedDepartmentId: employee?.managedDepartmentId ?? null,
  };
}

const withPermissions = (viewer: ProductViewer, product: ProductRecord): Product => ({
  ...product,
  permissions: productPermissions(viewer, {
    departmentId: product.department.id,
    ownerEmployeeId: product.owner.id,
    memberIds: product.members.map((member) => member.id),
  }),
});

/** Mọi người xem mọi sản phẩm (chưa xoá, phòng chưa xoá) — `{ data, meta: { page, pageSize, total } }`. */
export async function listProducts(scope: RequestScope, query: ListProductsQuery) {
  const [{ rows, total }, viewer] = await Promise.all([
    productsRepository.listProducts(scope.env, query),
    viewerOf(scope),
  ]);
  return toPage(
    rows.map((row) => withPermissions(viewer, row)),
    total,
    { page: query.page, pageSize: query.pageSize },
  );
}

async function loadProduct(scope: RequestScope, productId: string) {
  const [product, viewer] = await Promise.all([
    productsRepository.findProduct(scope.env, productId),
    viewerOf(scope),
  ]);
  if (!product) throw productNotFound();
  return withPermissions(viewer, product);
}

/** Người + dự án cho form của một phòng; chỉ người quản lý sản phẩm phòng đó. */
export async function getFormOptions(
  scope: RequestScope,
  departmentId: string,
): Promise<ProductFormOptions> {
  if (!canManageProducts(await viewerOf(scope), departmentId)) throw forbidden();
  const [people, projects] = await Promise.all([
    listPeopleOptions(scope.env),
    listProjectOptions(scope.env, departmentId),
  ]);
  return { people, projects };
}

export async function createProduct(scope: RequestScope, input: CreateProductInput) {
  if (!canManageProducts(await viewerOf(scope), input.departmentId)) throw forbidden();
  const productId = await productsRepository.createProduct(scope.env, scope.actor.id, input);
  return loadProduct(scope, productId);
}

/** Người phụ trách chỉ gửi được link / mô tả; gửi trường khác mà không có quyền quản lý → 403. */
export async function updateProduct(
  scope: RequestScope,
  productId: string,
  input: UpdateProductInput,
) {
  const { permissions } = await loadProduct(scope, productId);
  const keys = Object.keys(input) as (keyof UpdateProductInput)[];
  const isContentOnly = keys.every((key) => CONTENT_FIELDS.has(key));
  if (!(isContentOnly ? permissions.canEditContent : permissions.canEdit)) throw forbidden();
  await productsRepository.updateProduct(scope.env, scope.actor.id, productId, input);
  return loadProduct(scope, productId);
}

export async function archiveProduct(scope: RequestScope, productId: string) {
  const { permissions } = await loadProduct(scope, productId);
  if (!permissions.canArchive) throw forbidden();
  await productsRepository.archiveProduct(scope.env, scope.actor.id, productId);
}

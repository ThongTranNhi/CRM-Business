import type { Env } from '../../config/env';
import { rangeParams } from '../../lib/pagination';
import { callRpc, supabaseList, supabaseRequest } from '../../lib/supabase';
import { PRODUCT_ERRORS } from './assets.errors';
import type { CreateProductInput, ListProductsQuery, UpdateProductInput } from './assets.schema';
import type { ProductRecord, ProductStatus } from './assets.types';

/** Một dòng view product_summaries (migration 20261018090000). */
interface ProductSummaryRow {
  id: string;
  department_id: string;
  department_name: string;
  project_id: string | null;
  project_name: string | null;
  name: string;
  url: string;
  description: string | null;
  status: ProductStatus;
  updated_at: string;
  owner_employee_id: string;
  owner_name: string;
  owner_archived: boolean;
  members: { id: string; name: string; isArchived: boolean }[];
}
const PRODUCT_SELECT =
  'id,department_id,department_name,project_id,project_name,name,url,description,status,updated_at,' +
  'owner_employee_id,owner_name,owner_archived,members';

const toRecord = (row: ProductSummaryRow): ProductRecord => ({
  id: row.id,
  name: row.name,
  url: row.url,
  description: row.description,
  status: row.status,
  department: { id: row.department_id, name: row.department_name },
  project:
    row.project_id && row.project_name ? { id: row.project_id, name: row.project_name } : null,
  owner: { id: row.owner_employee_id, fullName: row.owner_name, isArchived: row.owner_archived },
  members: row.members.map((member) => ({
    id: member.id,
    fullName: member.name,
    isArchived: member.isArchived,
  })),
  updatedAt: row.updated_at,
});

/** Chỉ sản phẩm chưa lưu trữ, thuộc phòng chưa xoá (như Workspace — phòng đã xoá không còn hiện). */
const visibleFilters = () => ({ archived_at: 'is.null', department_archived_at: 'is.null' });

export async function listProducts(env: Env, query: ListProductsQuery) {
  const params = new URLSearchParams({
    select: PRODUCT_SELECT,
    ...visibleFilters(),
    order: 'name,id',
    ...rangeParams(query),
  });
  if (query.q) params.set('name', `ilike.*${query.q}*`);
  if (query.departmentId) params.set('department_id', `eq.${query.departmentId}`);
  if (query.status) params.set('status', `eq.${query.status}`);
  const { rows, total } = await supabaseList<ProductSummaryRow>(
    env,
    `/rest/v1/product_summaries?${params}`,
  );
  return { rows: rows.map(toRecord), total };
}

export async function findProduct(env: Env, productId: string): Promise<ProductRecord | null> {
  const params = new URLSearchParams({
    select: PRODUCT_SELECT,
    id: `eq.${productId}`,
    ...visibleFilters(),
    limit: '1',
  });
  const rows = await supabaseRequest<ProductSummaryRow[]>(
    env,
    `/rest/v1/product_summaries?${params}`,
  );
  return rows[0] ? toRecord(rows[0]) : null;
}

// ---------- Ghi: mỗi thao tác một RPC (ghi audit cùng giao dịch) ----------

export const createProduct = (env: Env, actorId: string, input: CreateProductInput) =>
  callRpc<string>(env, {
    name: 'crm_create_product',
    args: {
      actor_uuid: actorId,
      department_uuid: input.departmentId,
      product_name: input.name,
      product_url: input.url,
      product_description: input.description,
      product_status: input.status,
      owner_uuid: input.ownerEmployeeId,
      project_uuid: input.projectId,
      member_uuids: input.memberIds,
    },
    errors: PRODUCT_ERRORS,
  });

/** `changes` giữ nguyên khoá có mặt: RPC chỉ đổi những khoá đó. */
export const updateProduct = (
  env: Env,
  actorId: string,
  productId: string,
  changes: UpdateProductInput,
) =>
  callRpc(env, {
    name: 'crm_update_product',
    args: { actor_uuid: actorId, product_uuid: productId, changes },
    errors: PRODUCT_ERRORS,
  });

export const archiveProduct = (env: Env, actorId: string, productId: string) =>
  callRpc(env, {
    name: 'crm_archive_product',
    args: { actor_uuid: actorId, product_uuid: productId },
    errors: PRODUCT_ERRORS,
  });

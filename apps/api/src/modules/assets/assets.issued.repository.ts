import type { Env } from '../../config/env';
import type { IssuedAssetScope } from '../../lib/issued-asset-access';
import { rangeParams } from '../../lib/pagination';
import { callRpc, supabaseList, supabaseRequest } from '../../lib/supabase';
import { ISSUED_ASSET_ERRORS } from './assets.errors';
import type {
  CreateIssuedAssetInput,
  IssueAssetInput,
  ListIssuedAssetsQuery,
  ReturnAssetInput,
  UpdateIssuedAssetInput,
} from './assets.issued.schema';
import type {
  AssetAssignment,
  AssetHolder,
  AssetHolderType,
  AssetPerson,
  IssuedAssetCategory,
  IssuedAssetRecord,
  IssuedAssetStatus,
} from './assets.issued.types';

/** Cột đối tượng + người cấp, cùng tên ở view issued_asset_summaries và asset_assignment_rows. */
interface HolderColumns {
  holder_type: AssetHolderType;
  employee_id: string | null;
  employee_name: string | null;
  employee_archived: boolean | null;
  department_id: string | null;
  department_name: string | null;
  issuer_employee_id: string;
  issuer_name: string;
  issuer_archived: boolean;
}
const HOLDER_SELECT =
  'holder_type,employee_id,employee_name,employee_archived,department_id,department_name,' +
  'issuer_employee_id,issuer_name,issuer_archived';

/** Một dòng view asset_assignment_rows (migration 20261103090000). */
interface AssignmentRow extends HolderColumns {
  id: string;
  issued_on: string;
  note: string | null;
  returned_on: string | null;
  return_note: string | null;
}
const ASSIGNMENT_SELECT = `id,${HOLDER_SELECT},issued_on,note,returned_on,return_note`;

/** Một dòng view issued_asset_summaries: tài sản + lượt cấp đang mở (cột lượt cấp null khi chưa cấp). */
type AssetSummaryRow = {
  id: string;
  code: string | null;
  name: string;
  category: IssuedAssetCategory;
  status: IssuedAssetStatus;
  expires_on: string | null;
  note: string | null;
  updated_at: string;
} & (
  | { assignment_id: null }
  | ({ assignment_id: string; issued_on: string; issue_note: string | null } & HolderColumns)
);
const ASSET_SELECT =
  `id,code,name,category,status,expires_on,note,updated_at,assignment_id,${HOLDER_SELECT},` +
  'issued_on,issue_note';

function toHolder(row: HolderColumns): AssetHolder {
  if (row.holder_type === 'employee') {
    return {
      type: 'employee',
      id: row.employee_id ?? '',
      fullName: row.employee_name ?? '',
      isArchived: row.employee_archived ?? false,
    };
  }
  if (row.holder_type === 'department') {
    return { type: 'department', id: row.department_id ?? '', name: row.department_name ?? '' };
  }
  return { type: 'company' };
}

const toIssuer = (row: HolderColumns): AssetPerson => ({
  id: row.issuer_employee_id,
  fullName: row.issuer_name,
  isArchived: row.issuer_archived,
});

const toAssignment = (row: AssignmentRow): AssetAssignment => ({
  id: row.id,
  holder: toHolder(row),
  issuer: toIssuer(row),
  issuedOn: row.issued_on,
  note: row.note,
  returnedOn: row.returned_on,
  returnNote: row.return_note,
});

const toRecord = (row: AssetSummaryRow): IssuedAssetRecord => ({
  id: row.id,
  code: row.code,
  name: row.name,
  category: row.category,
  status: row.status,
  expiresOn: row.expires_on,
  note: row.note,
  updatedAt: row.updated_at,
  assignment:
    row.assignment_id === null
      ? null
      : {
          id: row.assignment_id,
          holder: toHolder(row),
          issuer: toIssuer(row),
          issuedOn: row.issued_on,
          note: row.issue_note,
        },
});

/**
 * Bộ lọc PostgREST: tìm theo tên / mã và phạm vi người xem. Mỗi nhóm là một `or(...)`, ghép bằng `and=(...)`.
 * `q` đã bỏ ký tự đặc biệt của cú pháp lọc (searchSchema) nên đặt thẳng vào được.
 */
function filterGroups(query: ListIssuedAssetsQuery, scope: IssuedAssetScope): string[] {
  const groups: string[] = [];
  if (query.q) groups.push(`or(name.ilike.*${query.q}*,code.ilike.*${query.q}*)`);
  if (scope.kind === 'holder') {
    const holders = ['holder_type.eq.company'];
    if (scope.departmentId) {
      holders.push(`and(holder_type.eq.department,department_id.eq.${scope.departmentId})`);
    }
    if (scope.employeeId) {
      holders.push(`and(holder_type.eq.employee,employee_id.eq.${scope.employeeId})`);
    }
    groups.push(`or(${holders.join(',')})`);
  }
  return groups;
}

export async function listIssuedAssets(
  env: Env,
  query: ListIssuedAssetsQuery,
  scope: IssuedAssetScope,
) {
  const params = new URLSearchParams({
    select: ASSET_SELECT,
    archived_at: 'is.null',
    order: 'name,id',
    ...rangeParams(query),
  });
  const groups = filterGroups(query, scope);
  if (groups.length > 0) params.set('and', `(${groups.join(',')})`);
  if (query.category) params.set('category', `eq.${query.category}`);
  if (query.status) params.set('status', `eq.${query.status}`);
  if (query.holderType) params.set('holder_type', `eq.${query.holderType}`);
  const { rows, total } = await supabaseList<AssetSummaryRow>(
    env,
    `/rest/v1/issued_asset_summaries?${params}`,
  );
  return { rows: rows.map(toRecord), total };
}

export async function findIssuedAsset(
  env: Env,
  assetId: string,
): Promise<IssuedAssetRecord | null> {
  const params = new URLSearchParams({
    select: ASSET_SELECT,
    id: `eq.${assetId}`,
    archived_at: 'is.null',
    limit: '1',
  });
  const rows = await supabaseRequest<AssetSummaryRow[]>(
    env,
    `/rest/v1/issued_asset_summaries?${params}`,
  );
  return rows[0] ? toRecord(rows[0]) : null;
}

/** Lịch sử cấp / thu hồi, mới nhất trước (một tài sản ít lượt — giới hạn 200 cho chắc). */
export async function listAssignments(env: Env, assetId: string): Promise<AssetAssignment[]> {
  const params = new URLSearchParams({
    select: ASSIGNMENT_SELECT,
    asset_id: `eq.${assetId}`,
    order: 'issued_on.desc,created_at.desc',
    limit: '200',
  });
  const rows = await supabaseRequest<AssignmentRow[]>(
    env,
    `/rest/v1/asset_assignment_rows?${params}`,
  );
  return rows.map(toAssignment);
}

// ---------- Ghi: mỗi thao tác một RPC (ghi audit cùng giao dịch) ----------

export const createIssuedAsset = (env: Env, actorId: string, input: CreateIssuedAssetInput) =>
  callRpc<string>(env, {
    name: 'crm_create_issued_asset',
    args: {
      actor_uuid: actorId,
      asset_code: input.code,
      asset_name: input.name,
      asset_category: input.category,
      asset_status: input.status,
      asset_expires_on: input.expiresOn,
      asset_note: input.note,
      assignment: input.assignment,
    },
    errors: ISSUED_ASSET_ERRORS,
  });

export interface AssetWrite<T> {
  actorId: string;
  assetId: string;
  input: T;
}

/** `changes` giữ nguyên khoá có mặt: RPC chỉ đổi những khoá đó. */
export const updateIssuedAsset = (
  env: Env,
  { actorId, assetId, input }: AssetWrite<UpdateIssuedAssetInput>,
) =>
  callRpc(env, {
    name: 'crm_update_issued_asset',
    args: { actor_uuid: actorId, asset_uuid: assetId, changes: input },
    errors: ISSUED_ASSET_ERRORS,
  });

export const archiveIssuedAsset = (env: Env, actorId: string, assetId: string) =>
  callRpc(env, {
    name: 'crm_archive_issued_asset',
    args: { actor_uuid: actorId, asset_uuid: assetId },
    errors: ISSUED_ASSET_ERRORS,
  });

export const issueAsset = (env: Env, { actorId, assetId, input }: AssetWrite<IssueAssetInput>) =>
  callRpc<string>(env, {
    name: 'crm_issue_asset',
    args: { actor_uuid: actorId, asset_uuid: assetId, assignment: input },
    errors: ISSUED_ASSET_ERRORS,
  });

export const returnAsset = (env: Env, { actorId, assetId, input }: AssetWrite<ReturnAssetInput>) =>
  callRpc(env, {
    name: 'crm_return_asset',
    args: {
      actor_uuid: actorId,
      asset_uuid: assetId,
      return_date: input.returnedOn,
      return_reason: input.note,
    },
    errors: ISSUED_ASSET_ERRORS,
  });

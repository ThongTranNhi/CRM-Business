import { forbidden } from '../../lib/app-error';
import { canManageIssuedAssets, issuedAssetScope } from '../../lib/issued-asset-access';
import { toPage } from '../../lib/pagination';
import type { RequestScope } from '../../lib/request-scope';
import { getEmployeeSummary } from '../auth/auth.service';
import { listPeopleOptions } from '../users/users.service';
import { assetNotFound } from './assets.errors';
import * as issuedRepository from './assets.issued.repository';
import type {
  CreateIssuedAssetInput,
  IssueAssetInput,
  ListIssuedAssetsQuery,
  ReturnAssetInput,
  UpdateIssuedAssetInput,
} from './assets.issued.schema';
import type { AssetAssignment, IssuedAsset, IssueFormOptions } from './assets.issued.types';

// Tab Tài sản được cấp của /app/assets. Quyền: lib/issued-asset-access.ts. RPC kiểm tra lại role (Super Admin /
// HR Admin) và toàn vẹn dữ liệu: chỉ cấp tài sản Trong kho, đối tượng / người cấp còn hoạt động, ngày trả hợp lệ.

function assertManager(scope: RequestScope): void {
  if (!canManageIssuedAssets(scope.actor.role)) throw forbidden();
}

/** Người quản lý xem mọi tài sản; người khác chỉ tài sản đang cấp cho mình, phòng mình hoặc công ty. */
export async function listIssuedAssets(scope: RequestScope, query: ListIssuedAssetsQuery) {
  const employee = await getEmployeeSummary(scope.env, scope.actor.id);
  const viewerScope = issuedAssetScope({
    role: scope.actor.role,
    employeeId: employee?.employeeId ?? null,
    departmentId: employee?.departmentId ?? null,
  });
  const { rows, total } = await issuedRepository.listIssuedAssets(scope.env, query, viewerScope);
  const permissions = { canManage: canManageIssuedAssets(scope.actor.role) };
  return toPage(
    rows.map((row) => ({ ...row, permissions })),
    total,
    { page: query.page, pageSize: query.pageSize },
  );
}

/** Đọc lại sau khi ghi — chỉ người quản lý gọi tới nên luôn có quyền quản lý. */
async function loadAsset(scope: RequestScope, assetId: string): Promise<IssuedAsset> {
  const asset = await issuedRepository.findIssuedAsset(scope.env, assetId);
  if (!asset) throw assetNotFound();
  return { ...asset, permissions: { canManage: true } };
}

export async function getIssueFormOptions(scope: RequestScope): Promise<IssueFormOptions> {
  assertManager(scope);
  return { people: await listPeopleOptions(scope.env) };
}

/** Lịch sử cấp / thu hồi của một tài sản (người quản lý). */
export async function listAssetHistory(
  scope: RequestScope,
  assetId: string,
): Promise<AssetAssignment[]> {
  assertManager(scope);
  await loadAsset(scope, assetId);
  return issuedRepository.listAssignments(scope.env, assetId);
}

export async function createIssuedAsset(scope: RequestScope, input: CreateIssuedAssetInput) {
  assertManager(scope);
  const assetId = await issuedRepository.createIssuedAsset(scope.env, scope.actor.id, input);
  return loadAsset(scope, assetId);
}

export async function updateIssuedAsset(
  scope: RequestScope,
  assetId: string,
  input: UpdateIssuedAssetInput,
) {
  assertManager(scope);
  await issuedRepository.updateIssuedAsset(scope.env, { actorId: scope.actor.id, assetId, input });
  return loadAsset(scope, assetId);
}

export async function archiveIssuedAsset(scope: RequestScope, assetId: string) {
  assertManager(scope);
  await issuedRepository.archiveIssuedAsset(scope.env, scope.actor.id, assetId);
}

export async function issueAsset(scope: RequestScope, assetId: string, input: IssueAssetInput) {
  assertManager(scope);
  await issuedRepository.issueAsset(scope.env, { actorId: scope.actor.id, assetId, input });
  return loadAsset(scope, assetId);
}

export async function returnAsset(scope: RequestScope, assetId: string, input: ReturnAssetInput) {
  assertManager(scope);
  await issuedRepository.returnAsset(scope.env, { actorId: scope.actor.id, assetId, input });
  return loadAsset(scope, assetId);
}

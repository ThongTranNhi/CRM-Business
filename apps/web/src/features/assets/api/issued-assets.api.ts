import { apiPage, apiRequest, withQuery } from '@/lib/api-client';
import type {
  AssetAssignment,
  IssueAssetInput,
  IssuedAsset,
  IssuedAssetInput,
  IssuedAssetParams,
  IssueFormOptions,
  ReturnAssetInput,
} from '../types';

const BASE = '/api/assets/issued';
export const ISSUED_ASSET_PAGE_SIZE = 20;

export const listIssuedAssets = ({ page, ...filters }: IssuedAssetParams) =>
  apiPage<IssuedAsset>(withQuery(BASE, { ...filters, page, pageSize: ISSUED_ASSET_PAGE_SIZE }));

export const getIssueFormOptions = () => apiRequest<IssueFormOptions>(`${BASE}/form-options`);

export const getAssetHistory = (id: string) =>
  apiRequest<AssetAssignment[]>(`${BASE}/${id}/history`);

/** `assignment` khác null → cấp luôn cho đối tượng đó khi thêm. */
export const createIssuedAsset = (
  input: IssuedAssetInput & { assignment: IssueAssetInput | null },
) => apiRequest<IssuedAsset>(BASE, { method: 'POST', body: JSON.stringify(input) });

export const updateIssuedAsset = (id: string, changes: Partial<IssuedAssetInput>) =>
  apiRequest<IssuedAsset>(`${BASE}/${id}`, { method: 'PATCH', body: JSON.stringify(changes) });

export const archiveIssuedAsset = (id: string) =>
  apiRequest<void>(`${BASE}/${id}`, { method: 'DELETE' });

export const issueAsset = (id: string, input: IssueAssetInput) =>
  apiRequest<IssuedAsset>(`${BASE}/${id}/issue`, { method: 'POST', body: JSON.stringify(input) });

export const returnAsset = (id: string, input: ReturnAssetInput) =>
  apiRequest<IssuedAsset>(`${BASE}/${id}/return`, { method: 'POST', body: JSON.stringify(input) });

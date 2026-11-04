import { describe, expect, it } from 'vitest';
import {
  holderName,
  issuedAssetChanges,
  issuedAssetInputOf,
  issuedAssetFormOf,
  issueInputOf,
  readIssuedAssetParams,
} from './issued-assets.utils';
import type { IssuedAsset } from './types';

const asset = (overrides: Partial<IssuedAsset> = {}): IssuedAsset => ({
  id: 'a-1',
  code: 'LT-01',
  name: 'Laptop Dell',
  category: 'laptop',
  status: 'in_stock',
  expiresOn: null,
  note: null,
  updatedAt: '2026-11-03T00:00:00Z',
  assignment: null,
  permissions: { canManage: true },
  ...overrides,
});

const issueForm = {
  employeeId: 'e-1',
  departmentId: 'd-1',
  issuerEmployeeId: 'e-boss',
  issuedOn: '2026-11-03',
  note: '',
};

describe('issued asset filters', () => {
  it('reads valid filters and drops unknown values', () => {
    const params = new URLSearchParams('q=dell&category=laptop&status=bogus&holder=company&page=2');
    expect(readIssuedAssetParams(params)).toEqual({
      q: 'dell',
      category: 'laptop',
      status: '',
      holderType: 'company',
      page: 2,
    });
  });
});

describe('issued asset form', () => {
  it('sends only changed fields', () => {
    const current = asset();
    const input = issuedAssetInputOf({
      ...issuedAssetFormOf(current),
      name: 'Laptop HP',
      code: '',
    });
    expect(issuedAssetChanges(current, input)).toEqual({ name: 'Laptop HP', code: null });
  });

  it('never sends status for an asset that is currently issued', () => {
    const current = asset({ status: 'issued' });
    const input = issuedAssetInputOf({ ...issuedAssetFormOf(current), status: 'repair' });
    expect(issuedAssetChanges(current, input)).toEqual({});
  });
});

describe('issue form', () => {
  it('sends only the id that matches the holder type', () => {
    expect(issueInputOf({ ...issueForm, holderType: 'employee' })).toEqual({
      holderType: 'employee',
      employeeId: 'e-1',
      issuerEmployeeId: 'e-boss',
      issuedOn: '2026-11-03',
      note: null,
    });
    expect(issueInputOf({ ...issueForm, holderType: 'department' })).not.toHaveProperty(
      'employeeId',
    );
    expect(issueInputOf({ ...issueForm, holderType: 'company' })).toEqual({
      holderType: 'company',
      issuerEmployeeId: 'e-boss',
      issuedOn: '2026-11-03',
      note: null,
    });
  });

  it('names the holder', () => {
    expect(holderName({ type: 'company' })).toBe('Toàn công ty');
    expect(holderName({ type: 'department', id: 'd', name: 'Kế toán' })).toBe('Kế toán');
    expect(holderName({ type: 'employee', id: 'e', fullName: 'An', isArchived: true })).toBe(
      'An (đã nghỉ)',
    );
  });
});

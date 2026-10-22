import { describe, expect, it } from 'vitest';
import {
  displayUrl,
  hasProductFilters,
  productChanges,
  productFormOf,
  productInputOf,
  readProductParams,
} from './assets.utils';
import type { Product } from './types';

const product = (facts: Partial<Product> = {}): Product => ({
  id: 'p-1',
  name: 'Web bán hàng',
  url: 'https://shop.example.test/',
  description: null,
  status: 'active',
  kind: 'company',
  department: { id: 'd-1', name: 'Kinh doanh' },
  project: null,
  owner: { id: 'e-owner', fullName: 'Chủ', isArchived: false },
  members: [
    { id: 'e-a', fullName: 'A', isArchived: false },
    { id: 'e-b', fullName: 'B', isArchived: false },
  ],
  updatedAt: '2026-10-17T00:00:00Z',
  permissions: { canEdit: false, canEditContent: true, canArchive: false },
  ...facts,
});

describe('readProductParams', () => {
  it('reads filters and ignores bad values', () => {
    const params = readProductParams(new URLSearchParams('q=web&status=deleted&kind=x&page=0'));
    expect(params).toEqual({ q: 'web', departmentId: '', status: '', kind: '', page: 1 });
    expect(hasProductFilters(params)).toBe(true);
    const partner = readProductParams(new URLSearchParams('kind=partner'));
    expect(partner.kind).toBe('partner');
    expect(hasProductFilters(partner)).toBe(true);
    expect(hasProductFilters(readProductParams(new URLSearchParams()))).toBe(false);
  });
});

describe('displayUrl', () => {
  it('drops the scheme and the trailing slash', () => {
    expect(displayUrl('https://shop.example.test/')).toBe('shop.example.test');
    expect(displayUrl('http://a.test/b')).toBe('a.test/b');
  });
});

describe('productChanges', () => {
  it('sends nothing when the form is unchanged (member order does not matter)', () => {
    const form = productFormOf(product(), '');
    const input = productInputOf({ ...form, memberIds: ['e-b', 'e-a'] });
    expect(productChanges(product(), input)).toEqual({});
  });

  it('content-only editor sends just the link / description', () => {
    const form = productFormOf(product(), '');
    const input = productInputOf({ ...form, url: 'https://new.test', description: 'Mới' });
    expect(productChanges(product(), input)).toEqual({
      url: 'https://new.test',
      description: 'Mới',
    });
  });

  it('changing only the kind sends just the kind', () => {
    const input = productInputOf({ ...productFormOf(product(), ''), kind: 'partner' });
    expect(productChanges(product(), input)).toEqual({ kind: 'partner' });
  });

  it('empty description and project become null', () => {
    const current = product({ description: 'Cũ', project: { id: 'pr-1', name: 'Dự án' } });
    const form = productFormOf(current, '');
    const input = productInputOf({ ...form, description: '', projectId: '' });
    expect(productChanges(current, input)).toEqual({ description: null, projectId: null });
  });
});

describe('productFormOf', () => {
  it('starts a new product in the given department', () => {
    expect(productFormOf(undefined, 'd-9')).toMatchObject({
      departmentId: 'd-9',
      status: 'developing',
      kind: 'company',
      memberIds: [],
    });
  });
});

import assert from 'node:assert/strict';
import { URL } from 'node:url';
import test from 'node:test';
import { loadTsModule } from './load-ts-module.mjs';

const access = await loadTsModule(new URL('./product-access.ts', import.meta.url));

const viewer = (role, facts = {}) => ({
  role,
  employeeId: 'e-viewer',
  managedDepartmentId: null,
  ...facts,
});
const product = (facts = {}) => ({
  departmentId: 'dept-a',
  ownerEmployeeId: 'e-owner',
  memberIds: [],
  ...facts,
});
const NONE = { canEdit: false, canEditContent: false, canArchive: false };
const ALL = { canEdit: true, canEditContent: true, canArchive: true };

test('product permissions (Tài sản → Sản phẩm)', async (t) => {
  await t.test('Super Admin manages every product', () => {
    assert.deepEqual(access.productPermissions(viewer('super_admin'), product()), ALL);
    assert.equal(access.canManageProducts(viewer('super_admin'), 'dept-x'), true);
  });

  await t.test('department manager manages only the department they lead', () => {
    const manager = viewer('department_manager', { managedDepartmentId: 'dept-a' });
    assert.deepEqual(access.productPermissions(manager, product()), ALL);
    assert.deepEqual(access.productPermissions(manager, product({ departmentId: 'dept-b' })), NONE);
    assert.equal(access.canManageProducts(manager, 'dept-b'), false);
  });

  await t.test('manager role without a department to lead manages nothing', () => {
    const manager = viewer('department_manager');
    assert.deepEqual(access.productPermissions(manager, product()), NONE);
  });

  await t.test('owner and co-responsible people edit link and description only', () => {
    const owner = viewer('employee', { employeeId: 'e-owner' });
    const member = viewer('team_leader', { employeeId: 'e-member' });
    const contentOnly = { canEdit: false, canEditContent: true, canArchive: false };
    assert.deepEqual(access.productPermissions(owner, product()), contentOnly);
    assert.deepEqual(
      access.productPermissions(member, product({ memberIds: ['e-member'] })),
      contentOnly,
    );
  });

  await t.test('HR Admin and other employees only view', () => {
    assert.deepEqual(access.productPermissions(viewer('hr_admin'), product()), NONE);
    assert.deepEqual(access.productPermissions(viewer('employee'), product()), NONE);
    assert.equal(access.canManageProducts(viewer('hr_admin'), 'dept-a'), false);
  });

  await t.test('account without employee profile is never "responsible"', () => {
    const noProfile = viewer('employee', { employeeId: null });
    assert.deepEqual(access.productPermissions(noProfile, product({ memberIds: [] })), NONE);
  });
});

import assert from 'node:assert/strict';
import { URL } from 'node:url';
import test from 'node:test';
import { loadTsModule } from './load-ts-module.mjs';

const access = await loadTsModule(new URL('./issued-asset-access.ts', import.meta.url));

const viewer = (role, facts = {}) => ({
  role,
  employeeId: 'e-viewer',
  departmentId: 'dept-a',
  ...facts,
});

test('issued asset permissions (Tài sản → Tài sản được cấp)', async (t) => {
  await t.test('Super Admin and HR Admin manage and see everything', () => {
    for (const role of ['super_admin', 'hr_admin']) {
      assert.equal(access.canManageIssuedAssets(role), true);
      assert.deepEqual(access.issuedAssetScope(viewer(role)), { kind: 'all' });
    }
  });

  await t.test(
    'other roles only see assets held by themselves, their department or the company',
    () => {
      for (const role of ['department_manager', 'team_leader', 'employee']) {
        assert.equal(access.canManageIssuedAssets(role), false);
        assert.deepEqual(access.issuedAssetScope(viewer(role)), {
          kind: 'holder',
          employeeId: 'e-viewer',
          departmentId: 'dept-a',
        });
      }
    },
  );

  await t.test('a viewer without employee record or department keeps null ids', () => {
    assert.deepEqual(
      access.issuedAssetScope(viewer('employee', { employeeId: null, departmentId: null })),
      { kind: 'holder', employeeId: null, departmentId: null },
    );
  });
});

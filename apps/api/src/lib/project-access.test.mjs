import assert from 'node:assert/strict';
import { URL } from 'node:url';
import test from 'node:test';
import { loadTsModule } from './load-ts-module.mjs';

const access = await loadTsModule(new URL('./project-access.ts', import.meta.url));

const viewer = (role, facts = {}) => ({
  role,
  employeeId: 'e-viewer',
  departmentId: null,
  managedDepartmentId: null,
  ...facts,
});
const project = (facts = {}) => ({
  departmentId: 'dept-a',
  ownerEmployeeId: 'e-owner',
  isMember: false,
  isReadOnly: false,
  ...facts,
});

test('project permissions (Đợt 3 S1)', async (t) => {
  await t.test('Super Admin does everything on every project', () => {
    assert.deepEqual(access.projectPermissions(viewer('super_admin'), project()), {
      canView: true,
      canEdit: true,
      canManageMembers: true,
      canArchive: true,
    });
    assert.equal(access.canCreateProject(viewer('super_admin'), 'dept-x'), true);
  });
  await t.test('HR Admin sees every project but only reads', () => {
    assert.deepEqual(access.projectPermissions(viewer('hr_admin'), project()), {
      canView: true,
      canEdit: false,
      canManageMembers: false,
      canArchive: false,
    });
    assert.equal(access.canCreateProject(viewer('hr_admin'), 'dept-a'), false);
  });
  await t.test('manager creates / archives only in the department they manage', () => {
    const manager = viewer('department_manager', {
      departmentId: 'dept-a',
      managedDepartmentId: 'dept-a',
    });
    assert.equal(access.canCreateProject(manager, 'dept-a'), true);
    assert.equal(access.canCreateProject(manager, 'dept-b'), false);
    assert.equal(access.projectPermissions(manager, project()).canArchive, true);
    const other = project({ departmentId: 'dept-b' });
    assert.equal(access.projectPermissions(manager, other).canView, false);
  });
  await t.test('owner edits and manages members but cannot archive', () => {
    const owner = viewer('employee', { employeeId: 'e-owner', departmentId: 'dept-a' });
    assert.deepEqual(access.projectPermissions(owner, project()), {
      canView: true,
      canEdit: true,
      canManageMembers: true,
      canArchive: false,
    });
  });
  await t.test('employees see their department projects and projects they join', () => {
    const member = viewer('employee', { departmentId: 'dept-a' });
    assert.equal(access.projectPermissions(member, project()).canView, true);
    assert.equal(access.projectPermissions(member, project()).canEdit, false);
    const outsider = viewer('employee', { departmentId: 'dept-b' });
    assert.equal(access.projectPermissions(outsider, project()).canView, false);
    assert.equal(access.projectPermissions(outsider, project({ isMember: true })).canView, true);
  });
  await t.test('archived department makes the project read-only for everyone', () => {
    const permissions = access.projectPermissions(
      viewer('super_admin'),
      project({ isReadOnly: true }),
    );
    assert.equal(permissions.canView, true);
    assert.equal(permissions.canEdit, false);
    assert.equal(permissions.canArchive, false);
  });
});

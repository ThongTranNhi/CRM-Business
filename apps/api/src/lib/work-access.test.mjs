import assert from 'node:assert/strict';
import { URL } from 'node:url';
import test from 'node:test';
import { loadTsModule } from './load-ts-module.mjs';

const access = await loadTsModule(new URL('./work-access.ts', import.meta.url));

const viewer = (role, facts = {}) => ({
  role,
  isReadOnly: false,
  isDepartmentMember: false,
  isDepartmentManager: false,
  isBoardMember: false,
  ...facts,
});
const relation = (facts = {}) => ({
  isAssignee: false,
  isCollaborator: false,
  isCreator: false,
  ...facts,
});

test('work permissions (permission-model.md)', async (t) => {
  await t.test('Super Admin sees and edits every board', () => {
    assert.deepEqual(access.boardPermissions(viewer('super_admin')), {
      canView: true,
      canWrite: true,
      canEditAllTasks: true,
    });
  });
  await t.test('HR Admin only reads unless invited to the board (Q3)', () => {
    assert.deepEqual(access.boardPermissions(viewer('hr_admin')), {
      canView: true,
      canWrite: false,
      canEditAllTasks: false,
    });
    const invited = viewer('hr_admin', { isBoardMember: true });
    assert.equal(access.boardPermissions(invited).canWrite, true);
    assert.equal(access.taskPermissions(invited, relation()).canEdit, false);
    assert.equal(access.taskPermissions(invited, relation({ isAssignee: true })).canEdit, true);
  });
  await t.test('HR Admin works on the HR department board like any member', () => {
    const hrStaff = viewer('hr_admin', { isDepartmentMember: true });
    assert.deepEqual(access.boardPermissions(hrStaff), {
      canView: true,
      canWrite: true,
      canEditAllTasks: false,
    });
    assert.equal(access.taskPermissions(hrStaff, relation({ isAssignee: true })).canEdit, true);
    assert.equal(access.taskPermissions(hrStaff, relation({ isCreator: true })).canArchive, true);
  });
  await t.test('manager role without being the department manager is a plain member (Q1)', () => {
    const roleOnly = viewer('department_manager', { isDepartmentMember: true });
    assert.equal(access.boardPermissions(roleOnly).canEditAllTasks, false);
    assert.equal(access.taskPermissions(roleOnly, relation()).canArchive, false);
    const manager = viewer('department_manager', {
      isDepartmentMember: true,
      isDepartmentManager: true,
    });
    assert.equal(access.boardPermissions(manager).canEditAllTasks, true);
    assert.equal(access.taskPermissions(manager, relation()).canArchive, true);
  });
  await t.test('outsiders cannot see the board', () => {
    assert.equal(access.boardPermissions(viewer('employee')).canView, false);
    assert.equal(access.boardPermissions(viewer('department_manager')).canView, false);
  });
  await t.test('team leader edits every task of their own department', () => {
    const leader = viewer('team_leader', { isDepartmentMember: true });
    assert.equal(access.taskPermissions(leader, relation()).canEdit, true);
    const invitedLeader = viewer('team_leader', { isBoardMember: true });
    assert.equal(access.taskPermissions(invitedLeader, relation()).canEdit, false);
  });
  await t.test('employee edits own tasks, archives only what they created (BR-19)', () => {
    const member = viewer('employee', { isDepartmentMember: true });
    assert.deepEqual(access.taskPermissions(member, relation()), {
      canEdit: false,
      canReassign: false,
      canArchive: false,
    });
    assert.equal(access.taskPermissions(member, relation({ isCollaborator: true })).canEdit, true);
    assert.equal(access.taskPermissions(member, relation({ isCreator: true })).canArchive, true);
  });
  await t.test('archived department makes the board read-only for everyone (BR-06)', () => {
    const readOnly = viewer('super_admin', { isReadOnly: true });
    assert.deepEqual(access.boardPermissions(readOnly), {
      canView: true,
      canWrite: false,
      canEditAllTasks: false,
    });
    assert.equal(access.taskPermissions(readOnly, relation({ isCreator: true })).canArchive, false);
  });
  await t.test('dashboard creation: Super Admin anywhere, manager only own department', () => {
    assert.equal(access.canCreateDashboard('super_admin', 'dept-1', null), true);
    assert.equal(access.canCreateDashboard('department_manager', 'dept-1', 'dept-1'), true);
    assert.equal(access.canCreateDashboard('department_manager', 'dept-2', 'dept-1'), false);
    assert.equal(access.canCreateDashboard('hr_admin', 'dept-1', null), false);
  });
  await t.test('reassigning: managers, team leaders and the creator only', () => {
    const member = viewer('employee', { isDepartmentMember: true });
    assert.equal(access.taskPermissions(member, relation({ isAssignee: true })).canReassign, false);
    assert.equal(access.taskPermissions(member, relation({ isCreator: true })).canReassign, true);
    const leader = viewer('team_leader', { isDepartmentMember: true });
    assert.equal(access.taskPermissions(leader, relation()).canReassign, true);
    const hr = viewer('hr_admin');
    assert.equal(access.taskPermissions(hr, relation({ isCreator: true })).canReassign, false);
  });
});

import assert from 'node:assert/strict';
import { URL } from 'node:url';
import test from 'node:test';
import { loadTsModule } from '../../lib/load-ts-module.mjs';

const { Response } = globalThis;
const service = await loadTsModule(new URL('./department-dashboards.service.ts', import.meta.url));

const env = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'test-key',
  ALLOWED_ORIGINS: '',
};
const ids = {
  user: '00000000-0000-4000-8000-000000000001',
  account: '00000000-0000-4000-8000-000000000002',
  employee: '00000000-0000-4000-8000-000000000003',
  department: '00000000-0000-4000-8000-000000000004',
  otherDepartment: '00000000-0000-4000-8000-000000000005',
  dashboard: '00000000-0000-4000-8000-000000000006',
  board: '00000000-0000-4000-8000-000000000007',
};
const scopeAs = (role) => ({ env, actor: { id: ids.user, email: null, role, sessionId: 's-1' } });
const failOnFetch = async () => assert.fail('Must not access database');

const summaryRow = {
  id: ids.dashboard,
  name: 'Kinh doanh',
  description: null,
  department_id: ids.department,
  department_name: 'Kinh doanh',
  department_archived_at: null,
  board_id: ids.board,
  open_count: 2,
  in_progress_count: 1,
  overdue_count: 0,
};
const access = (role, facts = {}) => ({
  accountId: ids.account,
  role,
  employeeId: ids.employee,
  boardId: ids.board,
  departmentId: ids.department,
  isReadOnly: false,
  isDepartmentMember: false,
  isDepartmentManager: false,
  isBoardMember: false,
  taskId: null,
  isAssignee: false,
  isCollaborator: false,
  isCreator: false,
  ...facts,
});
/** Hồ sơ người gọi (auth findEmployeeSummary): trưởng phòng của `managedDepartment`. */
const managerProfile = (managedDepartment) => [
  {
    id: ids.employee,
    full_name: 'Trưởng phòng',
    department_id: managedDepartment,
    department_name: 'Phòng',
    department_manager_id: ids.employee,
  },
];

/** Trả dữ liệu theo đường dẫn; ghi lại body của các RPC để kiểm tra tham số. */
function fakeDatabase(routes) {
  const calls = [];
  const fetch = async (url, init = {}) => {
    const path = String(url);
    if (init.body) calls.push({ path, body: JSON.parse(init.body) });
    const match = Object.entries(routes).find(([fragment]) => path.includes(fragment));
    if (!match) return Response.json([]);
    const [, value] = match;
    return value instanceof Response ? value : Response.json(value);
  };
  return { fetch, calls };
}

test('department dashboards service (BR-03 → BR-05, BR-41)', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  const createInput = { departmentId: ids.department };

  await t.test('employee and HR cannot create a dashboard', async () => {
    globalThis.fetch = failOnFetch;
    for (const role of ['employee', 'hr_admin', 'team_leader']) {
      await assert.rejects(() => service.createDashboard(scopeAs(role), createInput), {
        code: 'FORBIDDEN',
      });
    }
  });
  await t.test('manager of another department gets 403 without calling the RPC', async () => {
    const database = fakeDatabase({ active_employees: managerProfile(ids.otherDepartment) });
    globalThis.fetch = database.fetch;
    await assert.rejects(
      () => service.createDashboard(scopeAs('department_manager'), createInput),
      { code: 'FORBIDDEN', status: 403 },
    );
    assert.equal(database.calls.length, 0);
  });
  await t.test('existing dashboard → 409 with dashboardId (BR-04)', async () => {
    globalThis.fetch = fakeDatabase({
      active_employees: managerProfile(ids.department),
      crm_create_dashboard: { dashboardId: ids.dashboard, created: false },
    }).fetch;
    await assert.rejects(
      () => service.createDashboard(scopeAs('department_manager'), createInput),
      (error) =>
        error.code === 'DASHBOARD_ALREADY_EXISTS' &&
        error.status === 409 &&
        error.details.dashboardId === ids.dashboard,
    );
  });
  await t.test('Super Admin creates a dashboard for any department', async () => {
    globalThis.fetch = fakeDatabase({
      crm_create_dashboard: { dashboardId: ids.dashboard, created: true },
      dashboard_summaries: [summaryRow],
      crm_work_access: access('super_admin'),
    }).fetch;
    const dashboard = await service.createDashboard(scopeAs('super_admin'), createInput);
    assert.equal(dashboard.boardId, ids.board);
    assert.equal(dashboard.viewer.canWrite, true);
  });
  await t.test('Super Admin and HR list every dashboard, others only their own', async () => {
    for (const [role, includeAll] of [
      ['super_admin', true],
      ['hr_admin', true],
      ['employee', false],
    ]) {
      const database = fakeDatabase({ crm_list_dashboards: [] });
      globalThis.fetch = database.fetch;
      assert.deepEqual(await service.listDashboards(scopeAs(role)), []);
      const rpc = database.calls.find((call) => call.path.includes('crm_list_dashboards'));
      assert.equal(rpc.body.include_all, includeAll);
    }
  });
  await t.test('HR sees a dashboard card as read-only (Q3)', async () => {
    globalThis.fetch = fakeDatabase({ crm_list_dashboards: [summaryRow] }).fetch;
    const [card] = await service.listDashboards(scopeAs('hr_admin'));
    assert.equal(card.isReadOnly, true);
    assert.deepEqual(card.counts, { open: 2, inProgress: 1, overdue: 0 });
  });
  await t.test('employee of another department cannot open the board', async () => {
    globalThis.fetch = fakeDatabase({
      dashboard_summaries: [summaryRow],
      crm_work_access: access('employee'),
    }).fetch;
    await assert.rejects(() => service.getDashboard(scopeAs('employee'), ids.dashboard), {
      code: 'FORBIDDEN',
      status: 403,
    });
  });
  await t.test('unknown dashboard → 404', async () => {
    globalThis.fetch = fakeDatabase({ dashboard_summaries: [] }).fetch;
    await assert.rejects(() => service.getDashboard(scopeAs('super_admin'), ids.dashboard), {
      code: 'DASHBOARD_NOT_FOUND',
      status: 404,
    });
  });
});

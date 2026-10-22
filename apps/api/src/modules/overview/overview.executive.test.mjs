import assert from 'node:assert/strict';
import { URL } from 'node:url';
import test from 'node:test';
import { loadTsModule } from '../../lib/load-ts-module.mjs';

const { Response } = globalThis;
const service = await loadTsModule(new URL('./overview.service.ts', import.meta.url));
const schema = await loadTsModule(new URL('./overview.schema.ts', import.meta.url));

const env = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'test-key',
  ALLOWED_ORIGINS: '',
};
const scopeAs = (role) => ({
  env,
  actor: { id: '00000000-0000-4000-8000-000000000001', email: null, role, sessionId: 's-1' },
});
const me = (departmentId = 'dep-1') => ({
  id: 'e-me',
  full_name: 'Người gọi',
  department_id: departmentId,
  department_name: departmentId ? 'Kinh doanh' : null,
  department_manager_id: null,
});
const statsRow = (id, todo, inProgress, done, overdue) => ({
  department_id: id,
  department_name: id,
  dashboard_id: `dash-${id}`,
  todo_count: todo,
  in_progress_count: inProgress,
  done_count: done,
  overdue_count: overdue,
});
const upcomingRow = {
  id: 't-1',
  title: 'Gửi báo giá',
  status: 'todo',
  priority: 'high',
  due_date: '2026-10-24',
  days_left: 2,
  department_id: 'dep-1',
  department_name: 'Kinh doanh',
  dashboard_id: 'dash-dep-1',
  assignee_id: 'e-1',
  assignee_name: 'An',
};

/** Trả dữ liệu theo đoạn đường dẫn; ghi lại URL + body mọi lần gọi. */
function fakeDatabase(routes) {
  const calls = [];
  const fetch = async (url, init) => {
    const path = decodeURIComponent(String(url));
    calls.push({ path, body: init?.body ? JSON.parse(init.body) : null });
    const match = Object.entries(routes).find(([fragment]) => path.includes(fragment));
    return Response.json(match ? match[1] : []);
  };
  const find = (fragment) => calls.find(({ path }) => path.includes(fragment));
  return { fetch, calls, find };
}
const rejectsWithStatus = (promise, status) =>
  assert.rejects(promise, (error) => error.status === status);

test('executive overview service', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  await t.test('super admin sees every department; totals add up', async () => {
    const database = fakeDatabase({
      crm_executive_task_stats: [statsRow('a', 3, 1, 4, 2), statsRow('b', 1, 0, 1, 0)],
      upcoming_task_rows: [upcomingRow],
    });
    globalThis.fetch = database.fetch;
    const overview = await service.getExecutiveOverview(scopeAs('super_admin'), {
      period: 'quarter',
    });
    assert.equal(overview.departmentId, null);
    assert.deepEqual(overview.totals, { todo: 4, inProgress: 1, done: 5, overdue: 2, total: 10 });
    assert.deepEqual(overview.departments[0], {
      department: { id: 'a', name: 'a' },
      dashboardId: 'dash-a',
      todo: 3,
      inProgress: 1,
      done: 4,
      overdue: 2,
    });
    assert.equal(overview.upcoming[0].daysLeft, 2);
    assert.deepEqual(database.find('crm_executive_task_stats').body, {
      period: 'quarter',
      department_uuid: null,
    });
    assert.equal(database.find('active_employees'), undefined);
    for (const view of ['project_summaries', 'upcoming_task_rows', 'employee_workload']) {
      assert.ok(!database.find(view).path.includes('department_id='), view);
    }
    assert.ok(database.find('upcoming_task_rows').path.includes('days_left.gte.0,days_left.lt.7'));
    assert.ok(
      database.find('employee_workload').path.includes('overdue_count.gt.0,open_count.gt.10'),
    );
    assert.ok(database.find('project_summaries').path.includes('status=neq.done'));
  });

  await t.test('department manager is limited to their own department', async () => {
    const database = fakeDatabase({ active_employees: [me()] });
    globalThis.fetch = database.fetch;
    const overview = await service.getExecutiveOverview(scopeAs('department_manager'), {
      period: 'week',
    });
    assert.equal(overview.departmentId, 'dep-1');
    assert.equal(database.find('crm_executive_task_stats').body.department_uuid, 'dep-1');
    for (const view of ['project_summaries', 'upcoming_task_rows', 'employee_workload']) {
      assert.ok(database.find(view).path.includes('department_id=eq.dep-1'), view);
    }
  });

  await t.test('manager without a department gets an empty overview', async () => {
    const database = fakeDatabase({ active_employees: [me(null)] });
    globalThis.fetch = database.fetch;
    const overview = await service.getExecutiveOverview(scopeAs('department_manager'), {
      period: 'month',
    });
    assert.equal(overview.totals.total, 0);
    assert.deepEqual(overview.departments, []);
    assert.equal(database.find('crm_executive_task_stats'), undefined);
  });

  await t.test('other roles are forbidden', async () => {
    globalThis.fetch = fakeDatabase({}).fetch;
    for (const role of ['hr_admin', 'team_leader', 'employee']) {
      await rejectsWithStatus(
        service.getExecutiveOverview(scopeAs(role), { period: 'month' }),
        403,
      );
    }
  });

  await t.test('period defaults to month and rejects unknown values', () => {
    assert.deepEqual(schema.executiveQuerySchema.parse({}), { period: 'month' });
    assert.throws(() => schema.executiveQuerySchema.parse({ period: 'year' }));
  });
});

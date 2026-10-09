import assert from 'node:assert/strict';
import { URL } from 'node:url';
import test from 'node:test';
import { loadTsModule } from '../../lib/load-ts-module.mjs';

const { Response } = globalThis;
const service = await loadTsModule(new URL('./tasks.mine.service.ts', import.meta.url));
const { myTasksQuerySchema } = await loadTsModule(new URL('./tasks.schema.ts', import.meta.url));

const env = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'test-key',
  ALLOWED_ORIGINS: '',
};
const ids = {
  user: '00000000-0000-4000-8000-000000000001',
  me: '00000000-0000-4000-8000-000000000003',
  dept: '00000000-0000-4000-8000-000000000005',
  task: '00000000-0000-4000-8000-000000000009',
};
const scopeAs = (role) => ({ env, actor: { id: ids.user, email: null, role, sessionId: 's-1' } });
const me = [
  {
    id: ids.me,
    full_name: 'Người gọi',
    department_id: ids.dept,
    department_name: 'Phòng',
    department_manager_id: null,
  },
];
const row = (facts = {}) => ({
  id: ids.task,
  is_assignee: true,
  column_id: 'col-todo',
  title: 'Viết báo cáo',
  status: 'todo',
  priority: 'high',
  due_date: '2026-10-08',
  completed_at: null,
  department_id: ids.dept,
  department_name: 'Phòng',
  dashboard_id: 'dash-1',
  dashboard_name: 'Dashboard',
  project_id: null,
  project_name: null,
  checklist_total: 3,
  checklist_done: 1,
  done_column_id: 'col-done',
  is_department_member: true,
  is_board_member: false,
  is_department_manager: false,
  is_overdue: true,
  ...facts,
});
const counts = { today: 1, week: 2, overdue: 1, open: 4, done: 9 };

function fakeDatabase(routes) {
  const calls = [];
  const fetch = async (url, init) => {
    const path = decodeURIComponent(String(url));
    calls.push({ path, body: init?.body ? JSON.parse(init.body) : null });
    const match = Object.entries(routes).find(([fragment]) => path.includes(fragment));
    if (!match) return Response.json([]);
    const value = match[1];
    return value instanceof Response ? value : Response.json(value);
  };
  return { fetch, calls };
}
const list = (rows) =>
  Response.json(rows, { headers: { 'Content-Range': `0-${rows.length}/${rows.length}` } });
const query = (raw = {}) => myTasksQuerySchema.parse(raw);

test('my tasks service (Đợt 3 S2)', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  await t.test('lists only the caller’s rows and returns counts in meta', async () => {
    const database = fakeDatabase({
      active_employees: me,
      my_task_rows: list([row(), row({ id: 'other', is_assignee: false })]),
      crm_my_task_counts: counts,
    });
    globalThis.fetch = database.fetch;
    const page = await service.listMyTasks(scopeAs('employee'), query({ tab: 'overdue' }));
    assert.deepEqual(page.meta, { page: 1, pageSize: 20, total: 2, counts });
    assert.equal(page.data[0].role, 'assignee');
    assert.equal(page.data[1].role, 'collaborator');
    assert.deepEqual(page.data[0].checklist, { done: 1, total: 3 });
    const listCall = database.calls.find(({ path }) => path.includes('my_task_rows'));
    assert.ok(listCall.path.includes(`employee_id=eq.${ids.me}`));
    assert.ok(listCall.path.includes('is_overdue=is.true'));
    const rpc = database.calls.find(({ path }) => path.includes('crm_my_task_counts'));
    assert.equal(rpc.body.employee_uuid, ids.me);
  });
  await t.test('filters and escaped search go to both list and counts', async () => {
    const database = fakeDatabase({
      active_employees: me,
      my_task_rows: list([]),
      crm_my_task_counts: counts,
    });
    globalThis.fetch = database.fetch;
    await service.listMyTasks(
      scopeAs('employee'),
      query({ tab: 'done', departmentId: ids.dept, priority: 'urgent', q: '50%_' }),
    );
    const listCall = database.calls.find(({ path }) => path.includes('my_task_rows'));
    assert.ok(listCall.path.includes('status=eq.done'));
    assert.ok(listCall.path.includes('order=completed_at.desc'));
    assert.ok(listCall.path.includes(`department_id=eq.${ids.dept}`));
    assert.ok(listCall.path.includes('priority=eq.urgent'));
    assert.ok(listCall.path.includes('title=ilike.*50\\%\\_*'));
    const rpc = database.calls.find(({ path }) => path.includes('crm_my_task_counts'));
    assert.deepEqual(rpc.body, {
      employee_uuid: ids.me,
      department_uuid: ids.dept,
      task_priority: 'urgent',
      project_uuid: null,
      search: '50\\%\\_',
    });
  });
  await t.test('collaborator who is still in the board can complete (canEdit)', async () => {
    globalThis.fetch = fakeDatabase({
      active_employees: me,
      my_task_rows: list([
        row({ is_assignee: false, is_department_member: false, is_board_member: true }),
      ]),
      crm_my_task_counts: counts,
    }).fetch;
    const page = await service.listMyTasks(scopeAs('employee'), query());
    assert.equal(page.data[0].canEdit, true);
  });
  await t.test('account without employee profile → empty page, zero counts, no query', async () => {
    const database = fakeDatabase({ active_employees: [] });
    globalThis.fetch = database.fetch;
    const page = await service.listMyTasks(scopeAs('super_admin'), query());
    assert.deepEqual(page.data, []);
    assert.deepEqual(page.meta.counts, { today: 0, week: 0, overdue: 0, open: 0, done: 0 });
    assert.ok(!database.calls.some(({ path }) => path.includes('my_task_rows')));
  });
  await t.test('unknown tab is rejected by the schema', () => {
    assert.throws(() => query({ tab: 'later' }));
  });
});

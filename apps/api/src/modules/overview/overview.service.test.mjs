import assert from 'node:assert/strict';
import { URL } from 'node:url';
import test from 'node:test';
import { loadTsModule } from '../../lib/load-ts-module.mjs';

const { Response } = globalThis;
const service = await loadTsModule(new URL('./overview.service.ts', import.meta.url));

const env = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'test-key',
  ALLOWED_ORIGINS: '',
};
const scopeAs = (role) => ({
  env,
  actor: { id: '00000000-0000-4000-8000-000000000001', email: null, role, sessionId: 's-1' },
});
const me = {
  id: 'e-me',
  full_name: 'Người gọi',
  department_id: 'dep-1',
  department_name: 'Kinh doanh',
  department_manager_id: null,
};
const rpcCounts = {
  today: 1,
  week: 2,
  overdue: 1,
  open: 4,
  done: 9,
  todo: 3,
  in_progress: 1,
  done_this_week: 2,
};
const dashboard = (id, open, overdue) => ({
  id,
  name: id,
  description: null,
  department_id: `dep-${id}`,
  department_name: id,
  department_archived_at: null,
  board_id: `board-${id}`,
  open_count: open,
  in_progress_count: 0,
  overdue_count: overdue,
});

/** Trả dữ liệu theo đoạn đường dẫn; ghi lại mọi URL đã gọi. */
function fakeDatabase(routes) {
  const calls = [];
  const fetch = async (url) => {
    const path = decodeURIComponent(String(url));
    calls.push(path);
    const match = Object.entries(routes).find(([fragment]) => path.includes(fragment));
    return Response.json(match ? match[1] : []);
  };
  return { fetch, calls };
}

test('overview service (Đợt 4 S2)', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  await t.test('employee gets own cards and due-soon list, no company block', async () => {
    const database = fakeDatabase({
      active_employees: [me],
      crm_my_task_counts: rpcCounts,
      my_task_rows: [],
      crm_list_dashboards: [dashboard('a', 5, 1)],
    });
    globalThis.fetch = database.fetch;
    const overview = await service.getPersonalOverview(scopeAs('employee'));
    assert.deepEqual(overview, {
      counts: { todo: 3, inProgress: 1, overdue: 1, doneThisWeek: 2 },
      dueSoon: [],
      company: null,
    });
    assert.ok(
      database.calls.every((path) => !path.includes('crm_list_dashboards')),
      'Không đọc số liệu toàn công ty cho role khác Super Admin',
    );
  });

  await t.test('department manager also gets no company block', async () => {
    const database = fakeDatabase({ active_employees: [me], crm_my_task_counts: rpcCounts });
    globalThis.fetch = database.fetch;
    const overview = await service.getPersonalOverview(scopeAs('department_manager'));
    assert.equal(overview.company, null);
  });

  await t.test('super admin gets company totals summed over every dashboard', async () => {
    const database = fakeDatabase({
      active_employees: [me],
      crm_my_task_counts: rpcCounts,
      crm_list_dashboards: [dashboard('a', 5, 1), dashboard('b', 7, 3)],
    });
    globalThis.fetch = database.fetch;
    const overview = await service.getPersonalOverview(scopeAs('super_admin'));
    assert.deepEqual(overview.company, { open: 12, overdue: 4 });
  });

  await t.test(
    'super admin without employee profile: zero cards, company still shown',
    async () => {
      const database = fakeDatabase({
        active_employees: [],
        crm_list_dashboards: [dashboard('a', 2, 0)],
      });
      globalThis.fetch = database.fetch;
      const overview = await service.getPersonalOverview(scopeAs('super_admin'));
      assert.deepEqual(overview.counts, { todo: 0, inProgress: 0, overdue: 0, doneThisWeek: 0 });
      assert.deepEqual(overview.company, { open: 2, overdue: 0 });
    },
  );
});

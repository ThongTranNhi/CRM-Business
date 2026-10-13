import assert from 'node:assert/strict';
import { URL } from 'node:url';
import test from 'node:test';
import { loadTsModule } from '../../lib/load-ts-module.mjs';

const { Response } = globalThis;
const service = await loadTsModule(new URL('./search.service.ts', import.meta.url));

const env = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'test-key',
  ALLOWED_ORIGINS: '',
};
const scopeAs = (role) => ({
  env,
  actor: { id: '00000000-0000-4000-8000-000000000001', email: null, role, sessionId: 's-1' },
});
const dashboard = {
  id: 'd-1',
  name: 'Kinh doanh',
  description: null,
  department_id: 'dep-1',
  department_name: 'Kinh doanh',
  department_archived_at: null,
  board_id: 'b-1',
  open_count: 0,
  in_progress_count: 0,
  overdue_count: 0,
};

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

test('search service (Đợt 3 S4)', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  await t.test(
    'searches tasks only on visible boards; employees hidden from non-admins',
    async () => {
      const database = fakeDatabase({
        '/rpc/crm_list_dashboards': [dashboard],
        task_cards: [{ id: 't-1', title: 'Gọi khách', status: 'todo', board_id: 'b-1' }],
      });
      globalThis.fetch = database.fetch;
      const results = await service.search(scopeAs('employee'), 'khách');
      assert.ok(
        database.calls.some(
          (path) => path.includes('task_cards') && path.includes('board_id=in.(b-1)'),
        ),
      );
      assert.ok(
        database.calls.every((path) => !path.includes('full_name.ilike')),
        'Nhân viên thường không được tìm trong danh bạ nhân viên',
      );
      assert.deepEqual(results.tasks, [
        {
          id: 't-1',
          title: 'Gọi khách',
          status: 'todo',
          dashboardId: 'd-1',
          dashboardName: 'Kinh doanh',
        },
      ]);
      assert.deepEqual(results.employees, []);
    },
  );

  await t.test('no visible board → no task query', async () => {
    const database = fakeDatabase({});
    globalThis.fetch = database.fetch;
    const results = await service.search(scopeAs('employee'), 'khách');
    assert.ok(database.calls.every((path) => !path.includes('task_cards')));
    assert.deepEqual(results.tasks, []);
  });

  await t.test('empty query after sanitising → empty results without database calls', async () => {
    const database = fakeDatabase({});
    globalThis.fetch = database.fetch;
    const results = await service.search(scopeAs('super_admin'), undefined);
    assert.deepEqual(results, { tasks: [], employees: [], projects: [], departments: [] });
    assert.deepEqual(database.calls, []);
  });
});

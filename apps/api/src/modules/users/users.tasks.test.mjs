import assert from 'node:assert/strict';
import { URL } from 'node:url';
import test from 'node:test';
import { loadTsModule } from '../../lib/load-ts-module.mjs';

const { Response } = globalThis;
const service = await loadTsModule(new URL('./users.service.ts', import.meta.url));
const tasksSchema = await loadTsModule(new URL('../tasks/tasks.schema.ts', import.meta.url));

const env = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'test-key',
  ALLOWED_ORIGINS: '',
};
const scopeAs = (role) => ({
  env,
  actor: { id: '00000000-0000-4000-8000-000000000001', email: null, role, sessionId: 's-1' },
});
const accountOf = (role) => ({ id: 'account-1', status: 'active', role });
const employeeRow = {
  id: 'employee-2',
  full_name: 'Nhân viên',
  employee_code: null,
  job_title: null,
  departments: null,
  avatar_path: null,
  role: 'employee',
  archived_at: null,
  auth_user_id: 'auth-2',
};
const counts = {
  today: 0,
  week: 1,
  overdue: 1,
  open: 2,
  done: 3,
  todo: 1,
  in_progress: 1,
  done_this_week: 0,
};

/** app_accounts → người gọi; employee_directory → nhân viên được xem; my_task_rows / RPC đếm → việc. */
function fakeDatabase({ role = 'super_admin', employee = employeeRow } = {}) {
  const calls = [];
  const fetch = async (url) => {
    const path = decodeURIComponent(String(url));
    calls.push(path);
    if (path.includes('/app_accounts?')) return Response.json([accountOf(role)]);
    if (path.includes('/employee_directory?')) return Response.json(employee ? [employee] : []);
    if (path.includes('crm_my_task_counts')) return Response.json(counts);
    if (path.includes('/my_task_rows?')) {
      return new Response('[]', { headers: { 'Content-Range': '*/0' } });
    }
    return Response.json([]);
  };
  return { fetch, calls };
}
const query = (input = {}) => tasksSchema.myTasksQuerySchema.parse(input);

test('employee profile tasks tab', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  await t.test('super admin lists the tasks of that employee, not their own', async () => {
    const database = fakeDatabase();
    globalThis.fetch = database.fetch;
    const page = await service.getEmployeeTasks(scopeAs('super_admin'), 'employee-2', query());
    assert.equal(page.meta.counts.open, 2);
    const list = database.calls.find((path) => path.includes('/my_task_rows?'));
    assert.ok(list.includes('employee_id=eq.employee-2'));
    assert.ok(list.includes('status=neq.done'));
  });

  await t.test('other roles are forbidden before reading tasks', async () => {
    for (const role of ['hr_admin', 'department_manager', 'employee']) {
      const database = fakeDatabase({ role });
      globalThis.fetch = database.fetch;
      await assert.rejects(() => service.getEmployeeTasks(scopeAs(role), 'employee-2', query()), {
        code: 'FORBIDDEN',
      });
      assert.ok(!database.calls.some((path) => path.includes('my_task_rows')));
    }
  });

  await t.test('unknown employee → 404', async () => {
    globalThis.fetch = fakeDatabase({ employee: null }).fetch;
    await assert.rejects(
      () => service.getEmployeeTasks(scopeAs('super_admin'), 'employee-9', query({ tab: 'done' })),
      (error) => error.status === 404,
    );
  });
});

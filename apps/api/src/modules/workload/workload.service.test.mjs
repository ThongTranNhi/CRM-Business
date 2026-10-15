import assert from 'node:assert/strict';
import { URL } from 'node:url';
import test from 'node:test';
import { loadTsModule } from '../../lib/load-ts-module.mjs';

const { Response } = globalThis;
const service = await loadTsModule(new URL('./workload.service.ts', import.meta.url));

const env = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'test-key',
  ALLOWED_ORIGINS: '',
};
const scopeAs = (role) => ({
  env,
  actor: { id: '00000000-0000-4000-8000-000000000001', email: null, role, sessionId: 's-1' },
});
const query = (extra = {}) => ({ page: 1, pageSize: 25, sort: 'open', order: 'desc', ...extra });
const OWN_DEPARTMENT = '00000000-0000-4000-8000-0000000000d1';
const OTHER_DEPARTMENT = '00000000-0000-4000-8000-0000000000d2';
const me = {
  id: 'e-me',
  full_name: 'Trưởng phòng',
  department_id: OWN_DEPARTMENT,
  department_name: 'Kinh doanh',
  department_manager_id: 'e-me',
};
const workloadRow = {
  employee_id: 'e-1',
  full_name: 'Nguyễn An',
  department_id: OWN_DEPARTMENT,
  department_name: 'Kinh doanh',
  dashboard_id: 'dash-1',
  todo_count: 3,
  in_progress_count: 2,
  open_count: 5,
  overdue_count: 1,
  done_30d_count: 4,
};

/** Trả dữ liệu theo đoạn đường dẫn (kèm Content-Range cho danh sách); ghi lại mọi URL đã gọi. */
function fakeDatabase({ employee = me, rows = [workloadRow] } = {}) {
  const calls = [];
  const fetch = async (url) => {
    const path = decodeURIComponent(String(url));
    calls.push(path);
    if (path.includes('/active_employees')) return Response.json(employee ? [employee] : []);
    return Response.json(rows, {
      headers: { 'Content-Range': `0-${rows.length - 1}/${rows.length}` },
    });
  };
  const workloadCalls = () => calls.filter((path) => path.includes('/employee_workload'));
  return { fetch, calls, workloadCalls };
}

const rejectsWithStatus = (promise, status) =>
  assert.rejects(promise, (error) => error.status === status);

test('workload service (Đợt 4 S1)', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  await t.test('super admin sees every department and maps rows', async () => {
    const database = fakeDatabase();
    globalThis.fetch = database.fetch;
    const page = await service.listWorkload(scopeAs('super_admin'), query());
    const [path] = database.workloadCalls();
    assert.ok(!path.includes('department_id=eq.'), 'Không lọc phòng khi Super Admin không chọn');
    assert.ok(path.includes('order=open_count.desc,full_name.asc,employee_id.asc'));
    assert.ok(database.calls.every((call) => !call.includes('/active_employees')));
    assert.deepEqual(page.data, [
      {
        employee: { id: 'e-1', fullName: 'Nguyễn An' },
        department: { id: OWN_DEPARTMENT, name: 'Kinh doanh' },
        dashboardId: 'dash-1',
        todo: 3,
        inProgress: 2,
        open: 5,
        overdue: 1,
        done30d: 4,
      },
    ]);
    assert.deepEqual(page.meta, { page: 1, pageSize: 25, total: 1 });
  });

  await t.test(
    'super admin may filter any department; sort by name has no duplicate key',
    async () => {
      const database = fakeDatabase();
      globalThis.fetch = database.fetch;
      await service.listWorkload(
        scopeAs('super_admin'),
        query({ departmentId: OTHER_DEPARTMENT, sort: 'name', order: 'asc' }),
      );
      const [path] = database.workloadCalls();
      assert.ok(path.includes(`department_id=eq.${OTHER_DEPARTMENT}`));
      assert.ok(path.includes('order=full_name.asc,employee_id.asc'));
    },
  );

  for (const role of ['department_manager', 'team_leader']) {
    await t.test(`${role} is limited to own department`, async () => {
      const database = fakeDatabase();
      globalThis.fetch = database.fetch;
      await service.listWorkload(scopeAs(role), query());
      const [path] = database.workloadCalls();
      assert.ok(path.includes(`department_id=eq.${OWN_DEPARTMENT}`));
    });

    await t.test(
      `${role} filtering another department → 403 without reading workload`,
      async () => {
        const database = fakeDatabase();
        globalThis.fetch = database.fetch;
        await rejectsWithStatus(
          service.listWorkload(scopeAs(role), query({ departmentId: OTHER_DEPARTMENT })),
          403,
        );
        assert.deepEqual(database.workloadCalls(), []);
      },
    );
  }

  await t.test('team leader without a department → empty page, no workload query', async () => {
    const database = fakeDatabase({ employee: { ...me, department_id: null } });
    globalThis.fetch = database.fetch;
    const page = await service.listWorkload(scopeAs('team_leader'), query());
    assert.deepEqual(page, { data: [], meta: { page: 1, pageSize: 25, total: 0 } });
    assert.deepEqual(database.workloadCalls(), []);
  });

  for (const role of ['hr_admin', 'employee']) {
    await t.test(`${role} → 403`, async () => {
      const database = fakeDatabase();
      globalThis.fetch = database.fetch;
      await rejectsWithStatus(service.listWorkload(scopeAs(role), query()), 403);
      assert.deepEqual(database.calls, []);
    });
  }
});

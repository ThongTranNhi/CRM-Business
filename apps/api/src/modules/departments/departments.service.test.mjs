import assert from 'node:assert/strict';
import { URL } from 'node:url';
import test from 'node:test';
import { loadTsModule } from '../../lib/load-ts-module.mjs';

const { Response } = globalThis;
const service = await loadTsModule(new URL('./departments.service.ts', import.meta.url));

const env = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'test-key',
  ALLOWED_ORIGINS: '',
};
const scopeAs = (role) => ({
  env,
  actor: { id: '00000000-0000-4000-8000-000000000001', email: null, role, sessionId: 's-1' },
});
const departmentRow = {
  id: 'dept-1',
  name: 'Kinh doanh',
  manager_employee_id: null,
  manager_name: null,
  member_count: 0,
};
const rpcError = (message) => Response.json({ code: 'P0001', message }, { status: 400 });
const failOnFetch = async () => assert.fail('Must not access database');
const listQuery = { page: 1, pageSize: 20, status: 'active' };

test('departments service (BR-08, BR-09)', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  await t.test('employee cannot create a department', async () => {
    globalThis.fetch = failOnFetch;
    await assert.rejects(
      () => service.createDepartment(scopeAs('employee'), { name: 'Pháp chế', managerId: null }),
      { code: 'FORBIDDEN' },
    );
  });
  await t.test('HR cannot delete or see deleted departments', async () => {
    globalThis.fetch = failOnFetch;
    await assert.rejects(() => service.deleteDepartment(scopeAs('hr_admin'), 'dept-1', null), {
      code: 'FORBIDDEN',
    });
    await assert.rejects(
      () => service.listDepartments(scopeAs('hr_admin'), { ...listQuery, status: 'deleted' }),
      { code: 'FORBIDDEN' },
    );
  });
  await t.test('duplicate name maps to DEPARTMENT_NAME_EXISTS', async () => {
    globalThis.fetch = async () => rpcError('DEPARTMENT_NAME_EXISTS');
    await assert.rejects(
      () => service.createDepartment(scopeAs('hr_admin'), { name: 'Kinh doanh', managerId: null }),
      { code: 'DEPARTMENT_NAME_EXISTS', status: 409 },
    );
  });
  await t.test('concurrent duplicate (unique index) also maps to the same error', async () => {
    globalThis.fetch = async () =>
      Response.json({ code: '23505', message: 'duplicate key' }, { status: 409 });
    await assert.rejects(
      () =>
        service.createDepartment(scopeAs('super_admin'), { name: 'Kinh doanh', managerId: null }),
      { code: 'DEPARTMENT_NAME_EXISTS' },
    );
  });
  await t.test('delete without receiving department is refused with a clear error', async () => {
    globalThis.fetch = async () => rpcError('RECEIVING_DEPARTMENT_REQUIRED');
    await assert.rejects(() => service.deleteDepartment(scopeAs('super_admin'), 'dept-1', null), {
      code: 'RECEIVING_DEPARTMENT_REQUIRED',
      status: 422,
    });
  });
  await t.test('delete returns the number of moved employees', async () => {
    let body;
    globalThis.fetch = async (_url, init) => {
      body = JSON.parse(init.body);
      return Response.json(3);
    };
    const result = await service.deleteDepartment(scopeAs('super_admin'), 'dept-1', 'dept-2');
    assert.deepEqual(result, { movedEmployees: 3 });
    assert.equal(body.receiving_uuid, 'dept-2');
  });
  await t.test('update without managerId keeps the current manager', async () => {
    let body;
    globalThis.fetch = async (url, init) => {
      if (String(url).includes('/rpc/')) {
        body = JSON.parse(init.body);
        return new Response(null, { status: 204 });
      }
      return Response.json(String(url).includes('active_departments') ? [departmentRow] : []);
    };
    await service.updateDepartment(scopeAs('hr_admin'), 'dept-1', { name: 'Bán hàng' });
    assert.equal(body.change_manager, false);
  });
  await t.test('active list and members read only non-deleted records (views)', async () => {
    const urls = [];
    globalThis.fetch = async (url) => {
      urls.push(String(url));
      return Response.json(String(url).includes('active_departments') ? [departmentRow] : []);
    };
    await service.listDepartments(scopeAs('employee'), listQuery);
    await service.getDepartment(scopeAs('employee'), 'dept-1');
    // department_dashboards chỉ để gắn dashboardId; phòng / nhân viên chỉ đọc qua view active_*.
    assert.ok(
      urls.every((url) =>
        /\/rest\/v1\/(active_departments|active_employees|department_dashboards)\?/.test(url),
      ),
    );
  });
  await t.test(
    'list carries dashboardId; withoutDashboard excludes those departments',
    async () => {
      const urls = [];
      globalThis.fetch = async (url) => {
        urls.push(String(url));
        if (String(url).includes('department_dashboards')) {
          return Response.json([{ id: 'dash-9', department_id: 'dept-9' }]);
        }
        return Response.json([departmentRow]);
      };
      const page = await service.listDepartments(scopeAs('employee'), listQuery);
      assert.equal(page.data[0].dashboardId, null);
      await service.listDepartments(scopeAs('employee'), { ...listQuery, withoutDashboard: true });
      const listUrl = decodeURIComponent(
        urls.findLast((url) => url.includes('active_departments')),
      );
      assert.match(listUrl, /id=not\.in\.\(dept-9\)/);
    },
  );
  await t.test('unknown department returns 404', async () => {
    globalThis.fetch = async () => Response.json([]);
    await assert.rejects(() => service.getDepartment(scopeAs('employee'), 'missing'), {
      code: 'DEPARTMENT_NOT_FOUND',
      status: 404,
    });
  });
});

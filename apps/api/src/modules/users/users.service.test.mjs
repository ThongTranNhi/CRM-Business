import assert from 'node:assert/strict';
import { URL } from 'node:url';
import test from 'node:test';
import { loadTsModule } from '../../lib/load-ts-module.mjs';

const { Response } = globalThis;
const service = await loadTsModule(new URL('./users.service.ts', import.meta.url));
const env = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'test-key',
  ALLOWED_ORIGINS: '',
};
const userId = '00000000-0000-4000-8000-000000000001';
const account = { id: 'account-1', status: 'active', role: 'employee' };
const profile = {
  id: 'employee-1',
  full_name: 'Test',
  employee_code: null,
  job_title: null,
  departments: null,
  avatar_path: null,
};

test('profile authorization and updates', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  await t.test('blocked account is denied', async () => {
    globalThis.fetch = async () => Response.json([{ ...account, status: 'blocked' }]);
    await assert.rejects(() => service.getOwnProfile(env, userId), { code: 'FORBIDDEN' });
  });
  await t.test('employee cannot list everyone', async () => {
    globalThis.fetch = async () => Response.json([account]);
    await assert.rejects(
      () => service.getEmployeeDirectory(env, userId, { page: 1, pageSize: 25, status: 'active' }),
      { code: 'FORBIDDEN' },
    );
  });
  await t.test('employee cannot reset another password', async () => {
    globalThis.fetch = async () => Response.json([account]);
    await assert.rejects(
      () =>
        service.resetEmployeePassword(env, userId, {
          employeeId: 'employee-2',
          password: 'TemporaryStrong123',
        }),
      { code: 'FORBIDDEN' },
    );
  });
  await t.test('unknown account is denied', async () => {
    globalThis.fetch = async () => Response.json([]);
    await assert.rejects(() => service.requireActiveAccount(env, userId), { code: 'FORBIDDEN' });
  });
  await t.test('cross-user avatar write rejected before any database call', async () => {
    globalThis.fetch = async () => {
      assert.fail('Must not access database');
    };
    await assert.rejects(
      () =>
        service.updateOwnProfile(env, userId, {
          employeeCode: 'NV01',
          avatarPath: 'another-user/avatar.png',
        }),
      { code: 'FORBIDDEN' },
    );
  });
  await t.test('cross-user stored avatar must not be signed', async () => {
    globalThis.fetch = async (url) =>
      Response.json(
        String(url).includes('/app_accounts?')
          ? [account]
          : [{ ...profile, avatar_path: 'another-user/avatar.png' }],
      );
    await assert.rejects(() => service.getOwnProfile(env, userId), { code: 'FORBIDDEN' });
  });
  await t.test('update RPC uses verified subject and preserves avatar when omitted', async () => {
    let rpcCalls = 0;
    globalThis.fetch = async (url, init) => {
      if (String(url).includes('/rpc/')) {
        rpcCalls += 1;
        assert.deepEqual(JSON.parse(init.body), {
          target_auth_user_id: userId,
          new_employee_code: 'NV01',
          new_avatar_path: null,
          replace_avatar: false,
        });
        return new Response(null, { status: 204 });
      }
      return Response.json(String(url).includes('/app_accounts?') ? [account] : [profile]);
    };
    await service.updateOwnProfile(env, userId, { employeeCode: 'NV01' });
    assert.equal(rpcCalls, 1);
  });
  await t.test('duplicate code maps to a safe conflict error', async () => {
    globalThis.fetch = async (url) =>
      String(url).includes('/rpc/')
        ? Response.json({ code: '23505', message: 'private database details' }, { status: 409 })
        : Response.json(String(url).includes('/app_accounts?') ? [account] : [profile]);
    await assert.rejects(
      () => service.updateOwnProfile(env, userId, { employeeCode: 'NV01' }),
      (error) =>
        error.code === 'EMPLOYEE_CODE_EXISTS' &&
        error.status === 409 &&
        !error.message.includes('private database details'),
    );
  });
});

const admin = { id: 'account-admin', status: 'active', role: 'super_admin' };
const hr = { id: 'account-hr', status: 'active', role: 'hr_admin' };
const rpcError = (message) => Response.json({ code: 'P0001', message }, { status: 400 });

test('employee soft delete and pickers (BR-53)', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  await t.test('HR cannot delete an employee', async () => {
    globalThis.fetch = async (url) => {
      assert.ok(!String(url).includes('/rpc/'), 'Must not call delete RPC');
      return Response.json([hr]);
    };
    await assert.rejects(
      () => service.deleteEmployee(env, userId, { employeeId: 'employee-2', newManagerId: null }),
      { code: 'FORBIDDEN' },
    );
  });
  await t.test('deleting yourself maps to a clear error', async () => {
    globalThis.fetch = async (url) =>
      String(url).includes('/rpc/crm_delete_employee')
        ? rpcError('CANNOT_DELETE_SELF')
        : Response.json([admin]);
    await assert.rejects(
      () => service.deleteEmployee(env, userId, { employeeId: 'employee-1', newManagerId: null }),
      { code: 'CANNOT_DELETE_SELF', status: 422 },
    );
  });
  await t.test('delete returns the counts reported by the RPC, not a guess', async () => {
    let body;
    globalThis.fetch = async (url, init) => {
      assert.ok(!String(url).includes('/rest/v1/tasks?'), 'Không tự đếm việc trước khi xoá');
      if (!String(url).includes('/rpc/')) return Response.json([admin]);
      body = JSON.parse(init.body);
      // Một trong ba việc nằm ở Dashboard chỉ đọc → RPC chỉ bàn giao 2.
      return Response.json({ openTaskCount: 3, handedOverTaskCount: 2 });
    };
    const result = await service.deleteEmployee(env, userId, {
      employeeId: 'employee-2',
      newManagerId: 'employee-3',
      handoverEmployeeId: 'employee-4',
    });
    assert.deepEqual(body, {
      actor_uuid: userId,
      employee_uuid: 'employee-2',
      new_manager_uuid: 'employee-3',
      handover_employee_uuid: 'employee-4',
    });
    assert.deepEqual(result, { deleted: true, openTaskCount: 3, handedOverTaskCount: 2 });
  });
  await t.test(
    'handover receiver outside a task board → 422 naming the blocked tasks',
    async () => {
      const blocked = [
        { taskId: 't-1', title: 'Gọi khách', dashboardName: 'Kinh doanh' },
        { taskId: 't-2', title: 'Báo giá', dashboardName: 'Kinh doanh' },
      ];
      globalThis.fetch = async (url) =>
        String(url).includes('/rpc/crm_delete_employee')
          ? Response.json(
              {
                code: 'P0001',
                message: 'HANDOVER_EMPLOYEE_NOT_IN_BOARD',
                details: JSON.stringify(blocked),
              },
              { status: 400 },
            )
          : Response.json([admin]);
      await assert.rejects(
        () =>
          service.deleteEmployee(env, userId, {
            employeeId: 'employee-2',
            newManagerId: null,
            handoverEmployeeId: 'employee-4',
          }),
        (error) =>
          error.code === 'HANDOVER_EMPLOYEE_NOT_IN_BOARD' &&
          error.status === 422 &&
          error.message.includes('2 việc') &&
          error.message.includes('“Gọi khách” (Kinh doanh)') &&
          error.details.blockedTasks.length === 2,
      );
    },
  );
  await t.test('updating a profile does not count open tasks', async () => {
    globalThis.fetch = async (url) => {
      assert.ok(!String(url).includes('open_assigned_tasks'), 'Không đếm việc khi chỉ sửa hồ sơ');
      if (String(url).includes('/rpc/')) return new Response(null, { status: 204 });
      if (String(url).includes('/app_accounts?')) return Response.json([admin]);
      return Response.json([{ ...profile, role: 'employee', archived_at: null }]);
    };
    await service.updateEmployee(env, userId, {
      employeeId: 'employee-2',
      fullName: 'Test',
      jobTitle: null,
      departmentId: null,
      status: 'active',
    });
  });
  await t.test('restore with a reused employee code explains what to do', async () => {
    globalThis.fetch = async (url) =>
      String(url).includes('/rpc/crm_restore_employee')
        ? rpcError('EMPLOYEE_CODE_EXISTS')
        : Response.json([admin]);
    await assert.rejects(
      () => service.restoreEmployee(env, userId, 'employee-2'),
      (error) =>
        error.code === 'EMPLOYEE_CODE_EXISTS' &&
        error.message === 'Mã nhân viên đã được dùng, hãy đổi mã trước khi khôi phục',
    );
  });
  await t.test('employee picker reads only non-deleted people (active_employees)', async () => {
    const urls = [];
    globalThis.fetch = async (url) => {
      urls.push(String(url));
      return Response.json(String(url).includes('/app_accounts?') ? [hr] : []);
    };
    await service.getEmployeeOptions(env, userId, { q: 'an', departmentId: 'dept-1' });
    const pickerUrl = urls.find((url) => !url.includes('/app_accounts?'));
    assert.match(pickerUrl, /\/rest\/v1\/active_employees\?/);
    assert.doesNotMatch(pickerUrl, /employee_directory|\/employees\?/);
    // Người nhận bàn giao: mặc định chỉ người cùng phòng (BR-53).
    assert.match(pickerUrl, /department_id=eq\.dept-1/);
  });
  await t.test('department picker reads only non-deleted departments', async () => {
    const urls = [];
    globalThis.fetch = async (url) => {
      urls.push(String(url));
      return Response.json(String(url).includes('/app_accounts?') ? [admin] : []);
    };
    await service.getDepartmentOptions(env, userId);
    assert.ok(urls.some((url) => url.includes('/rest/v1/active_departments?')));
  });
  await t.test('regular employees cannot use the picker', async () => {
    globalThis.fetch = async () => Response.json([account]);
    await assert.rejects(() => service.getEmployeeOptions(env, userId, {}), {
      code: 'FORBIDDEN',
    });
  });
});

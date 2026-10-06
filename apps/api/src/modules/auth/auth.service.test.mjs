import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { URL } from 'node:url';
import test from 'node:test';
import { loadTsModule } from '../../lib/load-ts-module.mjs';

const { Response } = globalThis;
const service = await loadTsModule(new URL('./auth.service.ts', import.meta.url));
const env = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'test-key' };
const jwt = (session) =>
  `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ sub: 'user-1', session_id: session })).toString('base64url')}.signature`;

test('username authentication security', async (t) => {
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  await t.test('duplicate username returns a clear conflict without creating a user', async () => {
    globalThis.fetch = async (url) => {
      assert.match(String(url), /crm_username_exists$/);
      return Response.json(true);
    };
    await assert.rejects(
      () => service.registerLocal(env, 'employee1', 'TemporaryStrong123'),
      (error) =>
        error.code === 'USERNAME_EXISTS' &&
        error.status === 409 &&
        error.message === 'Tên đăng nhập đã tồn tại',
    );
  });
  await t.test('concurrent registration collision is also a username conflict', async () => {
    let existenceChecks = 0;
    globalThis.fetch = async (url) => {
      if (String(url).includes('crm_username_exists')) return Response.json(++existenceChecks > 1);
      return Response.json({ message: 'Database error' }, { status: 500 });
    };
    await assert.rejects(() => service.registerLocal(env, 'employee1', 'TemporaryStrong123'), {
      code: 'USERNAME_EXISTS',
    });
  });
  await t.test('registration only provisions employee, no email delivery', async () => {
    globalThis.fetch = async (url, init) => {
      if (String(url).includes('crm_username_exists')) return Response.json(false);
      if (String(url).includes('/app_accounts?'))
        return Response.json([{ auth_user_id: 'user-1', status: 'active' }]);
      assert.match(String(url), /\/admin\/users$/);
      const input = JSON.parse(init.body);
      assert.equal(input.email_confirm, true);
      assert.deepEqual(input.app_metadata, {
        account_type: 'local',
        username: 'employee1',
        role: 'employee',
      });
      assert.match(input.email, /@accounts\.crm-business\.invalid$/);
      return Response.json({ id: 'user-1' });
    };
    assert.deepEqual(await service.registerLocal(env, 'employee1', 'TemporaryStrong123'), {
      registered: true,
    });
  });
  await t.test('registration does not report success with an unmapped username', async () => {
    globalThis.fetch = async (url) => {
      if (String(url).includes('crm_username_exists')) return Response.json(false);
      if (String(url).includes('/app_accounts?')) return Response.json([]);
      return Response.json({ id: 'user-1' });
    };
    await assert.rejects(() => service.registerLocal(env, 'employee1', 'TemporaryStrong123'), {
      code: 'USERNAME_SYNC_REQUIRED',
    });
  });
  await t.test('revoked session is rejected even with a token', async () => {
    globalThis.fetch = async () => Response.json(null);
    await assert.rejects(() => service.getSessionContext(env, 'user-1', 'revoked'), {
      code: 'UNAUTHENTICATED',
    });
  });
  await t.test('disabled session is rejected', async () => {
    globalThis.fetch = async () => Response.json({ status: 'disabled' });
    await assert.rejects(() => service.getSessionContext(env, 'user-1', 'session-1'), {
      code: 'UNAUTHENTICATED',
    });
  });
  await t.test('Google account cannot change password using local route', async () => {
    globalThis.fetch = async () => Response.json({ status: 'active', username: null });
    await assert.rejects(
      () =>
        service.changeOwnPassword(
          env,
          'user-1',
          's1',
          'employee1',
          'oldStrong12345',
          'newStrong12345',
        ),
      { code: 'INVALID_PASSWORD_CHANGE' },
    );
  });
  await t.test(
    'password change verifies old password and preserves only fresh session',
    async () => {
      let tokenCalls = 0;
      let changed = false;
      let completed = false;
      globalThis.fetch = async (url, init) => {
        const path = String(url);
        if (path.includes('crm_session_context'))
          return Response.json({ status: 'active', username: 'employee1', resetVersion: 4 });
        if (path.includes('/app_accounts?'))
          return Response.json([{ auth_user_id: 'user-1', status: 'active' }]);
        if (path.endsWith('/admin/users/user-1') && !init.method)
          return Response.json({ email: 'internal@accounts.crm-business.invalid' });
        if (path.includes('/token?')) {
          tokenCalls += 1;
          assert.equal(
            JSON.parse(init.body).password,
            tokenCalls === 1 ? 'oldStrong12345' : 'newStrong12345',
          );
          return Response.json({
            access_token: jwt(tokenCalls === 1 ? 'old' : 'fresh'),
            refresh_token: 'refresh',
          });
        }
        if (init.method === 'PUT') {
          changed = true;
          return Response.json({ id: 'user-1' });
        }
        if (path.includes('crm_finish_password_change')) {
          completed = true;
          const input = JSON.parse(init.body);
          assert.deepEqual(input, {
            user_uuid: 'user-1',
            session_uuid: 'fresh',
            expected_version: 4,
          });
          assert.doesNotMatch(init.body, /newStrong|oldStrong/);
          return new Response(null, { status: 204 });
        }
        assert.fail(`Unexpected request ${path}`);
      };
      const result = await service.changeOwnPassword(
        env,
        'user-1',
        's1',
        'employee1',
        'oldStrong12345',
        'newStrong12345',
      );
      assert.equal(result.access_token, jwt('fresh'));
      assert.equal(changed && completed, true);
    },
  );
  await t.test('current user carries the Super Admin title (CEO / Master)', async () => {
    globalThis.fetch = async (url) => {
      if (String(url).includes('crm_session_context'))
        return Response.json({
          id: 'account-1',
          role: 'super_admin',
          status: 'active',
          adminTitle: 'Master',
        });
      return Response.json([]);
    };
    const user = await service.getCurrentUser(env, 'user-1', 'session-1');
    assert.equal(user.role, 'super_admin');
    assert.equal(user.adminTitle, 'Master');
  });
  await t.test('persistent throttle rejects an exhausted limit', async () => {
    globalThis.fetch = async (_url, init) => {
      assert.match(JSON.parse(init.body).key_hash, /^[0-9a-f]{64}$/);
      assert.doesNotMatch(init.body, /127\.0\.0\.1/);
      return Response.json(false);
    };
    await assert.rejects(() => service.throttleAuth(env, 'login:127.0.0.1'), {
      code: 'RATE_LIMITED',
    });
  });
});

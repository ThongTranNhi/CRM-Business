import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath, URL } from 'node:url';
import { realpathSync } from 'node:fs';
import { Buffer } from 'node:buffer';
import test from 'node:test';

// Use Node's built-in runner and the already-installed esbuild, no new dependencies.
const require = createRequire(realpathSync(fileURLToPath(new URL('../../../node_modules/wrangler/package.json', import.meta.url))));
const { Response } = globalThis;
const { buildSync } = require('esbuild');
const build = buildSync({ entryPoints: [fileURLToPath(new URL('./users.service.ts', import.meta.url))],
  bundle: true, write: false, platform: 'node', format: 'esm' });
const service = await import(`data:text/javascript;base64,${Buffer.from(build.outputFiles[0].text).toString('base64')}`);
const env = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'test-key', ALLOWED_ORIGINS: '' };
const userId = '00000000-0000-4000-8000-000000000001';
const account = { id: 'account-1', status: 'active', role: 'employee' };
const profile = { id: 'employee-1', full_name: 'Test', employee_code: null, job_title: null,
  departments: null, avatar_path: null };

test('profile authorization and updates', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });

  await t.test('blocked account is denied', async () => {
    globalThis.fetch = async () => Response.json([{ ...account, status: 'blocked' }]);
    await assert.rejects(() => service.getOwnProfile(env, userId), { code: 'FORBIDDEN' });
  });
  await t.test('employee cannot list everyone', async () => {
    globalThis.fetch = async () => Response.json([account]);
    await assert.rejects(() => service.getEmployeeDirectory(env, userId, 1), { code: 'FORBIDDEN' });
  });
  await t.test('employee cannot reset another password', async () => {
    globalThis.fetch = async () => Response.json([account]);
    await assert.rejects(() => service.resetEmployeePassword(env, userId, 'employee-2', 'TemporaryStrong123'), { code: 'FORBIDDEN' });
  });
  await t.test('unknown account is denied', async () => {
    globalThis.fetch = async () => Response.json([]);
    await assert.rejects(() => service.requireActiveAccount(env, userId), { code: 'FORBIDDEN' });
  });
  await t.test('cross-user avatar write rejected before any database call', async () => {
    globalThis.fetch = async () => { assert.fail('Must not access database'); };
    await assert.rejects(() => service.updateOwnProfile(env, userId,
      { employeeCode: 'NV01', avatarPath: 'another-user/avatar.png' }), { code: 'FORBIDDEN' });
  });
  await t.test('cross-user stored avatar must not be signed', async () => {
    globalThis.fetch = async (url) => Response.json(String(url).includes('/app_accounts?')
      ? [account] : [{ ...profile, avatar_path: 'another-user/avatar.png' }]);
    await assert.rejects(() => service.getOwnProfile(env, userId), { code: 'FORBIDDEN' });
  });
  await t.test('update RPC uses verified subject and preserves avatar when omitted', async () => {
    let rpcCalls = 0;
    globalThis.fetch = async (url, init) => {
      if (String(url).includes('/rpc/')) {
        rpcCalls += 1;
        assert.deepEqual(JSON.parse(init.body), { target_auth_user_id: userId,
          new_employee_code: 'NV01', new_avatar_path: null, replace_avatar: false });
        return new Response(null, { status: 204 });
      }
      return Response.json(String(url).includes('/app_accounts?') ? [account] : [profile]);
    };
    await service.updateOwnProfile(env, userId, { employeeCode: 'NV01' });
    assert.equal(rpcCalls, 1);
  });
  await t.test('duplicate code maps to a safe conflict error', async () => {
    globalThis.fetch = async (url) => String(url).includes('/rpc/')
      ? Response.json({ code: '23505', message: 'private database details' }, { status: 409 })
      : Response.json(String(url).includes('/app_accounts?') ? [account] : [profile]);
    await assert.rejects(() => service.updateOwnProfile(env, userId, { employeeCode: 'NV01' }),
      (error) => error.code === 'EMPLOYEE_CODE_EXISTS' && error.status === 409
        && !error.message.includes('private database details'));
  });
});

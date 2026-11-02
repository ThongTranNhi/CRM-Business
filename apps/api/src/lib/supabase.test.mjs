import assert from 'node:assert/strict';
import { URL } from 'node:url';
import test from 'node:test';
import { loadTsModule } from './load-ts-module.mjs';

const supabase = await loadTsModule(new URL('./supabase.ts', import.meta.url));
const authRepository = await loadTsModule(
  new URL('../modules/auth/auth.repository.ts', import.meta.url),
);

const env = {
  SUPABASE_URL: 'https://project.supabase.test',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-test-key',
  ALLOWED_ORIGINS: '',
};
const SERVICE_HEADERS = {
  apikey: 'service-role-test-key',
  Authorization: 'Bearer service-role-test-key',
};

/** Thay fetch, ghi lại header của mọi request rồi trả `body`. */
function captureFetch(t, body) {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    calls.push({ url, headers: init.headers });
    return new globalThis.Response(JSON.stringify(body), { status: 200 });
  });
  return calls;
}

test('Supabase service role requests send apikey + Bearer', async (t) => {
  await t.test('REST and RPC calls', async (t) => {
    const calls = captureFetch(t, []);
    await supabase.supabaseRequest(env, '/rest/v1/departments?select=id');
    await supabase.callRpc(env, { name: 'crm_test', args: {} });
    assert.equal(calls.length, 2);
    for (const { headers } of calls) {
      assert.equal(headers.apikey, SERVICE_HEADERS.apikey);
      assert.equal(headers.Authorization, SERVICE_HEADERS.Authorization);
    }
  });

  await t.test('Auth admin calls', async (t) => {
    const calls = captureFetch(t, { id: 'u' });
    await authRepository.authRequest(env, '/admin/users', { email: 'a@example.test' });
    assert.equal(calls[0].url, 'https://project.supabase.test/auth/v1/admin/users');
    assert.equal(calls[0].headers.apikey, SERVICE_HEADERS.apikey);
    assert.equal(calls[0].headers.Authorization, SERVICE_HEADERS.Authorization);
  });
});

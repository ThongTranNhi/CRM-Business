import assert from 'node:assert/strict';
import { URL } from 'node:url';
import test from 'node:test';
import { loadTsModule } from '../lib/load-ts-module.mjs';

const { allowedOrigins, isAllowedOrigin } = await loadTsModule(
  new URL('./env.ts', import.meta.url),
);

test('CORS allowed origins (Vercel Preview + Production)', async (t) => {
  const allowed = allowedOrigins(
    'https://crm.example.com, https://crm-business-git-*-team.vercel.app',
  );

  await t.test('exact origins match only themselves', () => {
    assert.equal(isAllowedOrigin('https://crm.example.com', allowed), true);
    assert.equal(isAllowedOrigin('https://crm.example.com.evil.test', allowed), false);
    assert.equal(isAllowedOrigin('http://crm.example.com', allowed), false);
  });

  await t.test('a narrow pattern matches one Preview label of the same project', () => {
    assert.equal(
      isAllowedOrigin('https://crm-business-git-feat-assets-team.vercel.app', allowed),
      true,
    );
    assert.equal(isAllowedOrigin('https://crm-business-git-a.b-team.vercel.app', allowed), false);
    assert.equal(isAllowedOrigin('https://other-app-team.vercel.app', allowed), false);
    assert.equal(
      isAllowedOrigin('https://crm-business-git-x-team.vercel.app.evil.test', allowed),
      false,
    );
  });

  await t.test('broad or unsafe patterns are ignored', () => {
    for (const entry of [
      '*',
      'https://*.vercel.app',
      'http://crm-*.example.com',
      'https://a*b*.x.app',
    ]) {
      assert.equal(isAllowedOrigin('https://anything.vercel.app', [entry]), false, entry);
    }
  });
});

import assert from 'node:assert/strict';
import { URL } from 'node:url';
import test from 'node:test';
import { loadTsModule } from './load-ts-module.mjs';

const { searchSchema } = await loadTsModule(new URL('./pagination.ts', import.meta.url));

test('searchSchema (?q= cho ilike)', async (t) => {
  await t.test('escapes the LIKE wildcards % and _', () => {
    assert.equal(searchSchema.parse('50%_off'), '50\\%\\_off');
  });
  await t.test('drops PostgREST filter syntax so no other filter can be injected', () => {
    assert.equal(searchSchema.parse('a,b.eq.(x)*"\\'), 'ab.eq.x');
  });
  await t.test('empty after cleaning → undefined', () => {
    assert.equal(searchSchema.parse('  ** '), undefined);
    assert.equal(searchSchema.parse(undefined), undefined);
  });
});

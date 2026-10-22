import assert from 'node:assert/strict';
import { URL } from 'node:url';
import test from 'node:test';
import { loadTsModule } from './load-ts-module.mjs';

const { doneVisibleSince } = await loadTsModule(new URL('./board-retention.ts', import.meta.url));

test('done column keeps this week + 4 previous weeks (Vietnam time)', () => {
  // Thứ Năm 22/10/2026 10:00 VN → Thứ Hai tuần này 19/10 → lùi 4 tuần: 21/09.
  assert.deepEqual(doneVisibleSince(new Date('2026-10-22T03:00:00Z')), {
    date: '2026-09-21',
    since: '2026-09-20T17:00:00.000Z',
  });
  // Chủ nhật 25/10 23:59 VN vẫn thuộc tuần 19/10.
  assert.equal(doneVisibleSince(new Date('2026-10-25T16:59:00Z')).date, '2026-09-21');
  // Thứ Hai 26/10 00:00 VN (17:00 UTC Chủ nhật) → tuần mới, tuần cũ nhất rời board.
  assert.equal(doneVisibleSince(new Date('2026-10-25T17:00:00Z')).date, '2026-09-28');
});

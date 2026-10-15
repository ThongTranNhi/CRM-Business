import assert from 'node:assert/strict';
import { URL } from 'node:url';
import test from 'node:test';
import { loadTsModule } from '../../lib/load-ts-module.mjs';

const { Response } = globalThis;
const service = await loadTsModule(new URL('./notifications.service.ts', import.meta.url));

const env = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'test-key',
  ALLOWED_ORIGINS: '',
};
const userId = '00000000-0000-4000-8000-000000000001';
const scope = { env, actor: { id: userId, email: null, role: 'employee', sessionId: 's-1' } };

const row = (facts = {}) => ({
  id: 'n-1',
  type: 'task_assigned',
  created_at: '2026-10-11T01:00:00Z',
  read_at: null,
  task_id: 't-1',
  task_title: 'Gọi khách',
  task_due_date: '2026-10-12',
  task_archived: false,
  dashboard_id: 'd-1',
  actor_account_id: 'a-1',
  actor_name: 'Nguyễn An',
  comment_excerpt: null,
  ...facts,
});
const listResponse = (rows, total = rows.length) =>
  Response.json(rows, { headers: { 'Content-Range': `0-${rows.length}/${total}` } });

test('notifications service (Đợt 3 S3)', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  await t.test('lists only the caller’s notifications with the unread count', async () => {
    const urls = [];
    globalThis.fetch = async (url) => {
      const path = decodeURIComponent(String(url));
      urls.push(path);
      return path.includes('select=id&')
        ? listResponse([{ id: 'n-1' }], 4)
        : listResponse(
            [row(), row({ id: 'n-2', type: 'task_due_soon', actor_account_id: null })],
            9,
          );
    };
    const page = await service.listNotifications(scope, { page: 1, pageSize: 10, unread: false });
    assert.ok(urls.every((path) => path.includes(`recipient_user_id=eq.${userId}`)));
    assert.equal(page.meta.unreadCount, 4);
    assert.equal(page.meta.total, 9);
    assert.deepEqual(page.data[0].task, {
      id: 't-1',
      title: 'Gọi khách',
      dueDate: '2026-10-12',
      isArchived: false,
    });
    assert.deepEqual(page.data[0].actor, { fullName: 'Nguyễn An' });
    assert.equal(page.data[1].actor, null, 'Thông báo hệ thống không có người thao tác');
  });

  await t.test('unread filter asks only for unread rows', async () => {
    const urls = [];
    globalThis.fetch = async (url) => {
      urls.push(decodeURIComponent(String(url)));
      return listResponse([]);
    };
    await service.listNotifications(scope, { page: 1, pageSize: 20, unread: true });
    assert.ok(urls.every((path) => path.includes('read_at=is.null')));
  });

  await t.test('mark read passes the caller and null ids for “all”', async () => {
    let body;
    globalThis.fetch = async (url, init) => {
      assert.ok(String(url).includes('/rpc/crm_mark_notifications_read'));
      body = JSON.parse(init.body);
      return Response.json(3);
    };
    assert.deepEqual(await service.markRead(scope, undefined), { updated: 3 });
    assert.deepEqual(body, { user_uuid: userId, notification_uuids: null });
  });
});

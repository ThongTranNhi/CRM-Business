import assert from 'node:assert/strict';
import { URL } from 'node:url';
import test from 'node:test';
import { loadTsModule } from '../../lib/load-ts-module.mjs';

const { Response } = globalThis;
const checklist = await loadTsModule(new URL('./tasks.checklist.service.ts', import.meta.url));
const comments = await loadTsModule(new URL('./tasks.comments.service.ts', import.meta.url));
const activities = await loadTsModule(new URL('./tasks.activities.service.ts', import.meta.url));

const env = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'test-key',
  ALLOWED_ORIGINS: '',
};
const ids = {
  user: '00000000-0000-4000-8000-000000000001',
  account: '00000000-0000-4000-8000-000000000002',
  employee: '00000000-0000-4000-8000-000000000003',
  other: '00000000-0000-4000-8000-000000000004',
  task: '00000000-0000-4000-8000-000000000007',
  item: '00000000-0000-4000-8000-000000000009',
  root: '00000000-0000-4000-8000-00000000000a',
  reply: '00000000-0000-4000-8000-00000000000b',
};
const scopeAs = (role) => ({ env, actor: { id: ids.user, email: null, role, sessionId: 's-1' } });
const access = (role, facts = {}) => ({
  accountId: ids.account,
  role,
  employeeId: ids.employee,
  boardId: '00000000-0000-4000-8000-000000000006',
  departmentId: '00000000-0000-4000-8000-000000000005',
  isReadOnly: false,
  isDepartmentMember: false,
  isDepartmentManager: false,
  isBoardMember: false,
  taskId: ids.task,
  isAssignee: false,
  isCollaborator: false,
  isCreator: false,
  ...facts,
});
const page = { page: 1, pageSize: 20 };
const listResponse = (rows) =>
  Response.json(rows, { headers: { 'Content-Range': `0-${rows.length}/${rows.length}` } });

/** Trả dữ liệu theo đoạn đường dẫn; ghi lại các RPC ghi đã gọi. */
function fakeDatabase(routes) {
  const rpcCalls = [];
  const fetch = async (url) => {
    const path = decodeURIComponent(String(url));
    if (path.includes('/rpc/') && !path.includes('crm_work_access')) rpcCalls.push(path);
    const match = Object.entries(routes).find(([fragment]) => path.includes(fragment));
    if (!match) return Response.json([]);
    const value = typeof match[1] === 'function' ? match[1]() : match[1];
    return value instanceof Response ? value : Response.json(value);
  };
  return { fetch, rpcCalls };
}

test('task drawer services (checklist, comments, activities)', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  await t.test('checklist: a member not on the task reads but cannot add (403)', async () => {
    const database = fakeDatabase({
      crm_work_access: access('employee', { isDepartmentMember: true }),
      task_checklist_items: [
        { id: ids.item, content: 'Gọi khách', is_done: false, position: 1024 },
      ],
    });
    globalThis.fetch = database.fetch;
    const items = await checklist.getChecklist(scopeAs('employee'), ids.task);
    assert.deepEqual(items, [
      { id: ids.item, content: 'Gọi khách', isDone: false, position: 1024 },
    ]);
    await assert.rejects(
      () => checklist.addItem(scopeAs('employee'), ids.task, { content: 'Mới' }),
      { code: 'FORBIDDEN' },
    );
    assert.deepEqual(database.rpcCalls, []);
  });
  await t.test('checklist: the assignee ticks an item through the RPC', async () => {
    const database = fakeDatabase({
      crm_work_access: access('employee', { isDepartmentMember: true, isAssignee: true }),
      crm_update_checklist_item: null,
    });
    globalThis.fetch = database.fetch;
    await checklist.updateItem(scopeAs('employee'), ids.task, ids.item, { isDone: true });
    assert.ok(database.rpcCalls.some((path) => path.endsWith('crm_update_checklist_item')));
  });
  await t.test('checklist: unknown item → 404 CHECKLIST_ITEM_NOT_FOUND', async () => {
    globalThis.fetch = fakeDatabase({
      crm_work_access: access('super_admin'),
      crm_remove_checklist_item: Response.json(
        { code: 'P0001', message: 'CHECKLIST_ITEM_NOT_FOUND' },
        { status: 400 },
      ),
    }).fetch;
    await assert.rejects(() => checklist.removeItem(scopeAs('super_admin'), ids.task, ids.item), {
      code: 'CHECKLIST_ITEM_NOT_FOUND',
      status: 404,
    });
  });
  await t.test('comments: replies nest under their root; author keeps employee id', async () => {
    const row = (id, parentId, body) => ({
      id,
      parent_id: parentId,
      body,
      created_at: '2026-10-08T03:00:00Z',
      author_id: ids.account,
      author_name: 'Nguyễn Văn An',
    });
    globalThis.fetch = fakeDatabase({
      crm_work_access: access('hr_admin'),
      'parent_id=is.null': () => listResponse([row(ids.root, null, 'Gốc')]),
      'parent_id=in.': [row(ids.reply, ids.root, 'Trả lời')],
      account_profiles: [{ account_id: ids.account, employee_id: ids.employee }],
    }).fetch;
    const result = await comments.listComments(scopeAs('hr_admin'), ids.task, page);
    assert.equal(result.meta.total, 1);
    assert.equal(result.data[0].replies[0].body, 'Trả lời');
    assert.equal(result.data[0].author.employeeId, ids.employee);
  });
  await t.test('comments: HR Admin outside the department reads but cannot comment', async () => {
    const database = fakeDatabase({ crm_work_access: access('hr_admin') });
    globalThis.fetch = database.fetch;
    await assert.rejects(
      () => comments.addComment(scopeAs('hr_admin'), ids.task, { body: 'Hi', parentId: null }),
      { code: 'FORBIDDEN' },
    );
    assert.deepEqual(database.rpcCalls, []);
  });
  await t.test('comments: replying to a reply → 400 COMMENT_REPLY_TOO_DEEP', async () => {
    globalThis.fetch = fakeDatabase({
      crm_work_access: access('employee', { isDepartmentMember: true }),
      crm_add_comment: Response.json(
        { code: 'P0001', message: 'COMMENT_REPLY_TOO_DEEP' },
        { status: 400 },
      ),
    }).fetch;
    await assert.rejects(
      () => comments.addComment(scopeAs('employee'), ids.task, { body: 'Hi', parentId: ids.reply }),
      { code: 'COMMENT_REPLY_TOO_DEEP', status: 400 },
    );
  });
  await t.test('activities: people ids become names; column moves keep column names', async () => {
    const activity = (action, from, to) => ({
      id: ids.item,
      action,
      from_value: from,
      to_value: to,
      created_at: '2026-10-08T03:00:00Z',
      actor_id: ids.account,
      actor_name: 'Trần Thị B',
    });
    globalThis.fetch = fakeDatabase({
      crm_work_access: access('super_admin'),
      task_activity_feed: () =>
        listResponse([
          activity('assignee_changed', { assigneeId: ids.employee }, { assigneeId: ids.other }),
          activity(
            'moved',
            { columnId: ids.item, columnName: 'VIỆC CẦN LÀM', status: 'todo' },
            { columnId: ids.item, columnName: 'VIỆC ĐANG LÀM', status: 'in_progress' },
          ),
        ]),
      '/rest/v1/employees': [
        { id: ids.employee, full_name: 'Nguyễn Văn An' },
        { id: ids.other, full_name: 'Lê Văn C' },
      ],
    }).fetch;
    const result = await activities.listActivities(scopeAs('super_admin'), ids.task, page);
    assert.deepEqual(result.data[0].from.assignee, { id: ids.employee, fullName: 'Nguyễn Văn An' });
    assert.equal(result.data[0].to.assignee.fullName, 'Lê Văn C');
    assert.equal(result.data[1].to.columnName, 'VIỆC ĐANG LÀM');
    assert.equal(result.data[1].actor.fullName, 'Trần Thị B');
  });
  await t.test('activities of an archived task → 404', async () => {
    globalThis.fetch = fakeDatabase({
      crm_work_access: access('super_admin', { isArchived: true }),
    }).fetch;
    await assert.rejects(() => activities.listActivities(scopeAs('super_admin'), ids.task, page), {
      code: 'TASK_NOT_FOUND',
    });
  });
});

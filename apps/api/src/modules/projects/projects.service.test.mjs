import assert from 'node:assert/strict';
import { URL } from 'node:url';
import test from 'node:test';
import { loadTsModule } from '../../lib/load-ts-module.mjs';

const { Response } = globalThis;
const service = await loadTsModule(new URL('./projects.service.ts', import.meta.url));

const env = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'test-key',
  ALLOWED_ORIGINS: '',
};
const ids = {
  user: '00000000-0000-4000-8000-000000000001',
  me: '00000000-0000-4000-8000-000000000003',
  owner: '00000000-0000-4000-8000-000000000004',
  deptA: '00000000-0000-4000-8000-000000000005',
  deptB: '00000000-0000-4000-8000-000000000006',
  project: '00000000-0000-4000-8000-000000000007',
};
const scopeAs = (role) => ({ env, actor: { id: ids.user, email: null, role, sessionId: 's-1' } });

/** Hàng active_employees của người gọi: phòng + (nếu là trưởng phòng) department_manager_id = mình. */
const me = (departmentId, { manages = false } = {}) => [
  {
    id: ids.me,
    full_name: 'Người gọi',
    department_id: departmentId,
    department_name: 'Phòng',
    department_manager_id: manages ? ids.me : null,
  },
];
const summary = (facts = {}) => ({
  id: ids.project,
  department_id: ids.deptA,
  department_name: 'Phòng A',
  department_archived_at: null,
  dashboard_id: null,
  name: 'Ra mắt web',
  description: null,
  status: 'active',
  start_date: null,
  due_date: null,
  archived_at: null,
  created_at: '2026-10-09T01:00:00Z',
  owner_employee_id: ids.owner,
  owner_name: 'Chủ dự án',
  task_total: 4,
  task_done: 1,
  task_overdue: 1,
  member_count: 1,
  ...facts,
});
const listResponse = (rows) =>
  Response.json(rows, { headers: { 'Content-Range': `0-${rows.length}/${rows.length}` } });

/** Trả dữ liệu theo đoạn đường dẫn; ghi lại RPC ghi và các URL đã gọi. */
function fakeDatabase(routes) {
  const calls = [];
  const fetch = async (url) => {
    const path = decodeURIComponent(String(url));
    calls.push(path);
    const match = Object.entries(routes).find(([fragment]) => path.includes(fragment));
    if (!match) return Response.json([]);
    const value = typeof match[1] === 'function' ? match[1]() : match[1];
    return value instanceof Response ? value : Response.json(value);
  };
  return { fetch, calls, rpcs: () => calls.filter((path) => path.includes('/rpc/')) };
}

test('projects service (Đợt 3 S1)', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  await t.test('employee cannot create a project (403, no RPC)', async () => {
    const database = fakeDatabase({ active_employees: me(ids.deptA) });
    globalThis.fetch = database.fetch;
    const input = { departmentId: ids.deptA, name: 'X', memberIds: [] };
    await assert.rejects(() => service.createProject(scopeAs('employee'), input), {
      code: 'FORBIDDEN',
    });
    assert.deepEqual(database.rpcs(), []);
  });
  await t.test('manager cannot create a project in another department', async () => {
    const database = fakeDatabase({ active_employees: me(ids.deptA, { manages: true }) });
    globalThis.fetch = database.fetch;
    const input = { departmentId: ids.deptB, name: 'X', memberIds: [] };
    await assert.rejects(() => service.createProject(scopeAs('department_manager'), input), {
      code: 'FORBIDDEN',
    });
    assert.deepEqual(database.rpcs(), []);
  });
  await t.test('detail computes progress from real tasks (BR-31)', async () => {
    globalThis.fetch = fakeDatabase({
      active_employees: me(ids.deptA),
      project_summaries: [summary()],
      'project_members?select=employee_id': [{ employee_id: ids.owner }],
    }).fetch;
    const project = await service.getProject(scopeAs('employee'), ids.project);
    assert.deepEqual(project.progress, { total: 4, done: 1, overdue: 1, percent: 25 });
    assert.deepEqual(project.permissions, {
      canEdit: false,
      canManageMembers: false,
      canArchive: false,
    });
  });
  await t.test('employee of another department cannot open the project (403)', async () => {
    globalThis.fetch = fakeDatabase({
      active_employees: me(ids.deptB),
      project_summaries: [summary()],
      'project_members?select=employee_id': [{ employee_id: ids.owner }],
    }).fetch;
    await assert.rejects(() => service.getProject(scopeAs('employee'), ids.project), {
      code: 'FORBIDDEN',
    });
  });
  await t.test('HR Admin reads but cannot edit (403)', async () => {
    const database = fakeDatabase({
      active_employees: [],
      project_summaries: [summary()],
    });
    globalThis.fetch = database.fetch;
    await assert.rejects(
      () => service.updateProject(scopeAs('hr_admin'), ids.project, { status: 'done' }),
      { code: 'FORBIDDEN' },
    );
    assert.deepEqual(database.rpcs(), []);
  });
  await t.test('the owner edits their project through the RPC', async () => {
    const database = fakeDatabase({
      active_employees: [{ ...me(ids.deptA)[0], id: ids.owner }],
      project_summaries: [summary()],
      crm_update_project: null,
    });
    globalThis.fetch = database.fetch;
    await service.updateProject(scopeAs('employee'), ids.project, { status: 'done' });
    assert.ok(database.rpcs().some((path) => path.endsWith('crm_update_project')));
  });
  await t.test('archived department → 409 before permissions; archived project → 404', async () => {
    globalThis.fetch = fakeDatabase({
      active_employees: [],
      project_summaries: [summary({ department_archived_at: '2026-10-01T00:00:00Z' })],
    }).fetch;
    await assert.rejects(() => service.archiveProject(scopeAs('super_admin'), ids.project), {
      code: 'PROJECT_READ_ONLY',
      status: 409,
    });
    globalThis.fetch = fakeDatabase({
      active_employees: [],
      project_summaries: [summary({ archived_at: '2026-10-02T00:00:00Z' })],
    }).fetch;
    await assert.rejects(
      () => service.updateProject(scopeAs('super_admin'), ids.project, { name: 'Mới' }),
      { code: 'PROJECT_NOT_FOUND', status: 404 },
    );
  });
  await t.test('employees list only their department and projects they joined', async () => {
    const database = fakeDatabase({
      active_employees: me(ids.deptB),
      'project_members?select=project_id': [{ project_id: ids.project }],
      project_summaries: () => listResponse([summary()]),
    });
    globalThis.fetch = database.fetch;
    const page = await service.listProjects(scopeAs('employee'), { page: 1, pageSize: 20 });
    assert.equal(page.meta.total, 1);
    const listUrl = database.calls.find((path) => path.includes('project_summaries'));
    assert.ok(listUrl.includes(`or=(department_id.eq.${ids.deptB},id.in.(${ids.project}))`));
    assert.ok(listUrl.includes('archived_at=is.null'));
  });
  await t.test('HR Admin lists every project (no visibility filter)', async () => {
    const database = fakeDatabase({ project_summaries: () => listResponse([]) });
    globalThis.fetch = database.fetch;
    await service.listProjects(scopeAs('hr_admin'), { page: 1, pageSize: 20, status: 'archived' });
    const listUrl = database.calls.find((path) => path.includes('project_summaries'));
    assert.ok(!listUrl.includes('or=('));
    assert.ok(listUrl.includes('archived_at=not.is.null'));
  });
  await t.test('duplicate name in the department → 409 PROJECT_NAME_EXISTS', async () => {
    globalThis.fetch = fakeDatabase({
      crm_create_project: Response.json(
        {
          code: '23505',
          message: 'duplicate key value violates unique constraint "projects_department_name_key"',
        },
        { status: 409 },
      ),
    }).fetch;
    const input = { departmentId: ids.deptA, name: 'Ra mắt web', memberIds: [] };
    await assert.rejects(() => service.createProject(scopeAs('super_admin'), input), {
      code: 'PROJECT_NAME_EXISTS',
      status: 409,
    });
  });
});

import assert from 'node:assert/strict';
import { URL } from 'node:url';
import test from 'node:test';
import { loadTsModule } from '../../lib/load-ts-module.mjs';

const { Response } = globalThis;
const service = await loadTsModule(new URL('./tasks.service.ts', import.meta.url));

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
  department: '00000000-0000-4000-8000-000000000005',
  board: '00000000-0000-4000-8000-000000000006',
  task: '00000000-0000-4000-8000-000000000007',
  column: '00000000-0000-4000-8000-000000000008',
};
const scopeAs = (role) => ({ env, actor: { id: ids.user, email: null, role, sessionId: 's-1' } });

const access = (role, facts = {}) => ({
  accountId: ids.account,
  role,
  employeeId: ids.employee,
  boardId: ids.board,
  departmentId: ids.department,
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
const cardRow = {
  id: ids.task,
  column_id: ids.column,
  status: 'todo',
  title: 'Gọi khách hàng',
  position: 0,
  priority: 'normal',
  due_date: null,
  completed_at: null,
  assignee_id: ids.other,
  assignee_name: 'Nguyễn Văn An',
  assignee_archived: false,
  collaborators: [{ id: ids.employee, name: 'Người xem', avatarPath: null }],
  checklist_total: 0,
  checklist_done: 0,
  comment_count: 0,
  created_by: ids.account,
};
const rpcError = (message, code = 'P0001') => Response.json({ code, message }, { status: 400 });
const moveInput = { toColumnId: ids.column, previousTaskId: null, nextTaskId: null };
const createInput = {
  title: 'Gọi khách hàng',
  assigneeId: ids.other,
  collaboratorIds: [],
  priority: 'normal',
  startDate: null,
  dueDate: null,
  description: null,
};

/** Trả dữ liệu theo đoạn đường dẫn; ghi lại các RPC đã gọi. */
function fakeDatabase(routes) {
  const rpcCalls = [];
  const fetch = async (url) => {
    const path = String(url);
    if (path.includes('/rpc/') && !path.includes('crm_work_access')) rpcCalls.push(path);
    const match = Object.entries(routes).find(([fragment]) => path.includes(fragment));
    if (!match) return Response.json([]);
    const [, value] = match;
    return value instanceof Response ? value : Response.json(value);
  };
  return { fetch, rpcCalls };
}

test('tasks service (permission-model.md, BR-11 → BR-15, BR-19)', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  await t.test('employee of another department cannot open the board (403)', async () => {
    globalThis.fetch = fakeDatabase({ crm_work_access: access('employee') }).fetch;
    await assert.rejects(() => service.getBoard(scopeAs('employee'), ids.board, 20), {
      code: 'FORBIDDEN',
      status: 403,
    });
  });
  await t.test('HR Admin reads but cannot create a task outside their department', async () => {
    const database = fakeDatabase({ crm_work_access: access('hr_admin'), board_columns: [] });
    globalThis.fetch = database.fetch;
    const board = await service.getBoard(scopeAs('hr_admin'), ids.board, 20);
    assert.deepEqual(board.tasks, []);
    await assert.rejects(() => service.createTask(scopeAs('hr_admin'), ids.board, createInput), {
      code: 'FORBIDDEN',
    });
    assert.deepEqual(database.rpcCalls, []);
  });
  await t.test('manager of another department cannot move a task (403)', async () => {
    const database = fakeDatabase({ crm_work_access: access('department_manager') });
    globalThis.fetch = database.fetch;
    await assert.rejects(
      () => service.moveTask(scopeAs('department_manager'), ids.task, moveInput),
      {
        code: 'FORBIDDEN',
      },
    );
    assert.deepEqual(database.rpcCalls, []);
  });
  await t.test(
    'member employee only moves tasks they are assigned to or collaborate on',
    async () => {
      globalThis.fetch = fakeDatabase({
        crm_work_access: access('employee', { isDepartmentMember: true }),
      }).fetch;
      await assert.rejects(() => service.moveTask(scopeAs('employee'), ids.task, moveInput), {
        code: 'FORBIDDEN',
      });
    },
  );
  await t.test('Super Admin creates a task and may move it', async () => {
    const database = fakeDatabase({
      crm_work_access: access('super_admin'),
      crm_create_task: ids.task,
      task_cards: [cardRow],
    });
    globalThis.fetch = database.fetch;
    const card = await service.createTask(scopeAs('super_admin'), ids.board, createInput);
    assert.equal(card.id, ids.task);
    assert.equal(card.canMove, true);
    assert.equal(card.collaborators[0].fullName, 'Người xem');
    assert.ok(database.rpcCalls.some((path) => path.endsWith('crm_create_task')));
  });
  await t.test('move returns the old slot so the UI can undo to the same place', async () => {
    globalThis.fetch = fakeDatabase({
      crm_work_access: access('super_admin'),
      'select=column_id%2Cposition': [{ column_id: ids.column, position: 3 }],
      'position=lt.3': [{ id: ids.other }],
      'position=gt.3': [],
      crm_move_task: {
        id: ids.task,
        columnId: ids.column,
        status: 'done',
        position: 1,
        startedAt: null,
        completedAt: '2026-10-09T01:00:00Z',
        completedBy: ids.account,
      },
    }).fetch;
    const moved = await service.moveTask(scopeAs('super_admin'), ids.task, moveInput);
    assert.deepEqual(moved.from, {
      columnId: ids.column,
      previousTaskId: ids.other,
      nextTaskId: null,
    });
  });
  await t.test(
    'project of another department → 422 PROJECT_NOT_IN_DEPARTMENT (BR-30)',
    async () => {
      globalThis.fetch = fakeDatabase({
        crm_work_access: access('super_admin'),
        crm_create_task: rpcError('PROJECT_NOT_IN_DEPARTMENT'),
      }).fetch;
      const input = { ...createInput, projectId: ids.other };
      await assert.rejects(() => service.createTask(scopeAs('super_admin'), ids.board, input), {
        code: 'PROJECT_NOT_IN_DEPARTMENT',
        status: 422,
      });
    },
  );
  await t.test('moving to a column of another board → 400 INVALID_COLUMN', async () => {
    globalThis.fetch = fakeDatabase({
      crm_work_access: access('super_admin'),
      crm_move_task: rpcError('INVALID_COLUMN'),
    }).fetch;
    await assert.rejects(() => service.moveTask(scopeAs('super_admin'), ids.task, moveInput), {
      code: 'INVALID_COLUMN',
      status: 400,
    });
  });
  await t.test('collaborator sees the card as movable on the board', async () => {
    globalThis.fetch = fakeDatabase({
      crm_work_access: access('employee', { isDepartmentMember: true }),
      'status=in.': [cardRow],
      board_columns: [],
    }).fetch;
    const board = await service.getBoard(scopeAs('employee'), ids.board, 20);
    assert.equal(board.tasks[0].canMove, true);
  });
  await t.test('archived or unknown task → 404 TASK_NOT_FOUND', async () => {
    globalThis.fetch = fakeDatabase({
      crm_work_access: access('super_admin', { taskId: null }),
    }).fetch;
    await assert.rejects(() => service.getTask(scopeAs('super_admin'), ids.task), {
      code: 'TASK_NOT_FOUND',
      status: 404,
    });
  });
  await t.test('due date before start date (named check) → 400 INVALID_DATE_RANGE', async () => {
    globalThis.fetch = fakeDatabase({
      crm_work_access: access('super_admin'),
      crm_update_task: rpcError(
        'new row for relation "tasks" violates check constraint "tasks_date_range_check"',
        '23514',
      ),
    }).fetch;
    await assert.rejects(
      () => service.updateTask(scopeAs('super_admin'), ids.task, { dueDate: '2026-01-01' }),
      { code: 'INVALID_DATE_RANGE', status: 400 },
    );
  });
  await t.test('only the creator, the manager or Super Admin archives (BR-19)', async () => {
    globalThis.fetch = fakeDatabase({
      crm_work_access: access('employee', { isDepartmentMember: true, isAssignee: true }),
    }).fetch;
    await assert.rejects(() => service.archiveTask(scopeAs('employee'), ids.task), {
      code: 'FORBIDDEN',
    });
  });
  await t.test('the creator sees the card as deletable; others do not (BR-19)', async () => {
    const database = (createdBy) =>
      fakeDatabase({
        crm_work_access: access('employee', { isDepartmentMember: true }),
        'status=in.': [{ ...cardRow, created_by: createdBy }],
        board_columns: [],
      }).fetch;
    globalThis.fetch = database(ids.account);
    assert.equal(
      (await service.getBoard(scopeAs('employee'), ids.board, 20)).tasks[0].canArchive,
      true,
    );
    globalThis.fetch = database(ids.other);
    assert.equal(
      (await service.getBoard(scopeAs('employee'), ids.board, 20)).tasks[0].canArchive,
      false,
    );
  });
  await t.test('restore: only an archived task, with the same rights as deleting', async () => {
    const database = fakeDatabase({
      crm_work_access: access('employee', {
        isDepartmentMember: true,
        isCreator: true,
        isArchived: true,
      }),
      crm_restore_task: null,
      task_cards: [cardRow],
    });
    globalThis.fetch = database.fetch;
    const card = await service.restoreTask(scopeAs('employee'), ids.task);
    assert.equal(card.id, ids.task);
    assert.equal(card.canArchive, true);
    assert.ok(database.rpcCalls.some((path) => path.endsWith('crm_restore_task')));
  });
  await t.test('restore by someone who may not delete → 403, no RPC', async () => {
    const database = fakeDatabase({
      crm_work_access: access('employee', { isDepartmentMember: true, isArchived: true }),
    });
    globalThis.fetch = database.fetch;
    await assert.rejects(() => service.restoreTask(scopeAs('employee'), ids.task), {
      code: 'FORBIDDEN',
    });
    assert.deepEqual(database.rpcCalls, []);
  });
  await t.test(
    'restore a task that is not archived → 404; archived task is hidden elsewhere',
    async () => {
      globalThis.fetch = fakeDatabase({ crm_work_access: access('super_admin') }).fetch;
      await assert.rejects(() => service.restoreTask(scopeAs('super_admin'), ids.task), {
        code: 'TASK_NOT_FOUND',
      });
      globalThis.fetch = fakeDatabase({
        crm_work_access: access('super_admin', { isArchived: true }),
      }).fetch;
      await assert.rejects(() => service.getTask(scopeAs('super_admin'), ids.task), {
        code: 'TASK_NOT_FOUND',
      });
    },
  );
  await t.test(
    'read-only dashboard (archived department) → 409 before permissions (BR-06)',
    async () => {
      const database = fakeDatabase({
        crm_work_access: access('super_admin', { isReadOnly: true }),
      });
      globalThis.fetch = database.fetch;
      const readOnly = { code: 'DASHBOARD_READ_ONLY', status: 409 };
      await assert.rejects(
        () => service.createTask(scopeAs('super_admin'), ids.board, createInput),
        readOnly,
      );
      await assert.rejects(
        () => service.moveTask(scopeAs('super_admin'), ids.task, moveInput),
        readOnly,
      );
      await assert.rejects(() => service.archiveTask(scopeAs('super_admin'), ids.task), readOnly);
      // Nhân viên không có quyền ghi vẫn nhận 409 (chỉ đọc được kiểm tra trước quyền).
      globalThis.fetch = fakeDatabase({
        crm_work_access: access('employee', { isReadOnly: true, isDepartmentMember: true }),
      }).fetch;
      await assert.rejects(
        () => service.moveTask(scopeAs('employee'), ids.task, moveInput),
        readOnly,
      );
      assert.deepEqual(database.rpcCalls, []);
    },
  );
  await t.test(
    'assignee edits fields and collaborators but cannot change the assignee',
    async () => {
      const assignee = access('employee', { isDepartmentMember: true, isAssignee: true });
      const database = fakeDatabase({ crm_work_access: assignee });
      globalThis.fetch = database.fetch;
      await assert.rejects(
        () => service.updateTask(scopeAs('employee'), ids.task, { assigneeId: ids.other }),
        { code: 'FORBIDDEN' },
      );
      assert.deepEqual(database.rpcCalls, []);
      globalThis.fetch = fakeDatabase({
        crm_work_access: assignee,
        crm_set_task_collaborators: null,
      }).fetch;
      await assert.rejects(
        () => service.setCollaborators(scopeAs('employee'), ids.task, [ids.other]),
        { code: 'TASK_NOT_FOUND' }, // RPC chạy; chi tiết sau đó không có trong DB giả → 404
      );
    },
  );
  await t.test('trash: member sees only what they created; manager sees everything', async () => {
    const trashRow = {
      id: ids.task,
      title: 'Gọi khách hàng',
      archived_at: '2026-10-07T08:00:00Z',
      column_name: 'VIỆC CẦN LÀM',
      assignee_id: ids.other,
      assignee_name: 'Nguyễn Văn An',
      archived_by_id: ids.account,
      archived_by_name: 'Người xem',
    };
    const trashAs = async (facts) => {
      const paths = [];
      const database = fakeDatabase({ crm_work_access: access(facts.role, facts) });
      globalThis.fetch = async (url) => {
        if (!String(url).includes('task_trash')) return database.fetch(url);
        paths.push(decodeURIComponent(String(url)));
        return Response.json([trashRow], { headers: { 'Content-Range': '0-0/1' } });
      };
      const page = await service.listTrash(scopeAs(facts.role), ids.board, {
        page: 1,
        pageSize: 20,
        q: 'khách',
      });
      return { page, path: paths[0] };
    };
    const member = await trashAs({ role: 'employee', isDepartmentMember: true });
    assert.ok(member.path.includes(`created_by=eq.${ids.account}`));
    assert.ok(member.path.includes('title=ilike.*khách*'));
    assert.deepEqual(member.page.meta, { page: 1, pageSize: 20, total: 1 });
    assert.deepEqual(member.page.data[0].archivedBy, { id: ids.account, fullName: 'Người xem' });
    assert.equal(member.page.data[0].columnName, 'VIỆC CẦN LÀM');
    const manager = await trashAs({
      role: 'department_manager',
      isDepartmentMember: true,
      isDepartmentManager: true,
    });
    assert.ok(!manager.path.includes('created_by'));
  });
  await t.test(
    'trash: HR Admin outside the department → 403; archived department → 409',
    async () => {
      const query = { page: 1, pageSize: 20 };
      globalThis.fetch = fakeDatabase({ crm_work_access: access('hr_admin') }).fetch;
      await assert.rejects(() => service.listTrash(scopeAs('hr_admin'), ids.board, query), {
        code: 'FORBIDDEN',
      });
      globalThis.fetch = fakeDatabase({
        crm_work_access: access('super_admin', { isReadOnly: true }),
      }).fetch;
      await assert.rejects(() => service.listTrash(scopeAs('super_admin'), ids.board, query), {
        code: 'DASHBOARD_READ_ONLY',
      });
    },
  );
  await t.test('the creator may hand the task to someone else (Q: reassign)', async () => {
    const database = fakeDatabase({
      crm_work_access: access('employee', { isDepartmentMember: true, isCreator: true }),
      crm_update_task: null,
    });
    globalThis.fetch = database.fetch;
    await assert.rejects(
      () => service.updateTask(scopeAs('employee'), ids.task, { assigneeId: ids.other }),
      { code: 'TASK_NOT_FOUND' }, // đã qua kiểm tra quyền và gọi RPC; DB giả không có chi tiết task
    );
    assert.ok(database.rpcCalls.some((path) => path.endsWith('crm_update_task')));
  });
});

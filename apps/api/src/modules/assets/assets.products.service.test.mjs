import assert from 'node:assert/strict';
import { URL } from 'node:url';
import test from 'node:test';
import { loadTsModule } from '../../lib/load-ts-module.mjs';

const { Response } = globalThis;
const service = await loadTsModule(new URL('./assets.products.service.ts', import.meta.url));
const schema = await loadTsModule(new URL('./assets.schema.ts', import.meta.url));

const env = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'test-key',
  ALLOWED_ORIGINS: '',
};
const ids = {
  user: '00000000-0000-4000-8000-000000000001',
  me: '00000000-0000-4000-8000-000000000002',
  owner: '00000000-0000-4000-8000-000000000003',
  deptA: '00000000-0000-4000-8000-0000000000a1',
  deptB: '00000000-0000-4000-8000-0000000000b1',
  product: '00000000-0000-4000-8000-0000000000c1',
};
const scopeAs = (role) => ({ env, actor: { id: ids.user, email: null, role, sessionId: 's-1' } });
/** Hồ sơ người gọi trong active_employees; `manages` = phòng đang làm trưởng phòng. */
const me = ({ employeeId = ids.me, manages = null } = {}) => ({
  id: employeeId,
  full_name: 'Người gọi',
  department_id: manages ?? ids.deptB,
  department_name: 'Phòng',
  department_manager_id: manages ? employeeId : null,
});
const productRow = (facts = {}) => ({
  id: ids.product,
  department_id: ids.deptA,
  department_name: 'Kinh doanh',
  project_id: null,
  project_name: null,
  name: 'Web bán hàng',
  url: 'https://shop.example.test',
  description: 'Trang bán hàng',
  status: 'active',
  updated_at: '2026-10-17T00:00:00Z',
  owner_employee_id: ids.owner,
  owner_name: 'Chủ sản phẩm',
  owner_archived: false,
  members: [],
  ...facts,
});

/** Trả dữ liệu theo đoạn đường dẫn (danh sách có Content-Range); ghi lại URL + body mọi lần gọi. */
function fakeDatabase({ caller = me(), rows = [productRow()] } = {}) {
  const calls = [];
  const fetch = async (url, init) => {
    const path = decodeURIComponent(String(url));
    calls.push({ path, body: init?.body ? JSON.parse(init.body) : null });
    if (path.includes('/active_employees') && path.includes('auth_user_id')) {
      return Response.json(caller ? [caller] : []);
    }
    if (path.includes('/active_employees')) {
      return Response.json([
        { id: ids.owner, full_name: 'Chủ sản phẩm', department_name: 'Kinh doanh' },
      ]);
    }
    if (path.includes('/projects?')) return Response.json([{ id: 'p-1', name: 'Ra mắt web' }]);
    if (path.includes('/rpc/crm_create_product')) return Response.json(ids.product);
    if (path.includes('/rpc/')) return new Response(null, { status: 204 });
    return Response.json(rows, {
      headers: { 'Content-Range': `0-${rows.length - 1}/${rows.length}` },
    });
  };
  const rpc = (name) => calls.find(({ path }) => path.includes(`/rpc/${name}`));
  return { fetch, calls, rpc };
}
const rejectsWithStatus = (promise, status) =>
  assert.rejects(promise, (error) => error.status === status);
const createInput = (facts = {}) =>
  schema.createProductSchema.parse({
    departmentId: ids.deptA,
    name: 'Web bán hàng',
    url: 'https://shop.example.test',
    ownerEmployeeId: ids.owner,
    ...facts,
  });

test('products service (Tài sản → Sản phẩm)', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  await t.test('everyone lists products; permissions follow the viewer', async () => {
    const database = fakeDatabase({ caller: me({ employeeId: ids.owner }) });
    globalThis.fetch = database.fetch;
    const page = await service.listProducts(
      scopeAs('employee'),
      schema.listProductsQuerySchema.parse({ q: 'web', status: 'active' }),
    );
    assert.deepEqual(page.data[0].permissions, {
      canEdit: false,
      canEditContent: true,
      canArchive: false,
    });
    assert.deepEqual(page.data[0].owner, {
      id: ids.owner,
      fullName: 'Chủ sản phẩm',
      isArchived: false,
    });
    const list = database.calls.find(({ path }) => path.includes('product_summaries'));
    assert.ok(list.path.includes('archived_at=is.null'));
    assert.ok(list.path.includes('department_archived_at=is.null'));
    assert.ok(list.path.includes('name=ilike.*web*'));
    assert.ok(list.path.includes('status=eq.active'));
  });

  await t.test('manager creates only in the department they lead', async () => {
    const database = fakeDatabase({ caller: me({ manages: ids.deptB }) });
    globalThis.fetch = database.fetch;
    await rejectsWithStatus(
      service.createProduct(scopeAs('department_manager'), createInput()),
      403,
    );
    assert.equal(database.rpc('crm_create_product'), undefined);
  });

  await t.test('super admin creates; RPC gets every field', async () => {
    const database = fakeDatabase();
    globalThis.fetch = database.fetch;
    const product = await service.createProduct(
      scopeAs('super_admin'),
      createInput({ memberIds: [ids.me] }),
    );
    assert.equal(product.id, ids.product);
    assert.deepEqual(database.rpc('crm_create_product').body, {
      actor_uuid: ids.user,
      department_uuid: ids.deptA,
      product_name: 'Web bán hàng',
      product_url: 'https://shop.example.test',
      product_description: null,
      product_status: 'developing',
      owner_uuid: ids.owner,
      project_uuid: null,
      member_uuids: [ids.me],
    });
  });

  await t.test('owner may change link / description but nothing else', async () => {
    const database = fakeDatabase({ caller: me({ employeeId: ids.owner }) });
    globalThis.fetch = database.fetch;
    await service.updateProduct(scopeAs('employee'), ids.product, {
      url: 'https://new.example.test',
      description: null,
    });
    assert.deepEqual(database.rpc('crm_update_product').body.changes, {
      url: 'https://new.example.test',
      description: null,
    });
    const second = fakeDatabase({ caller: me({ employeeId: ids.owner }) });
    globalThis.fetch = second.fetch;
    await rejectsWithStatus(
      service.updateProduct(scopeAs('employee'), ids.product, { status: 'paused' }),
      403,
    );
    assert.equal(second.rpc('crm_update_product'), undefined);
  });

  await t.test('co-responsible person counts as responsible', async () => {
    const database = fakeDatabase({
      rows: [productRow({ members: [{ id: ids.me, name: 'Tôi', isArchived: false }] })],
    });
    globalThis.fetch = database.fetch;
    await service.updateProduct(scopeAs('team_leader'), ids.product, { description: 'Mới' });
    assert.ok(database.rpc('crm_update_product'));
  });

  await t.test('other employees cannot edit or delete; missing product → 404', async () => {
    const database = fakeDatabase();
    globalThis.fetch = database.fetch;
    await rejectsWithStatus(
      service.updateProduct(scopeAs('employee'), ids.product, { description: 'x' }),
      403,
    );
    await rejectsWithStatus(service.archiveProduct(scopeAs('hr_admin'), ids.product), 403);
    globalThis.fetch = fakeDatabase({ rows: [] }).fetch;
    await rejectsWithStatus(service.archiveProduct(scopeAs('super_admin'), ids.product), 404);
  });

  await t.test('manager of the department archives', async () => {
    const database = fakeDatabase({ caller: me({ manages: ids.deptA }) });
    globalThis.fetch = database.fetch;
    await service.archiveProduct(scopeAs('department_manager'), ids.product);
    assert.deepEqual(database.rpc('crm_archive_product').body, {
      actor_uuid: ids.user,
      product_uuid: ids.product,
    });
  });

  await t.test(
    'form options: people from every department + projects of that department',
    async () => {
      const database = fakeDatabase({ caller: me({ manages: ids.deptA }) });
      globalThis.fetch = database.fetch;
      const options = await service.getFormOptions(scopeAs('department_manager'), ids.deptA);
      assert.deepEqual(options.people, [
        { id: ids.owner, fullName: 'Chủ sản phẩm', departmentName: 'Kinh doanh' },
      ]);
      assert.deepEqual(options.projects, [{ id: 'p-1', name: 'Ra mắt web' }]);
      await rejectsWithStatus(
        service.getFormOptions(scopeAs('department_manager'), ids.deptB),
        403,
      );
      await rejectsWithStatus(service.getFormOptions(scopeAs('employee'), ids.deptA), 403);
    },
  );

  await t.test('schema rejects non-http links and empty updates', () => {
    assert.throws(() => createInput({ url: 'javascript:alert(1)' }));
    assert.throws(() => createInput({ url: 'shop.example.test' }));
    assert.throws(() => schema.updateProductSchema.parse({}));
    assert.throws(() => createInput({ status: 'deleted' }));
  });
});

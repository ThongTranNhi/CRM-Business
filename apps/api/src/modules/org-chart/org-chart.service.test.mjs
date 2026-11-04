import assert from 'node:assert/strict';
import { URL } from 'node:url';
import test from 'node:test';
import { loadTsModule } from '../../lib/load-ts-module.mjs';

const { buildOrgChart } = await loadTsModule(new URL('./org-chart.service.ts', import.meta.url));

const person = (id, overrides = {}) => ({
  id,
  fullName: id,
  jobTitle: null,
  role: 'employee',
  departmentId: 'sales',
  isDepartmentManager: false,
  authUserId: null,
  avatarPath: null,
  ...overrides,
});
const departments = [
  { id: 'sales', name: 'Kinh doanh' },
  { id: 'empty', name: 'Pháp chế' },
];
const names = (people) => people.map((item) => item.id);

test('org chart tree (frontend-spec 4.11)', async (t) => {
  const chart = buildOrgChart(
    departments,
    [
      person('CEO', { role: 'super_admin', departmentId: null }),
      person('Bình'),
      person('An', { isDepartmentManager: true, role: 'department_manager' }),
      person('Yến', { role: 'team_leader' }),
      person('Cường', { departmentId: null }),
      person('Dũng', { departmentId: 'archived-department' }),
    ],
    new Map([['Bình', 'https://signed/binh.png']]),
  );

  await t.test('Super Admin accounts form the leadership root', () => {
    assert.deepEqual(names(chart.leaders), ['CEO']);
  });

  await t.test('each department has its manager, then team leaders first, then by name', () => {
    const [sales, empty] = chart.departments;
    assert.equal(sales.manager.id, 'An');
    assert.deepEqual(names(sales.members), ['Yến', 'Bình']);
    assert.equal(sales.members[1].avatarUrl, 'https://signed/binh.png');
    assert.deepEqual(
      { manager: empty.manager, members: empty.members },
      { manager: null, members: [] },
    );
  });

  await t.test('people without an active department are listed separately', () => {
    assert.deepEqual(names(chart.unassigned), ['Cường', 'Dũng']);
  });
});

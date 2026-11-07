// Stage 7 rules that need no database: filter parsing, input validation, route protection.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/unused_in_these_tests';
process.env.JWT_SECRET = 'test_secret_value';

const { parseIncidentFilters, validateClassification, validateNewUser, validateUserUpdate } = await import('../src/utils/adminRules.js');

test('filters: valid values become a MongoDB filter, empty values are ignored', () => {
  const { filter, errors } = parseIncidentFilters({ status: 'Resolved', category: 'Fire', priority: 'High', from: '2026-11-01', to: '2026-11-07', q: 'inc-2026', extra: 'ignored' });
  assert.equal(errors.length, 0);
  assert.equal(filter.status, 'Resolved');
  assert.ok(filter.createdAt.$gte < filter.createdAt.$lte);
  assert.equal(filter.reportId.$options, 'i');
  assert.deepEqual(parseIncidentFilters({ status: '', from: '' }).filter, {});
});

test('filters: unknown values, object injection and bad dates are rejected', () => {
  for (const bad of [{ status: 'Hacked' }, { category: { $ne: '' } }, { priority: ['High'] }, { from: '2026-13-45' }, { to: 'yesterday' }, { from: '2026-11-09', to: '2026-11-01' }, { q: 'x'.repeat(41) }, { q: { $gt: '' } }])
    assert.ok(parseIncidentFilters(bad).errors.length > 0, JSON.stringify(bad));
});

test('filters: search text is escaped so it cannot become a regular expression attack', () => {
  assert.equal(parseIncidentFilters({ q: '.*(a+)+$' }).filter.reportId.$regex, '\\.\\*\\(a\\+\\)\\+\\$');
});

test('classification: only allowed categories and priorities', () => {
  assert.equal(validateClassification({ category: 'Medical', priority: 'Critical' }).category, 'Medical');
  for (const bad of [{ category: 'Alien', priority: 'High' }, { category: 'Fire', priority: 'Urgent' }, {}, undefined])
    assert.ok(validateClassification(bad).error);
});

test('new user: needs valid name, email, password, role and (for Responders) a group', () => {
  const ok = { name: ' Asha ', email: ' ASHA@x.com ', password: 'Password1', role: 'Responder', responderCategory: 'Fire' };
  const v = validateNewUser(ok);
  assert.deepEqual([v.name, v.email, v.responderCategory], ['Asha', 'asha@x.com', 'Fire']);
  assert.equal(validateNewUser({ ...ok, role: 'Admin', responderCategory: undefined }).role, 'Admin');
  for (const bad of [{ ...ok, name: 'A' }, { ...ok, email: 'nope' }, { ...ok, password: 'short' }, { ...ok, role: 'User' }, { ...ok, role: 'Superuser' }, { ...ok, responderCategory: undefined }, { ...ok, responderCategory: 'Cooking' }, { ...ok, email: { $ne: '' } }])
    assert.ok(validateNewUser(bad).error, JSON.stringify(bad));
});

test('user update: only known fields, valid values, and something to change', () => {
  assert.deepEqual(validateUserUpdate({ isActive: false, ignored: 1 }).update, { isActive: false });
  for (const bad of [{}, { role: 'Boss' }, { isActive: 'no' }, { responderCategory: 'X' }, { name: '' }]) assert.ok(validateUserUpdate(bad).error, JSON.stringify(bad));
});

let server;
let base;
before(async () => {
  const { default: app } = await import('../src/app.js');
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://localhost:${server.address().port}`;
});
after(() => server.close());

test('admin routes: every route returns 401 without a token', async () => {
  const id = '507f1f77bcf86cd799439011';
  for (const [method, path] of [['GET', '/api/admin/incidents'], ['GET', '/api/admin/analytics'], ['GET', '/api/admin/users'], ['POST', '/api/admin/users'], ['PUT', `/api/admin/users/${id}`], ['PUT', `/api/admin/incidents/${id}/assign`], ['PUT', `/api/admin/incidents/${id}/classification`]]) {
    const res = await fetch(base + path, { method });
    assert.equal(res.status, 401, `${method} ${path}`);
  }
});

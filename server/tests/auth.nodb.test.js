// Tests that do not need a database: validation, token rejection, role check, error handling.
// Run: npm test   (database-backed tests will be added when a test database is set up)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/unused_in_these_tests';
process.env.JWT_SECRET = 'test_secret_value';

let server;
let base;

before(async () => {
  const { default: app } = await import('../src/app.js');
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://localhost:${server.address().port}`;
});
after(() => server.close());

const call = async (method, path, body, headers = {}) => {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
};

test('health check returns 200', async () => {
  const r = await call('GET', '/api/health');
  assert.equal(r.status, 200);
  assert.equal(r.body.success, true);
});

test('unknown route returns 404 JSON', async () => {
  const r = await call('GET', '/api/nope');
  assert.equal(r.status, 404);
  assert.equal(r.body.success, false);
});

test('register: empty body is rejected with field errors', async () => {
  const r = await call('POST', '/api/auth/register', {});
  assert.equal(r.status, 400);
  assert.ok(r.body.errors.length >= 3);
});

test('register: mismatched passwords are rejected', async () => {
  const r = await call('POST', '/api/auth/register', { name: 'Asha K', email: 'a@b.com', password: 'Password1', confirmPassword: 'Password2' });
  assert.equal(r.status, 400);
  assert.equal(r.body.errors[0].field, 'confirmPassword');
});

test('register: object-style email (NoSQL injection attempt) is rejected', async () => {
  const r = await call('POST', '/api/auth/register', { name: 'Asha K', email: { $ne: '' }, password: 'Password1', confirmPassword: 'Password1' });
  assert.equal(r.status, 400);
});

test('login: missing or object-style fields are rejected', async () => {
  assert.equal((await call('POST', '/api/auth/login', { email: 'a@b.com' })).status, 400);
  assert.equal((await call('POST', '/api/auth/login', { email: { $ne: '' }, password: { $ne: '' } })).status, 400);
});

test('me: no token, garbage token and wrongly signed token all return 401', async () => {
  assert.equal((await call('GET', '/api/auth/me')).status, 401);
  assert.equal((await call('GET', '/api/auth/me', undefined, { Authorization: 'Bearer abc.def.ghi' })).status, 401);
  const forged = jwt.sign({ id: 'x', role: 'Admin' }, 'WRONG_SECRET');
  assert.equal((await call('GET', '/api/auth/me', undefined, { Authorization: `Bearer ${forged}` })).status, 401);
});

test('malformed JSON body returns 400', async () => {
  const r = await call('POST', '/api/auth/register', '{bad json');
  assert.equal(r.status, 400);
});

test('authorize(): blocks the wrong role with 403 and lets the right role through', async () => {
  const { authorize } = await import('../src/middleware/auth.js');
  let blocked;
  authorize('Admin')({ user: { role: 'User' } }, {}, (e) => { blocked = e; });
  assert.equal(blocked.statusCode, 403);
  let passed = 'not called';
  authorize('Admin')({ user: { role: 'Admin' } }, {}, (e) => { passed = e; });
  assert.equal(passed, undefined);
});

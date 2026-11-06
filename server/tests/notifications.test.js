// Notification routes need no database for these checks: they must reject anonymous requests.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

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

test('notification routes: every route returns 401 without a token', async () => {
  const id = '507f1f77bcf86cd799439011';
  for (const [method, path] of [['GET', '/api/notifications'], ['PUT', '/api/notifications/read-all'], ['PUT', `/api/notifications/${id}/read`]]) {
    const res = await fetch(base + path, { method });
    assert.equal(res.status, 401, `${method} ${path}`);
  }
});

test('notification routes: a garbage token is rejected too', async () => {
  const res = await fetch(`${base}/api/notifications`, { headers: { Authorization: 'Bearer not.a.token' } });
  assert.equal(res.status, 401);
});

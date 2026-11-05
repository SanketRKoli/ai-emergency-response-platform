// Stage 5 rules that need no database: what a responder may do, and route protection.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/unused_in_these_tests';
process.env.JWT_SECRET = 'test_secret_value';

const { validateStatusUpdate, validateNote, REQUIRED_CURRENT } = await import('../src/utils/responderRules.js');
const { isValidTransition } = await import('../src/utils/statusFlow.js');

test('responder status: only In Progress and Resolved are allowed targets', () => {
  assert.equal(validateStatusUpdate({ status: 'In Progress' }).status, 'In Progress');
  for (const bad of ['Submitted', 'Assigned', 'Accepted', 'AI Analyzed', 'Pending Assignment', 'Done', '', undefined, null, { $ne: '' }, '__proto__', 'toString'])
    assert.ok(validateStatusUpdate({ status: bad }).error, String(bad));
  assert.ok(validateStatusUpdate().error);
});

test('responder status: Resolved needs a note of at least 3 characters', () => {
  assert.ok(validateStatusUpdate({ status: 'Resolved' }).error);
  assert.ok(validateStatusUpdate({ status: 'Resolved', note: '  ok' }).error);
  const ok = validateStatusUpdate({ status: 'Resolved', note: '  Fire put out  ' });
  assert.equal(ok.note, 'Fire put out');
});

test('responder status: notes must be text and at most 1000 characters', () => {
  assert.ok(validateStatusUpdate({ status: 'In Progress', note: { a: 1 } }).error);
  assert.ok(validateStatusUpdate({ status: 'In Progress', note: 'x'.repeat(1001) }).error);
  assert.equal(validateStatusUpdate({ status: 'In Progress' }).note, '');
});

test('responder note: empty, non-text and too long notes are rejected', () => {
  assert.ok(validateNote('').error);
  assert.ok(validateNote('   ').error);
  assert.ok(validateNote(123).error);
  assert.ok(validateNote('x'.repeat(1001)).error);
  assert.equal(validateNote('  Team on site ').text, 'Team on site');
});

test('responder steps follow the status flow in the LLD', () => {
  for (const [target, from] of Object.entries(REQUIRED_CURRENT)) assert.equal(isValidTransition(from, target), true, `${from} -> ${target}`);
  assert.equal(isValidTransition('Assigned', 'Accepted'), true);
  assert.equal(isValidTransition('Assigned', 'Resolved'), false);
});

let server;
let base;
before(async () => {
  const { default: app } = await import('../src/app.js');
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://localhost:${server.address().port}`;
});
after(() => server.close());

test('responder routes: every route returns 401 without a token', async () => {
  const id = '507f1f77bcf86cd799439011';
  for (const [method, path] of [['GET', '/api/responder/incidents'], ['PUT', `/api/responder/incidents/${id}/accept`], ['PUT', `/api/responder/incidents/${id}/status`], ['POST', `/api/responder/incidents/${id}/notes`]]) {
    const res = await fetch(base + path, { method });
    assert.equal(res.status, 401, `${method} ${path}`);
  }
});

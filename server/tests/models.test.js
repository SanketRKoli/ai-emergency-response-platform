// Model rules that can be checked without a database (validate() runs only in memory).
import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/unused_in_these_tests';
process.env.JWT_SECRET = 'test_secret_value';

const { default: User } = await import('../src/models/User.js');
const { default: Incident } = await import('../src/models/Incident.js');

// validate() (async) runs the custom pre('validate') rules; validateSync() would skip them.
const errs = async (doc) => { try { await doc.validate(); return null; } catch (e) { return e.errors; } };

const oid = '507f1f77bcf86cd799439011';
const validIncident = (extra = {}) => ({ reportId: 'INC-2026-0001', userId: oid, description: 'Smoke on second floor', locationDescription: 'Block B', ...extra });

test('User: a Responder without responderCategory is invalid', async () => {
  const e = await errs(new User({ name: 'Fire Team', email: 'f@x.com', passwordHash: 'h', role: 'Responder' }));
  assert.ok(e.responderCategory);
});

test('User: valid Responder and default User role pass', async () => {
  assert.equal(await errs(new User({ name: 'Fire Team', email: 'f@x.com', passwordHash: 'h', role: 'Responder', responderCategory: 'Fire' })), null);
  assert.equal(new User({ name: 'Asha K', email: 'a@x.com', passwordHash: 'h' }).role, 'User');
});

test('User: an unknown role is rejected and passwordHash is hidden by default', async () => {
  assert.ok((await errs(new User({ name: 'Asha K', email: 'a@x.com', passwordHash: 'h', role: 'Hacker' }))).role);
  assert.equal(User.schema.path('passwordHash').options.select, false);
});

test('Incident: valid report with typed location passes and starts as Submitted', async () => {
  const i = new Incident(validIncident());
  assert.equal(await errs(i), null);
  assert.equal(i.status, 'Submitted');
  assert.equal(i.aiStatus, 'pending');
});

test('Incident: needs coordinates or a location description', async () => {
  const e = await errs(new Incident(validIncident({ locationDescription: undefined })));
  assert.ok(e.locationDescription);
});

test('Incident: latitude and longitude must come together and stay in range', async () => {
  assert.ok((await errs(new Incident(validIncident({ latitude: 12.9 })))).latitude);
  assert.equal(await errs(new Incident(validIncident({ latitude: 12.97, longitude: 77.59, locationDescription: undefined }))), null);
  assert.ok((await errs(new Incident(validIncident({ latitude: 95, longitude: 77.59 })))).latitude);
});

test('Incident: unknown category, priority or status is rejected; empty description is rejected', async () => {
  const e = await errs(new Incident(validIncident({ category: 'Alien', priority: 'Urgent', status: 'Done', description: '' })));
  for (const f of ['category', 'priority', 'status', 'description']) assert.ok(e[f], f);
});

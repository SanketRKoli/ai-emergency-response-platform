// Stage 3 rules that need no database: input validation, image signatures, report IDs, route protection.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/unused_in_these_tests';
process.env.JWT_SECRET = 'test_secret_value';

const { parseIncidentInput } = await import('../src/utils/incidentInput.js');
const { hasImageSignature, detectImageType } = await import('../src/utils/imageCheck.js');
const { formatReportId } = await import('../src/utils/reportId.js');

test('input: description with typed location is accepted and cleaned', () => {
  const { errors, data } = parseIncidentInput({ description: '  Smoke on second floor  ', locationDescription: ' Block B ', isUrgent: 'true' });
  assert.equal(errors.length, 0);
  assert.equal(data.description, 'Smoke on second floor');
  assert.equal(data.locationDescription, 'Block B');
  assert.equal(data.locationSource, 'manual');
  assert.equal(data.isUrgent, true);
});

test('input: GPS coordinates alone are enough (no address needed)', () => {
  const { errors, data } = parseIncidentInput({ description: 'Fire near lab', latitude: '12.9716', longitude: '77.5946', locationSource: 'gps' });
  assert.equal(errors.length, 0);
  assert.equal(data.latitude, 12.9716);
  assert.equal(data.locationSource, 'gps');
  assert.equal(data.isUrgent, false);
});

test('input: short or missing description is rejected', () => {
  assert.ok(parseIncidentInput({ description: 'hi', locationDescription: 'x' }).errors.some((e) => e.field === 'description'));
  assert.ok(parseIncidentInput({ locationDescription: 'x' }).errors.some((e) => e.field === 'description'));
  assert.ok(parseIncidentInput({ description: { $ne: '' }, locationDescription: 'x' }).errors.some((e) => e.field === 'description'));
});

test('input: no location at all is rejected', () => {
  assert.ok(parseIncidentInput({ description: 'Something happened here' }).errors.some((e) => e.field === 'location'));
});

test('input: bad, half or out-of-range coordinates are rejected', () => {
  const base = { description: 'Something happened here', locationSource: 'map' };
  assert.ok(parseIncidentInput({ ...base, latitude: '12.9' }).errors.length > 0);
  assert.ok(parseIncidentInput({ ...base, latitude: '95', longitude: '77' }).errors.length > 0);
  assert.ok(parseIncidentInput({ ...base, latitude: 'abc', longitude: '77' }).errors.length > 0);
  assert.ok(parseIncidentInput({ ...base, latitude: '12', longitude: '77', locationSource: 'manual' }).errors.length > 0);
});

test('image signature: real JPEG and PNG headers pass, others fail', () => {
  assert.equal(hasImageSignature(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0])), true);
  assert.equal(hasImageSignature(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), true);
  assert.equal(hasImageSignature(Buffer.from('<html><script>alert(1)</script>')), false);
  assert.equal(hasImageSignature(Buffer.from('MZ\x90\x00')), false);
  assert.equal(hasImageSignature(Buffer.alloc(0)), false);
});

test('image type: decided from the file header, not the name', () => {
  assert.equal(detectImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0])), 'image/jpeg');
  assert.equal(detectImageType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), 'image/png');
  assert.equal(detectImageType(Buffer.from('GIF89a')), null);
});

test('report id format: INC-<year>-<4 digit number>', () => {
  assert.equal(formatReportId(2026, 1), 'INC-2026-0001');
  assert.equal(formatReportId(2026, 42), 'INC-2026-0042');
  assert.equal(formatReportId(2027, 12345), 'INC-2027-12345');
});

let server;
let base;
before(async () => {
  const { default: app } = await import('../src/app.js');
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://localhost:${server.address().port}`;
});
after(() => server.close());

test('routes: every incident route returns 401 without a token', async () => {
  for (const [method, path] of [['POST', '/api/incidents'], ['GET', '/api/incidents'], ['GET', '/api/incidents/507f1f77bcf86cd799439011'], ['GET', '/api/incidents/507f1f77bcf86cd799439011/image']]) {
    const res = await fetch(base + path, { method });
    assert.equal(res.status, 401, `${method} ${path}`);
  }
});

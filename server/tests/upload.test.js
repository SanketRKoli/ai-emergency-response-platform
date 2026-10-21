// Tests the image upload middleware on its own (no database): type check, size limit, safe file name.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';

process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/unused_in_these_tests';
process.env.JWT_SECRET = 'test_secret_value';

const { uploadImage, uploadsDir, MAX_IMAGE_BYTES } = await import('../src/middleware/upload.js');
const { errorHandler } = await import('../src/middleware/error.js');

const saved = [];
let server;
let base;
before(async () => {
  const app = express();
  app.post('/t', uploadImage, (req, res) => {
    if (req.file) saved.push(req.file.path);
    res.json({ ok: true, file: req.file ? { name: req.file.filename, size: req.file.size } : null });
  });
  app.use(errorHandler);
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://localhost:${server.address().port}`;
});
after(() => { server.close(); for (const f of saved) fs.rmSync(f, { force: true }); });

const send = async (parts) => {
  const form = new FormData();
  for (const [field, blob, name] of parts) form.append(field, blob, name);
  const res = await fetch(`${base}/t`, { method: 'POST', body: form });
  return { status: res.status, body: await res.json() };
};
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

test('upload: no file is fine (image is optional)', async () => {
  const r = await send([]);
  assert.equal(r.status, 200);
  assert.equal(r.body.file, null);
});

test('upload: a PNG is stored under a random name, not the user-supplied name', async () => {
  const r = await send([['image', new Blob([png], { type: 'image/png' }), '../../evil name.png']]);
  assert.equal(r.status, 200);
  assert.match(r.body.file.name, /^[0-9a-f-]{36}\.png$/);
  assert.ok(fs.existsSync(path.join(uploadsDir, r.body.file.name)));
});

test('upload: non-image types are rejected with 415', async () => {
  const r = await send([['image', new Blob(['<script>alert(1)</script>'], { type: 'text/html' }), 'x.html']]);
  assert.equal(r.status, 415);
  const pdf = await send([['image', new Blob(['%PDF-1.4'], { type: 'application/pdf' }), 'x.pdf']]);
  assert.equal(pdf.status, 415);
});

test('upload: files over 5 MB are rejected with 413', async () => {
  const big = new Blob([Buffer.alloc(MAX_IMAGE_BYTES + 1024)], { type: 'image/jpeg' });
  const r = await send([['image', big, 'big.jpg']]);
  assert.equal(r.status, 413);
});

test('upload: a wrong field name or two files is rejected with 400', async () => {
  const blob = () => new Blob([png], { type: 'image/png' });
  assert.equal((await send([['photo', blob(), 'a.png']])).status, 400);
  assert.equal((await send([['image', blob(), 'a.png'], ['image', blob(), 'b.png']])).status, 400);
});

// Checks that the labelled sample set is well-formed (so evaluation numbers mean something).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CATEGORIES, PRIORITIES } from '../src/utils/constants.js';

const { reports } = JSON.parse(fs.readFileSync(new URL('../evaluation/dataset.json', import.meta.url), 'utf8'));

test('evaluation set: enough reports, unique ids, valid labels, every category present', () => {
  assert.ok(reports.length >= 50);
  assert.equal(new Set(reports.map((r) => r.id)).size, reports.length);
  for (const r of reports) {
    assert.ok(r.text.length > 10, `report ${r.id} text`);
    assert.ok(CATEGORIES.includes(r.category), `report ${r.id} category`);
    assert.ok(PRIORITIES.includes(r.priority), `report ${r.id} priority`);
  }
  for (const c of CATEGORIES) assert.ok(reports.some((r) => r.category === c), `no sample for ${c}`);
});

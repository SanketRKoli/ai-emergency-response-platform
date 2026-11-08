// Machine-learning classifier tests: tokeniser, training, saved model, hybrid safety rule, fallback, data hygiene.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const { tokens, train, predict } = await import('../src/services/ai/nb.js');
const { loadModel, classifyWithML, classifyHybrid } = await import('../src/services/ai/mlClassifier.js');
const { classifyWithRules } = await import('../src/services/ai/rulesClassifier.js');
const { validateAiOutput } = await import('../src/services/ai/validateAiOutput.js');
const { analyzeReport } = await import('../src/services/ai/index.js');
const { CATEGORIES, PRIORITIES } = await import('../src/utils/constants.js');

const read = (f) => JSON.parse(fs.readFileSync(new URL(f, import.meta.url), 'utf8')).reports;
const training = read('../ml/training-data.json');
const evaluation = read('../evaluation/dataset.json');
const norm = (s) => s.toLowerCase().replace(/\W+/g, ' ').trim();

test('tokeniser: lowercases, drops filler words, stems, keeps negations and adds word pairs', () => {
  const t = tokens('Please help, the FANS are not working!');
  assert.ok(t.includes('fan') && t.includes('not') && t.includes('work'));
  assert.ok(t.includes('not_work'));
  assert.ok(!t.includes('the') && !t.includes('please') && !t.includes('are'));
  assert.deepEqual(tokens(''), []);
});

test('training: a tiny model learns separable classes and probabilities add up to 1', () => {
  const m = train([{ text: 'fire smoke flames', label: 'A' }, { text: 'smoke burning fire', label: 'A' }, { text: 'tap leaking water', label: 'B' }, { text: 'leaking pipe water', label: 'B' }]);
  assert.equal(predict(m, 'flames and smoke').label, 'A');
  assert.equal(predict(m, 'water tap').label, 'B');
  const p = predict(m, 'smoke').probs;
  assert.ok(Math.abs(Object.values(p).reduce((a, b) => a + b, 0) - 1) < 1e-9);
  assert.equal(predict(m, 'zzz qqq').knownTerms, 0);
});

test('saved model: loads, has the right classes, and classifies clear examples', () => {
  const m = loadModel();
  assert.deepEqual(m.category.classes, [...CATEGORIES].sort());
  assert.deepEqual(m.priority.classes, [...PRIORITIES].sort());
  assert.equal(classifyWithML({ description: 'There is smoke coming from the second floor of Block B and people are inside.' }).category, 'Fire');
  assert.equal(classifyWithML({ description: 'The tube light in the classroom is not working' }).category, 'Maintenance');
  assert.equal(classifyWithML({ description: 'Someone stole my bag from the library' }).category, 'Security');
});

test('model: unknown words give Other / Low and ask for a human; empty input does not crash', () => {
  const r = classifyWithML({ description: 'zzzz qqqq' });
  assert.deepEqual([r.category, r.priority], ['Other', 'Low']);
  assert.equal(classifyWithML({}).category, 'Other');
});

test('model: the explanation lists real words from the report', () => {
  const r = classifyWithML({ description: 'Thick smoke and flames in the kitchen' });
  assert.match(r.reason, /smoke|flame/);
});

test('model and hybrid: output always passes validation for every evaluation report', () => {
  for (const r of evaluation) for (const fn of [classifyWithML, classifyHybrid]) {
    const { method, ...raw } = fn({ description: r.text, locationDescription: 'Block B' });
    assert.equal(validateAiOutput(raw).ok, true, `${fn.name} #${r.id}`);
  }
});

test('hybrid: life-threatening wording is always Critical, and hybrid never lowers the ML priority', () => {
  assert.equal(classifyHybrid({ description: 'He is unconscious and not breathing' }).priority, 'Critical');
  const order = (p) => PRIORITIES.indexOf(p);
  for (const r of evaluation) {
    const ml = classifyWithML({ description: r.text });
    const hy = classifyHybrid({ description: r.text });
    assert.ok(order(hy.priority) >= order(ml.priority), `#${r.id}`);
    assert.equal(hy.category, ml.category);
  }
});

test('analyzeReport: ml and hybrid providers are labelled; a broken classifier falls back to the rules', async () => {
  assert.equal((await analyzeReport({ description: 'Smoke in the lab' }, { provider: 'ml' })).method, 'ml-nb-v1');
  assert.equal((await analyzeReport({ description: 'Smoke in the lab' }, { provider: 'hybrid' })).method, 'hybrid-v1');
  const orig = console.error; console.error = () => {};
  const broken = await analyzeReport({ description: 'Smoke in the lab' }, { provider: 'ml', local: { ml: () => { throw new Error('model.json missing'); } } });
  console.error = orig;
  assert.equal(broken.ok, true);
  assert.equal(broken.method, 'rules-v1-fallback');
});

test('data hygiene: training set is valid and shares no text with the evaluation set', () => {
  assert.ok(training.length >= 400);
  for (const r of training) { assert.ok(CATEGORIES.includes(r.category)); assert.ok(PRIORITIES.includes(r.priority)); }
  const evalTexts = new Set(evaluation.map((r) => norm(r.text)));
  for (const r of training) assert.ok(!evalTexts.has(norm(r.text)), `leak: ${r.text}`);
  const m = loadModel();
  assert.equal(m.trainedOn, training.length, 'model.json is out of date: run "npm run train"');
});

// Measures how well a classifier labels the sample reports.
//   npm run evaluate                       (keyword-rule baseline)
//   npm run evaluate -- --provider=gemini  (language model; needs GEMINI_API_KEY in .env)
// Options: --delay=4000 (ms between calls, for free-tier rate limits)  --limit=20
import fs from 'node:fs';
import { analyzeReport } from '../src/services/ai/index.js';
import { aiConfig } from '../src/config/aiConfig.js';
import { CATEGORIES, PRIORITIES } from '../src/utils/constants.js';

const arg = (name, def) => (process.argv.find((a) => a.startsWith(`--${name}=`)) || '').split('=')[1] ?? def;
const provider = arg('provider', 'rules');
const delay = Number(arg('delay', provider === 'rules' ? 0 : 4000));
const limit = Number(arg('limit', 0));
const { reports } = JSON.parse(fs.readFileSync(new URL('./dataset.json', import.meta.url), 'utf8'));
const items = limit ? reports.slice(0, limit) : reports;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pct = (x) => (100 * x).toFixed(1) + '%';

const rows = [];
let failed = 0;
for (const item of items) {
  const res = await analyzeReport({ description: item.text, isUrgent: false }, { provider, fallbackToRules: false, config: aiConfig });
  if (!res.ok) { failed++; rows.push({ ...item, predCat: null, predPri: null }); }
  else rows.push({ ...item, predCat: res.value.category, predPri: res.value.priority });
  if (delay) await sleep(delay);
}

// ----- category metrics -----
const n = rows.length;
const catCorrect = rows.filter((r) => r.predCat === r.category).length;
console.log(`\nProvider: ${provider}   Reports: ${n}   Failed calls: ${failed}\n`);
console.log(`CATEGORY accuracy: ${pct(catCorrect / n)} (${catCorrect}/${n})\n`);
console.log('Class'.padEnd(16) + 'Support'.padStart(8) + 'Precision'.padStart(11) + 'Recall'.padStart(9) + 'F1'.padStart(8));
let f1Sum = 0;
for (const c of CATEGORIES) {
  const tp = rows.filter((r) => r.category === c && r.predCat === c).length;
  const fp = rows.filter((r) => r.category !== c && r.predCat === c).length;
  const fn = rows.filter((r) => r.category === c && r.predCat !== c).length;
  const p = tp + fp ? tp / (tp + fp) : 0;
  const rc = tp + fn ? tp / (tp + fn) : 0;
  const f1 = p + rc ? (2 * p * rc) / (p + rc) : 0;
  f1Sum += f1;
  console.log(c.padEnd(16) + String(tp + fn).padStart(8) + pct(p).padStart(11) + pct(rc).padStart(9) + f1.toFixed(2).padStart(8));
}
console.log(`Macro F1: ${(f1Sum / CATEGORIES.length).toFixed(2)}\n`);
console.log('Confusion matrix (rows = true, columns = predicted; ? = call failed)');
const short = (c) => c.slice(0, 5);
console.log(''.padEnd(16) + [...CATEGORIES, '?'].map((c) => short(c).padStart(6)).join(''));
for (const t of CATEGORIES) {
  const line = [...CATEGORIES, null].map((p) => String(rows.filter((r) => r.category === t && r.predCat === p).length).padStart(6)).join('');
  console.log(t.padEnd(16) + line);
}

// ----- priority metrics -----
const idx = (p) => PRIORITIES.indexOf(p);
const ok = rows.filter((r) => r.predPri);
const exact = ok.filter((r) => r.predPri === r.priority).length;
const within1 = ok.filter((r) => Math.abs(idx(r.predPri) - idx(r.priority)) <= 1).length;
const under = ok.filter((r) => idx(r.predPri) < idx(r.priority)).length;
const over = ok.filter((r) => idx(r.predPri) > idx(r.priority)).length;
const serious = rows.filter((r) => idx(r.priority) >= 2);
const seriousCaught = serious.filter((r) => r.predPri && idx(r.predPri) >= 2).length;
console.log(`\nPRIORITY exact match: ${pct(exact / n)} (${exact}/${n})   within one level: ${pct(within1 / n)}`);
console.log(`Under-triage (predicted lower than true): ${under}   Over-triage (predicted higher): ${over}`);
console.log(`High/Critical recall (serious reports flagged High or Critical): ${pct(seriousCaught / serious.length)} (${seriousCaught}/${serious.length})`);

// ----- every mistake, so the failures can be studied -----
console.log('\nMISTAKES (id | true -> predicted | text)');
for (const r of rows) {
  if (r.predCat !== r.category || r.predPri !== r.priority)
    console.log(`${String(r.id).padStart(2)} | ${r.category}/${r.priority} -> ${r.predCat}/${r.predPri} | ${r.text.slice(0, 70)}`);
}

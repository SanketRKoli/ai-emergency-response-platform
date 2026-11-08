// Measures how well a classifier labels the 62 sample reports.
//   npm run evaluate                          keyword rules (detailed report)
//   npm run evaluate -- --provider=ml         machine-learning model
//   npm run evaluate -- --provider=hybrid     ML + safety rule
//   npm run evaluate -- --compare             summary table of rules, ml and hybrid
//   npm run evaluate -- --provider=gemini     language model (needs GEMINI_API_KEY; add --delay=4000)
import fs from 'node:fs';
import { analyzeReport } from '../src/services/ai/index.js';
import { aiConfig } from '../src/config/aiConfig.js';
import { CATEGORIES, PRIORITIES } from '../src/utils/constants.js';

const arg = (name, def) => (process.argv.find((a) => a.startsWith(`--${name}=`)) || '').split('=')[1] ?? def;
const compare = process.argv.includes('--compare');
const delay = Number(arg('delay', 0));
const { reports } = JSON.parse(fs.readFileSync(new URL('./dataset.json', import.meta.url), 'utf8'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pct = (x) => (100 * x).toFixed(1) + '%';
const idx = (p) => PRIORITIES.indexOf(p);

async function run(provider) {
  const rows = [];
  let failed = 0;
  for (const item of reports) {
    const res = await analyzeReport({ description: item.text, isUrgent: false }, { provider, fallbackToRules: false, config: aiConfig });
    if (!res.ok) failed++;
    rows.push({ ...item, predCat: res.ok ? res.value.category : null, predPri: res.ok ? res.value.priority : null });
    if (delay) await sleep(delay);
  }
  const n = rows.length;
  const f1s = CATEGORIES.map((c) => {
    const tp = rows.filter((r) => r.category === c && r.predCat === c).length;
    const fp = rows.filter((r) => r.category !== c && r.predCat === c).length;
    const fn = rows.filter((r) => r.category === c && r.predCat !== c).length;
    const p = tp + fp ? tp / (tp + fp) : 0;
    const rc = tp + fn ? tp / (tp + fn) : 0;
    return { c, tp, fp, fn, p, rc, f1: p + rc ? (2 * p * rc) / (p + rc) : 0 };
  });
  const ok = rows.filter((r) => r.predPri);
  const serious = rows.filter((r) => idx(r.priority) >= 2);
  return {
    rows, n, failed, f1s,
    catAcc: rows.filter((r) => r.predCat === r.category).length / n,
    macroF1: f1s.reduce((a, x) => a + x.f1, 0) / f1s.length,
    priAcc: ok.filter((r) => r.predPri === r.priority).length / n,
    within1: ok.filter((r) => Math.abs(idx(r.predPri) - idx(r.priority)) <= 1).length / n,
    under: ok.filter((r) => idx(r.predPri) < idx(r.priority)).length,
    over: ok.filter((r) => idx(r.predPri) > idx(r.priority)).length,
    seriousRecall: serious.filter((r) => r.predPri && idx(r.predPri) >= 2).length / serious.length,
    criticalRecall: (() => { const c = rows.filter((r) => r.priority === 'Critical'); return c.filter((r) => r.predPri === 'Critical').length / c.length; })(),
  };
}

if (compare) {
  const out = [];
  for (const p of ['rules', 'ml', 'hybrid']) out.push([p, await run(p)]);
  console.log(`\nEvaluation on ${reports.length} held-out reports (the ML model was trained on separate data)\n`);
  console.log('Classifier'.padEnd(10) + 'Category acc'.padStart(14) + 'Macro F1'.padStart(10) + 'Priority exact'.padStart(16) + 'Within 1'.padStart(10) + 'High/Crit recall'.padStart(18) + 'Critical recall'.padStart(17) + 'Under/Over'.padStart(12));
  for (const [p, m] of out) console.log(p.padEnd(10) + pct(m.catAcc).padStart(14) + m.macroF1.toFixed(2).padStart(10) + pct(m.priAcc).padStart(16) + pct(m.within1).padStart(10) + pct(m.seriousRecall).padStart(18) + pct(m.criticalRecall).padStart(17) + `${m.under}/${m.over}`.padStart(12));
} else {
  const provider = arg('provider', 'rules');
  const m = await run(provider);
  const { rows, n } = m;
  console.log(`\nProvider: ${provider}   Reports: ${n}   Failed calls: ${m.failed}\n`);
  console.log(`CATEGORY accuracy: ${pct(m.catAcc)} (${Math.round(m.catAcc * n)}/${n})\n`);
  console.log('Class'.padEnd(16) + 'Support'.padStart(8) + 'Precision'.padStart(11) + 'Recall'.padStart(9) + 'F1'.padStart(8));
  for (const x of m.f1s) console.log(x.c.padEnd(16) + String(x.tp + x.fn).padStart(8) + pct(x.p).padStart(11) + pct(x.rc).padStart(9) + x.f1.toFixed(2).padStart(8));
  console.log(`Macro F1: ${m.macroF1.toFixed(2)}\n`);
  console.log('Confusion matrix (rows = true, columns = predicted; ? = call failed)');
  console.log(''.padEnd(16) + [...CATEGORIES, '?'].map((c) => c.slice(0, 5).padStart(6)).join(''));
  for (const t of CATEGORIES) console.log(t.padEnd(16) + [...CATEGORIES, null].map((p) => String(rows.filter((r) => r.category === t && r.predCat === p).length).padStart(6)).join(''));
  console.log(`\nPRIORITY exact match: ${pct(m.priAcc)} (${Math.round(m.priAcc * n)}/${n})   within one level: ${pct(m.within1)}`);
  console.log(`Under-triage (predicted lower than true): ${m.under}   Over-triage (predicted higher): ${m.over}`);
  console.log(`High/Critical recall: ${pct(m.seriousRecall)}   Critical recall: ${pct(m.criticalRecall)}`);
  console.log('\nMISTAKES (id | true -> predicted | text)');
  for (const r of rows) if (r.predCat !== r.category || r.predPri !== r.priority) console.log(`${String(r.id).padStart(2)} | ${r.category}/${r.priority} -> ${r.predCat}/${r.predPri} | ${r.text.slice(0, 70)}`);
}

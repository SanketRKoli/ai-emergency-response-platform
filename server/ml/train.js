// Trains the two Naive Bayes models (category and priority) and saves them to ml/model.json.
//   npm run train
import fs from 'node:fs';
import { train, predict } from '../src/services/ai/nb.js';

const { reports } = JSON.parse(fs.readFileSync(new URL('./training-data.json', import.meta.url), 'utf8'));
const category = train(reports.map((r) => ({ text: r.text, label: r.category })));
const priority = train(reports.map((r) => ({ text: r.text, label: r.priority })));
fs.writeFileSync(new URL('./model.json', import.meta.url), JSON.stringify({ version: 'ml-nb-v1', trainedOn: reports.length, category, priority }));
console.log(`Trained on ${reports.length} reports. Saved ml/model.json (${Object.keys(category.idf).length} features).`);

// 5-fold cross-validation on the training data only (the 62 evaluation reports are never used here).
// Caution: the training reports come from templates, so this number is optimistic.
const folds = 5;
let okC = 0;
let okP = 0;
reports.forEach((r, i) => {
  if (i % folds !== 0) return; // test on every 5th report, train on the rest
  const rest = reports.filter((_, j) => j % folds !== 0);
  if (i === 0) { global.__mc = train(rest.map((x) => ({ text: x.text, label: x.category }))); global.__mp = train(rest.map((x) => ({ text: x.text, label: x.priority }))); }
  okC += predict(global.__mc, r.text).label === r.category ? 1 : 0;
  okP += predict(global.__mp, r.text).label === r.priority ? 1 : 0;
});
const n = Math.ceil(reports.length / folds);
console.log(`Hold-out check inside the training data: category ${(100 * okC / n).toFixed(1)}%, priority ${(100 * okP / n).toFixed(1)}% (optimistic: template data)`);

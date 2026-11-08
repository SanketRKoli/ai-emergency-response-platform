// Machine-learning classifier: two Naive Bayes models (category, priority) trained on labelled sample reports (ml/training-data.json).
// "hybrid" adds one safety rule: if the keyword rules see life-threatening wording, the priority is at least Critical.
import fs from 'node:fs';
import { predict, explain } from './nb.js';
import { classifyWithRules } from './rulesClassifier.js';

export const ML_VERSION = 'ml-nb-v1';
export const HYBRID_VERSION = 'hybrid-v1';
const MODEL_URL = new URL('../../../ml/model.json', import.meta.url);
let cached;

export function loadModel() {
  if (!cached) cached = JSON.parse(fs.readFileSync(MODEL_URL, 'utf8')); // throws if model.json is missing: run "npm run train"
  return cached;
}

export function classifyWithML({ description = '', locationDescription = '' } = {}, model = loadModel()) {
  const text = String(description);
  const c = predict(model.category, text);
  const p = predict(model.priority, text);
  if (c.knownTerms === 0) {
    return { category: 'Other', priority: 'Low', summary: 'Incident reported; the category is unclear.', reason: 'The model did not recognise any words in this report, so a human needs to classify it.', method: ML_VERSION };
  }
  const place = String(locationDescription || '').trim();
  const words = explain(model.category, text, c.label, c.second);
  return {
    category: c.label,
    priority: p.label,
    summary: c.label === 'Other' ? `Incident reported${place ? ` near ${place}` : ''}; the category is unclear.` : `Possible ${c.label.toLowerCase()} incident reported${place ? ` near ${place}` : ''}.`,
    reason: `Naive Bayes text model. Words that pointed to ${c.label}: ${words.length ? words.map((w) => `"${w}"`).join(', ') : 'none stood out'}. Priority ${p.label} (learned from similar reports).`,
    method: ML_VERSION,
  };
}

export function classifyHybrid(input, model = loadModel()) {
  const ml = classifyWithML(input, model);
  const rules = classifyWithRules(input);
  if (rules.priority === 'Critical' && ml.priority !== 'Critical') {
    return { ...ml, priority: 'Critical', reason: `${ml.reason} Safety rule: life-threatening wording was found, so the priority is raised to Critical.`, method: HYBRID_VERSION };
  }
  return { ...ml, method: HYBRID_VERSION };
}

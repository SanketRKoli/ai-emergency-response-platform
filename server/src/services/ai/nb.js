// A small Naive Bayes text classifier written from scratch (no libraries), so every step can be explained.
//  1. Tokenise: lowercase, keep letters, drop common filler words, light stemming, add two-word phrases.
//  2. Features are TF-IDF weights (rare, informative words count more than common ones).
//  3. Training: count how strongly each word goes with each class (with Laplace smoothing).
//  4. Prediction: add up log-probabilities and pick the class with the highest total.
const STOP = new Set(('a an the is are was were be been am in on at of to and or for with near from by it its this that there these those ' +
  'has have had my our your their i we you he she they me us him her them please pls sir madam kindly hello hi thank thanks can could will would ' +
  'some any one very just so also as into out up about over since now today still again ago').split(' '));

const stem = (w) => {
  if (w.length > 5 && w.endsWith('ing')) return w.slice(0, -3);
  if (w.length > 4 && w.endsWith('ed')) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  return w;
};

// Negations such as "not" and "no" are kept on purpose: "not working" and "no electricity" depend on them.
export function tokens(text) {
  const words = String(text).toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter((w) => w && !STOP.has(w)).map(stem);
  const feats = [...words];
  for (let i = 0; i < words.length - 1; i++) feats.push(`${words[i]}_${words[i + 1]}`);
  return feats;
}

const counts = (feats) => feats.reduce((m, f) => m.set(f, (m.get(f) || 0) + 1), new Map());
const r3 = (x) => Math.round(x * 1000) / 1000;

export function train(docs, { alpha = 0.5 } = {}) {
  const classes = [...new Set(docs.map((d) => d.label))].sort();
  const N = docs.length;
  const prepared = docs.map((d) => ({ label: d.label, tf: counts(tokens(d.text)) }));

  const df = new Map();
  for (const d of prepared) for (const t of d.tf.keys()) df.set(t, (df.get(t) || 0) + 1);
  const idf = {};
  for (const [t, n] of df) idf[t] = r3(Math.log((1 + N) / (1 + n)) + 1);
  const V = df.size;

  const sums = Object.fromEntries(classes.map((c) => [c, new Map()]));
  const totals = Object.fromEntries(classes.map((c) => [c, 0]));
  const nDocs = Object.fromEntries(classes.map((c) => [c, 0]));
  for (const d of prepared) {
    nDocs[d.label]++;
    for (const [t, n] of d.tf) {
      const w = n * idf[t];
      sums[d.label].set(t, (sums[d.label].get(t) || 0) + w);
      totals[d.label] += w;
    }
  }
  const model = { classes, alpha, idf, logPrior: {}, logLik: {}, unseen: {} };
  for (const c of classes) {
    const denom = totals[c] + alpha * V;
    model.logPrior[c] = r3(Math.log(nDocs[c] / N));
    model.unseen[c] = r3(Math.log(alpha / denom));
    model.logLik[c] = {};
    for (const [t, s] of sums[c]) model.logLik[c][t] = r3(Math.log((s + alpha) / denom));
  }
  return model;
}

// Returns the best class, a probability for every class, and how many known words the text contained.
export function predict(model, text) {
  const tf = counts(tokens(text));
  const known = [...tf.entries()].filter(([t]) => t in model.idf);
  const scores = {};
  for (const c of model.classes) {
    let s = model.logPrior[c];
    for (const [t, n] of known) s += n * model.idf[t] * (model.logLik[c][t] ?? model.unseen[c]);
    scores[c] = s;
  }
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const max = ranked[0][1];
  const exp = Object.fromEntries(ranked.map(([c, s]) => [c, Math.exp(s - max)]));
  const z = Object.values(exp).reduce((a, b) => a + b, 0);
  const probs = Object.fromEntries(Object.entries(exp).map(([c, v]) => [c, v / z]));
  return { label: ranked[0][0], second: ranked[1]?.[0], probs, knownTerms: known.length, known };
}

// Words that pushed the decision towards `label` rather than the runner-up (used to explain a result).
// Stems such as "trapp" are shown as the real words from the report ("trapped").
export function explain(model, text, label, second, top = 3) {
  const original = new Map();
  for (const w of String(text).toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/)) if (w && !STOP.has(w)) original.set(stem(w), w);
  const show = (t) => t.split('_').map((part) => original.get(part) || part).join(' ');
  const { known } = predict(model, text);
  return known
    .map(([t, n]) => [t, n * model.idf[t] * ((model.logLik[label][t] ?? model.unseen[label]) - (model.logLik[second]?.[t] ?? model.unseen[second]))])
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, top)
    .map(([t]) => show(t));
}

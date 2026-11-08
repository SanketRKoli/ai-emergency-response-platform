import { aiConfig } from '../../config/aiConfig.js';
import { classifyWithRules, RULES_VERSION } from './rulesClassifier.js';
import { PROVIDERS } from './llmProviders.js';
import { classifyWithML, classifyHybrid } from './mlClassifier.js';
import { validateAiOutput } from './validateAiOutput.js';

// The single entry point used by the incident pipeline.
// Returns { ok: true, value: {category, priority, summary, reason}, method } or { ok: false, error }.
// The AI only recommends; the backend validates everything and decides what is stored.
// Local classifiers run inside the server (no internet needed): keyword rules, machine learning, or both.
export const LOCAL = { rules: classifyWithRules, ml: classifyWithML, hybrid: classifyHybrid };

export async function analyzeReport(input, { provider = aiConfig.provider, fallbackToRules = aiConfig.fallbackToRules, providers = PROVIDERS, local = LOCAL, config = aiConfig, fetchImpl } = {}) {
  const run = (fn, fallbackLabel) => {
    const { method, ...raw } = fn(input);
    const checked = validateAiOutput(raw);
    return checked.ok ? { ok: true, value: checked.value, method: fallbackLabel || method } : { ok: false, error: checked.error };
  };

  if (local[provider] || !providers[provider]) { // a local classifier (or an unknown name, which means rules)
    try {
      return run(local[provider] || classifyWithRules);
    } catch (err) {
      console.error(`AI classifier "${provider}" failed: ${err.message}`);
      return run(classifyWithRules, `${RULES_VERSION}-fallback`); // for example: ml/model.json missing, run "npm run train"
    }
  }

  try {
    const { raw, model } = await providers[provider](input, { fetchImpl: fetchImpl || fetch, config });
    const checked = validateAiOutput(raw);
    if (!checked.ok) throw new Error(checked.error);
    return { ok: true, value: checked.value, method: `${provider}:${model}` };
  } catch (err) {
    console.error(`AI provider "${provider}" failed: ${err.message}`);
    if (fallbackToRules) return run(classifyWithRules, `${RULES_VERSION}-fallback`);
    return { ok: false, error: err.message };
  }
}

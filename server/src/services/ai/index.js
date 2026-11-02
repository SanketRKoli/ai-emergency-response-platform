import { aiConfig } from '../../config/aiConfig.js';
import { classifyWithRules, RULES_VERSION } from './rulesClassifier.js';
import { PROVIDERS } from './llmProviders.js';
import { validateAiOutput } from './validateAiOutput.js';

// The single entry point used by the incident pipeline.
// Returns { ok: true, value: {category, priority, summary, reason}, method } or { ok: false, error }.
// The AI only recommends; the backend validates everything and decides what is stored.
export async function analyzeReport(input, { provider = aiConfig.provider, fallbackToRules = aiConfig.fallbackToRules, providers = PROVIDERS, config = aiConfig, fetchImpl } = {}) {
  const useRules = (method) => {
    const { method: _m, ...raw } = classifyWithRules(input);
    const checked = validateAiOutput(raw);
    return checked.ok ? { ok: true, value: checked.value, method } : { ok: false, error: checked.error };
  };

  const call = providers[provider];
  if (!call) return useRules(RULES_VERSION); // provider "rules" (or an unknown name)

  try {
    const { raw, model } = await call(input, { fetchImpl: fetchImpl || fetch, config });
    const checked = validateAiOutput(raw);
    if (!checked.ok) throw new Error(checked.error);
    return { ok: true, value: checked.value, method: `${provider}:${model}` };
  } catch (err) {
    console.error(`AI provider "${provider}" failed: ${err.message}`);
    if (fallbackToRules) return useRules(`${RULES_VERSION}-fallback`);
    return { ok: false, error: err.message };
  }
}

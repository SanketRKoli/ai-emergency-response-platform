// AI settings. Read separately from env.js so the evaluation script can run without database settings.
import 'dotenv/config';

export const aiConfig = {
  provider: (process.env.AI_PROVIDER || 'rules').toLowerCase(), // rules | gemini | anthropic
  timeoutMs: Number(process.env.AI_TIMEOUT_MS) || 20000,
  fallbackToRules: process.env.AI_FALLBACK_TO_RULES !== 'false', // if the language model fails, use the rules instead
  gemini: { apiKey: process.env.GEMINI_API_KEY, model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' },
  anthropic: { apiKey: process.env.ANTHROPIC_API_KEY, model: process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5' },
};

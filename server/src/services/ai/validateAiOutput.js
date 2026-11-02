import { CATEGORIES, PRIORITIES } from '../../utils/constants.js';

// Everything the AI returns is untrusted text. Only values we recognise are accepted; free text is cleaned.
const clean = (s, max) =>
  String(s).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
const canonical = (value, allowed) => (typeof value === 'string' ? allowed.find((a) => a.toLowerCase() === value.trim().toLowerCase()) : undefined);

export function validateAiOutput(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, error: 'AI output is not a JSON object' };
  const category = canonical(raw.category, CATEGORIES);
  if (!category) return { ok: false, error: 'AI returned a category that is not allowed' };
  const priority = canonical(raw.priority, PRIORITIES);
  if (!priority) return { ok: false, error: 'AI returned a priority that is not allowed' };
  if (typeof raw.summary !== 'string' || !raw.summary.trim()) return { ok: false, error: 'AI output has no summary' };
  if (typeof raw.reason !== 'string' || !raw.reason.trim()) return { ok: false, error: 'AI output has no reason' };
  return { ok: true, value: { category, priority, summary: clean(raw.summary, 300), reason: clean(raw.reason, 600) } };
}

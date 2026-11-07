// Validation for the Admin area. Pure functions: no database, easy to test.
import { CATEGORIES, PRIORITIES, STATUSES, ROLES, RESPONDER_CATEGORIES } from './constants.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isStr = (v) => typeof v === 'string';

// Turns the query string of the incident list / analytics into a safe MongoDB filter.
export function parseIncidentFilters(q = {}) {
  const errors = [];
  const filter = {};
  const pick = (key, allowed) => {
    const v = q[key];
    if (v === undefined || v === '') return;
    if (!isStr(v) || !allowed.includes(v)) errors.push(`Invalid ${key}`);
    else filter[key] = v;
  };
  pick('status', STATUSES);
  pick('category', CATEGORIES);
  pick('priority', PRIORITIES);

  const range = {};
  for (const [key, op, time] of [['from', '$gte', 'T00:00:00+05:30'], ['to', '$lte', 'T23:59:59.999+05:30']]) {
    const v = q[key];
    if (v === undefined || v === '') continue;
    if (!isStr(v) || !DATE_RE.test(v) || Number.isNaN(Date.parse(v + time))) errors.push(`Invalid ${key} date`);
    else range[op] = new Date(v + time);
  }
  if (range.$gte && range.$lte && range.$gte > range.$lte) errors.push('The From date must not be after the To date');
  if (Object.keys(range).length) filter.createdAt = range;

  if (q.q !== undefined && q.q !== '') {
    if (!isStr(q.q) || q.q.length > 40) errors.push('Invalid search text');
    else filter.reportId = { $regex: escapeRegex(q.q.trim()), $options: 'i' };
  }
  return { filter, errors };
}

export function validateClassification({ category, priority } = {}) {
  if (!CATEGORIES.includes(category)) return { error: 'Choose a valid category' };
  if (!PRIORITIES.includes(priority)) return { error: 'Choose a valid priority' };
  return { category, priority };
}

export function validateNewUser(body = {}) {
  const { name, email, password, role, responderCategory } = body;
  if (!isStr(name) || name.trim().length < 2) return { error: 'Name must be at least 2 characters' };
  if (!isStr(email) || !EMAIL_RE.test(email.trim())) return { error: 'Enter a valid email address' };
  if (!isStr(password) || password.length < 8 || password.length > 72) return { error: 'Password must be 8 to 72 characters' };
  if (![ROLES.RESPONDER, ROLES.ADMIN].includes(role)) return { error: 'Role must be Responder or Admin' };
  if (role === ROLES.RESPONDER && !RESPONDER_CATEGORIES.includes(responderCategory)) return { error: 'Choose the responder group' };
  return { name: name.trim(), email: email.trim().toLowerCase(), password, role, ...(role === ROLES.RESPONDER ? { responderCategory } : {}) };
}

export function validateUserUpdate(body = {}) {
  const update = {};
  if (body.name !== undefined) {
    if (!isStr(body.name) || body.name.trim().length < 2) return { error: 'Name must be at least 2 characters' };
    update.name = body.name.trim();
  }
  if (body.role !== undefined) {
    if (!Object.values(ROLES).includes(body.role)) return { error: 'Invalid role' };
    update.role = body.role;
  }
  if (body.responderCategory !== undefined) {
    if (!RESPONDER_CATEGORIES.includes(body.responderCategory)) return { error: 'Invalid responder group' };
    update.responderCategory = body.responderCategory;
  }
  if (body.isActive !== undefined) {
    if (typeof body.isActive !== 'boolean') return { error: 'isActive must be true or false' };
    update.isActive = body.isActive;
  }
  if (!Object.keys(update).length) return { error: 'Nothing to update' };
  return { update };
}

// Rules for what a responder may do. Pure functions: no database, easy to test.
// A responder can only move an incident forward one step: Accepted -> In Progress -> Resolved.
export const REQUIRED_CURRENT = { 'In Progress': 'Accepted', Resolved: 'In Progress' };
export const NOTE_MAX = 1000;

export function validateNote(note) {
  const text = typeof note === 'string' ? note.trim() : '';
  if (!text) return { error: 'Write a note' };
  if (text.length > NOTE_MAX) return { error: `Note must be at most ${NOTE_MAX} characters` };
  return { text };
}

export function validateStatusUpdate({ status, note } = {}) {
  if (!Object.hasOwn(REQUIRED_CURRENT, status)) return { error: 'Status must be In Progress or Resolved' };
  if (note !== undefined && note !== null && typeof note !== 'string') return { error: 'Note must be text' };
  const text = typeof note === 'string' ? note.trim() : '';
  if (text.length > NOTE_MAX) return { error: `Note must be at most ${NOTE_MAX} characters` };
  if (status === 'Resolved' && text.length < 3) return { error: 'Add a short resolution note (at least 3 characters) before resolving' };
  return { status, note: text };
}

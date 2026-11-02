// Allowed status changes (matches the LLD). A client can never jump to a status that is not listed here.
export const TRANSITIONS = {
  Submitted: ['AI Analyzed', 'Assigned'], // Submitted -> Assigned only by an Admin when the AI failed
  'AI Analyzed': ['Assigned', 'Pending Assignment'],
  'Pending Assignment': ['Assigned'],
  Assigned: ['Accepted', 'Assigned'], // Assigned -> Assigned = Admin reassigns
  Accepted: ['In Progress', 'Assigned'],
  'In Progress': ['Resolved', 'Assigned'],
  Resolved: [],
};
export const isValidTransition = (from, to) => (TRANSITIONS[from] || []).includes(to);

// Single source of truth for allowed values (matches the LLD).
export const ROLES = { USER: 'User', RESPONDER: 'Responder', ADMIN: 'Admin' };
export const CATEGORIES = ['Fire', 'Medical', 'Security', 'Accident', 'Infrastructure', 'Maintenance', 'Other'];
export const RESPONDER_CATEGORIES = ['Fire', 'Medical', 'Security', 'Accident', 'Infrastructure', 'Other'];
export const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
export const STATUSES = ['Submitted', 'AI Analyzed', 'Pending Assignment', 'Assigned', 'Accepted', 'In Progress', 'Resolved'];
export const LOCATION_SOURCES = ['gps', 'map', 'manual'];
export const AI_STATUSES = ['pending', 'processing', 'completed', 'failed'];
export const NOTIFICATION_TYPES = ['submitted', 'ai_done', 'assigned', 'accepted', 'status_changed', 'resolved', 'admin_alert', 'responder_alert'];

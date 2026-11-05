import mongoose from 'mongoose';
import Incident from '../models/Incident.js';
import IncidentHistory from '../models/IncidentHistory.js';
import Notification from '../models/Notification.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { isValidTransition } from '../utils/statusFlow.js';
import { validateNote, validateStatusUpdate, REQUIRED_CURRENT } from '../utils/responderRules.js';
import { toClient, canAccess } from './incidentController.js';

const OPEN = ['Assigned', 'Accepted', 'In Progress'];
const PRIORITY_RANK = { Critical: 0, High: 1, Medium: 2, Low: 3 };
const unclaimed = { $or: [{ assignedResponderId: { $exists: false } }, { assignedResponderId: null }] };

const checkId = (id) => { if (!mongoose.isValidObjectId(id)) throw new ApiError(400, 'Invalid incident id'); };

// After an atomic update fails: 404 if the responder may not see the incident at all, otherwise 409 (conflict).
async function explainFailure(user, id, conflictMessage) {
  const incident = await Incident.findById(id);
  if (!incident || !canAccess(user, incident)) throw new ApiError(404, 'Incident not found');
  throw new ApiError(409, conflictMessage);
}

async function notifyReporter(incident, type, message) {
  try {
    await Notification.create({ userId: incident.userId, incidentId: incident._id, type, message });
  } catch (err) {
    console.error('Could not notify reporter:', err.message);
  }
}

// GET /api/responder/incidents - incidents of the responder's group plus the ones assigned to them
export const listIncidents = asyncHandler(async (req, res) => {
  const me = req.user;
  const group = me.responderCategory;
  const [found, newCount, assignedCount, highCount, inProgress, resolved] = await Promise.all([
    Incident.find({ $or: [{ assignedResponderId: me._id }, { assignedCategory: group }] }).sort({ createdAt: -1 }).limit(150),
    Incident.countDocuments({ assignedCategory: group, status: 'Assigned', ...unclaimed }),
    Incident.countDocuments({ assignedResponderId: me._id, status: 'Accepted' }),
    Incident.countDocuments({ status: { $in: OPEN }, priority: { $in: ['High', 'Critical'] }, $or: [{ assignedResponderId: me._id }, { assignedCategory: group }] }),
    Incident.countDocuments({ assignedResponderId: me._id, status: 'In Progress' }),
    Incident.countDocuments({ assignedResponderId: me._id, status: 'Resolved' }),
  ]);
  // Open incidents first, then by priority, then newest.
  const rank = (i) => (OPEN.includes(i.status) ? 0 : 1) * 10 + (PRIORITY_RANK[i.priority] ?? 4);
  const incidents = found.sort((a, b) => rank(a) - rank(b) || b.createdAt - a.createdAt).map((i) => ({
    ...toClient(i),
    claimable: i.status === 'Assigned' && !i.assignedResponderId,
    mine: Boolean(i.assignedResponderId && i.assignedResponderId.equals(me._id)),
  }));
  res.json({ success: true, group, incidents, stats: { newIncidents: newCount, assigned: assignedCount, highPriority: highCount, inProgress, resolved } });
});

// PUT /api/responder/incidents/:id/accept - first responder to accept wins (one atomic update)
export const acceptIncident = asyncHandler(async (req, res) => {
  const me = req.user;
  checkId(req.params.id);
  if (!isValidTransition('Assigned', 'Accepted')) throw new ApiError(500, 'Status flow misconfigured');
  const incident = await Incident.findOneAndUpdate(
    {
      _id: req.params.id,
      status: 'Assigned',
      $and: [
        { $or: [{ assignedCategory: me.responderCategory }, { assignedResponderId: me._id }] },
        { $or: [{ assignedResponderId: { $exists: false } }, { assignedResponderId: null }, { assignedResponderId: me._id }] },
      ],
    },
    { status: 'Accepted', assignedResponderId: me._id },
    { returnDocument: 'after' }
  );
  if (!incident) await explainFailure(me, req.params.id, 'This incident was already accepted by another responder or is not available');

  await IncidentHistory.create({ incidentId: incident._id, status: 'Accepted', changedBy: me._id, note: `Accepted by ${me.name}` });
  await notifyReporter(incident, 'accepted', `Report ${incident.reportId} was accepted by a responder.`);
  res.json({ success: true, incident: toClient(incident) });
});

// PUT /api/responder/incidents/:id/status - body { status: "In Progress" | "Resolved", note }
export const updateStatus = asyncHandler(async (req, res) => {
  const me = req.user;
  checkId(req.params.id);
  const check = validateStatusUpdate(req.body);
  if (check.error) throw new ApiError(400, check.error);
  const from = REQUIRED_CURRENT[check.status];
  if (!isValidTransition(from, check.status)) throw new ApiError(500, 'Status flow misconfigured');

  const incident = await Incident.findOneAndUpdate(
    { _id: req.params.id, assignedResponderId: me._id, status: from },
    { status: check.status, ...(check.status === 'Resolved' ? { resolvedAt: new Date() } : {}) },
    { returnDocument: 'after' }
  );
  if (!incident) await explainFailure(me, req.params.id, `Only your own ${from} incidents can be moved to ${check.status}`);

  await IncidentHistory.create({ incidentId: incident._id, status: check.status, changedBy: me._id, note: check.note || `Status changed to ${check.status}` });
  if (check.status === 'Resolved') await notifyReporter(incident, 'resolved', `Your incident ${incident.reportId} has been marked as resolved.`);
  else await notifyReporter(incident, 'status_changed', `Report ${incident.reportId} is now ${check.status}.`);
  res.json({ success: true, incident: toClient(incident) });
});

// POST /api/responder/incidents/:id/notes - body { note }; stored in the history so the reporter can follow progress
export const addNote = asyncHandler(async (req, res) => {
  const me = req.user;
  checkId(req.params.id);
  const check = validateNote(req.body?.note);
  if (check.error) throw new ApiError(400, check.error);
  const incident = await Incident.findOne({ _id: req.params.id, assignedResponderId: me._id, status: { $in: ['Accepted', 'In Progress'] } });
  if (!incident) await explainFailure(me, req.params.id, 'Notes can only be added to your own incidents that are Accepted or In Progress');
  await IncidentHistory.create({ incidentId: incident._id, status: incident.status, changedBy: me._id, note: `Response note: ${check.text}` });
  res.status(201).json({ success: true });
});

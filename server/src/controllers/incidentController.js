import fs from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import Incident from '../models/Incident.js';
import IncidentHistory from '../models/IncidentHistory.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { ROLES } from '../utils/constants.js';
import { parseIncidentInput } from '../utils/incidentInput.js';
import { fileHasImageSignature } from '../utils/imageCheck.js';
import { generateReportId } from '../utils/reportId.js';
import { uploadsDir } from '../middleware/upload.js';
import { processIncident } from '../services/incidentPipeline.js';

const PENDING = ['Submitted', 'AI Analyzed', 'Pending Assignment', 'Assigned'];
const IN_PROGRESS = ['Accepted', 'In Progress'];

// What the browser receives (the stored file name is never exposed; images are fetched through the protected image route).
export const toClient = (i) => ({
  id: i._id,
  reportId: i.reportId,
  description: i.description,
  hasImage: Boolean(i.imageUrl),
  category: i.category,
  priority: i.priority,
  aiSummary: i.aiSummary,
  aiReason: i.aiReason,
  aiConfidence: i.aiConfidence,
  aiStatus: i.aiStatus,
  aiMethod: i.aiMethod,
  aiCategory: i.aiCategory,
  aiPriority: i.aiPriority,
  latitude: i.latitude,
  longitude: i.longitude,
  locationDescription: i.locationDescription,
  locationSource: i.locationSource,
  isUrgent: i.isUrgent,
  status: i.status,
  assignedCategory: i.assignedCategory,
  assignedResponderId: i.assignedResponderId,
  createdAt: i.createdAt,
  updatedAt: i.updatedAt,
  resolvedAt: i.resolvedAt,
});

// Who may open an incident: its reporter, an Admin, or a Responder of the assigned group / the assigned person.
export function canAccess(user, incident) {
  if (user.role === ROLES.ADMIN) return true;
  if (user.role === ROLES.USER) return incident.userId.equals(user._id);
  if (user.role === ROLES.RESPONDER) {
    return (
      (incident.assignedResponderId && incident.assignedResponderId.equals(user._id)) ||
      (incident.assignedCategory && incident.assignedCategory === user.responderCategory)
    );
  }
  return false;
}

async function loadAccessible(req) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid incident id');
  const incident = await Incident.findById(req.params.id);
  // Same 404 whether it does not exist or belongs to someone else, so IDs cannot be probed.
  if (!incident || !canAccess(req.user, incident)) throw new ApiError(404, 'Incident not found');
  return incident;
}

// POST /api/incidents  (User) - multipart/form-data with optional file field "image"
export const createIncident = asyncHandler(async (req, res) => {
  const file = req.file;
  try {
    const { errors, data } = parseIncidentInput(req.body);
    if (errors.length) throw new ApiError(400, 'Validation failed', errors);
    if (file && !(await fileHasImageSignature(file.path))) throw new ApiError(415, 'The file is not a valid JPG or PNG image');

    const reportId = await generateReportId();
    const incident = await Incident.create({ ...data, reportId, userId: req.user._id, imageUrl: file?.filename });

    // History and notification are secondary: the report is already saved, so a failure here must not lose it.
    try {
      await IncidentHistory.create({ incidentId: incident._id, status: 'Submitted', changedBy: req.user._id, note: 'Report submitted' });
      await Notification.create({ userId: req.user._id, incidentId: incident._id, type: 'submitted', message: `Report ${reportId} was submitted.` });
    } catch (err) {
      console.error('Could not write history/notification for', reportId, err.message);
    }
    res.status(201).json({ success: true, incident: toClient(incident) });
    // The answer is already sent; AI analysis and routing continue in the background.
    setImmediate(() => processIncident(incident._id).catch((e) => console.error('processIncident failed:', e.message)));
  } catch (err) {
    if (file) await fs.unlink(file.path).catch(() => {}); // do not keep files of rejected reports
    throw err;
  }
});

// GET /api/incidents  (User) - own reports plus the numbers for the dashboard cards
export const listMyIncidents = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const [incidents, total, pending, inProgress, resolved, highPriority] = await Promise.all([
    Incident.find({ userId }).sort({ createdAt: -1 }).limit(50),
    Incident.countDocuments({ userId }),
    Incident.countDocuments({ userId, status: { $in: PENDING } }),
    Incident.countDocuments({ userId, status: { $in: IN_PROGRESS } }),
    Incident.countDocuments({ userId, status: 'Resolved' }),
    Incident.countDocuments({ userId, priority: { $in: ['High', 'Critical'] } }),
  ]);
  res.json({ success: true, incidents: incidents.map(toClient), stats: { total, pending, inProgress, resolved, highPriority } });
});

// GET /api/incidents/:id  (reporter, assigned Responder, Admin)
export const getIncident = asyncHandler(async (req, res) => {
  const incident = await loadAccessible(req);
  const history = await IncidentHistory.find({ incidentId: incident._id }).sort({ timestamp: 1 }).populate('changedBy', 'name role');
  const responder = incident.assignedResponderId ? await User.findById(incident.assignedResponderId).select('name') : null;
  const out = { ...toClient(incident), assignedResponderName: responder?.name, history: history.map((h) => ({ status: h.status, note: h.note, timestamp: h.timestamp, changedBy: h.changedBy ? h.changedBy.name : 'System' })) };
  if (req.user.role !== ROLES.USER) out.reporterName = (await User.findById(incident.userId).select('name'))?.name;
  res.json({ success: true, incident: out });
});

// GET /api/incidents/:id/image  (same access rules; the file itself is never served publicly)
export const getIncidentImage = asyncHandler(async (req, res, next) => {
  const incident = await loadAccessible(req);
  if (!incident.imageUrl) throw new ApiError(404, 'This incident has no image');
  const file = path.join(uploadsDir, path.basename(incident.imageUrl));
  res.sendFile(file, { headers: { 'Cache-Control': 'private, max-age=3600' } }, (err) => {
    if (err) next(new ApiError(404, 'Image file not found'));
  });
});

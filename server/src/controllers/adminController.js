import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import Incident from '../models/Incident.js';
import IncidentHistory from '../models/IncidentHistory.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { ROLES } from '../utils/constants.js';
import { isValidTransition } from '../utils/statusFlow.js';
import { parseIncidentFilters, validateClassification, validateNewUser, validateUserUpdate } from '../utils/adminRules.js';
import { toClient } from './incidentController.js';

const PENDING = ['Submitted', 'AI Analyzed', 'Pending Assignment', 'Assigned'];
const IN_PROGRESS = ['Accepted', 'In Progress'];
const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role, responderCategory: u.responderCategory, isActive: u.isActive, createdAt: u.createdAt });
const checkId = (id, what = 'id') => { if (!mongoose.isValidObjectId(id)) throw new ApiError(400, `Invalid ${what}`); };
const filtersOrThrow = (query) => {
  const { filter, errors } = parseIncidentFilters(query);
  if (errors.length) throw new ApiError(400, errors[0], errors.map((message) => ({ message })));
  return filter;
};

// GET /api/admin/incidents?status=&category=&priority=&from=&to=&q=&page=
export const listIncidents = asyncHandler(async (req, res) => {
  const filter = filtersOrThrow(req.query);
  const limit = 15;
  const page = Math.min(Math.max(parseInt(req.query.page, 10) || 1, 1), 1000);
  const [found, total] = await Promise.all([
    Incident.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Incident.countDocuments(filter),
  ]);
  const ids = [...new Set(found.flatMap((i) => [i.userId, i.assignedResponderId]).filter(Boolean).map(String))];
  const names = Object.fromEntries((await User.find({ _id: { $in: ids } }).select('name')).map((u) => [String(u._id), u.name]));
  const incidents = found.map((i) => ({ ...toClient(i), reporterName: names[String(i.userId)], assignedResponderName: i.assignedResponderId ? names[String(i.assignedResponderId)] : undefined }));
  res.json({ success: true, incidents, total, page, pages: Math.max(Math.ceil(total / limit), 1) });
});

// GET /api/admin/analytics (same filters as the list, so the charts follow the filters)
export const analytics = asyncHandler(async (req, res) => {
  const filter = filtersOrThrow(req.query);
  const [r] = await Incident.aggregate([
    { $match: filter },
    { $facet: {
      total: [{ $count: 'n' }],
      byCategory: [{ $group: { _id: { $ifNull: ['$category', 'Unclassified'] }, count: { $sum: 1 } } }, { $sort: { count: -1 } }],
      byPriority: [{ $group: { _id: { $ifNull: ['$priority', 'Unclassified'] }, count: { $sum: 1 } } }],
      byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
      overTime: [{ $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }],
      byLocation: [
        { $group: { _id: { $ifNull: ['$locationDescription', { $concat: [{ $toString: { $round: ['$latitude', 2] } }, ', ', { $toString: { $round: ['$longitude', 2] } }] }] }, count: { $sum: 1 } } },
        { $sort: { count: -1 } }, { $limit: 8 },
      ],
    } },
  ]);
  const rows = (arr) => arr.map((x) => ({ name: x._id ?? 'Unknown', count: x.count }));
  const byStatus = rows(r.byStatus);
  const sum = (list) => byStatus.filter((s) => list.includes(s.name)).reduce((a, s) => a + s.count, 0);
  const byPriority = rows(r.byPriority);
  res.json({
    success: true,
    stats: {
      total: r.total[0]?.n || 0,
      pending: sum(PENDING),
      highPriority: byPriority.filter((p) => ['High', 'Critical'].includes(p.name)).reduce((a, p) => a + p.count, 0),
      inProgress: sum(IN_PROGRESS),
      resolved: sum(['Resolved']),
    },
    byCategory: rows(r.byCategory), byPriority, byStatus, overTime: rows(r.overTime), byLocation: rows(r.byLocation),
  });
});

// GET /api/admin/users?role=
export const listUsers = asyncHandler(async (req, res) => {
  const filter = Object.values(ROLES).includes(req.query.role) ? { role: req.query.role } : {};
  const users = await User.find(filter).sort({ role: 1, createdAt: -1 }).limit(300);
  res.json({ success: true, users: users.map(publicUser) });
});

// POST /api/admin/users - create a Responder or Admin account
export const createUser = asyncHandler(async (req, res) => {
  const v = validateNewUser(req.body);
  if (v.error) throw new ApiError(400, v.error);
  if (await User.findOne({ email: v.email })) throw new ApiError(409, 'An account with this email already exists');
  const { password, ...rest } = v;
  const user = await User.create({ ...rest, passwordHash: await bcrypt.hash(password, 10) });
  res.status(201).json({ success: true, user: publicUser(user) });
});

// PUT /api/admin/users/:id - change name, role, group or active state
export const updateUser = asyncHandler(async (req, res) => {
  checkId(req.params.id, 'user id');
  const v = validateUserUpdate(req.body);
  if (v.error) throw new ApiError(400, v.error);
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  if (String(user._id) === String(req.user._id) && (v.update.role && v.update.role !== ROLES.ADMIN || v.update.isActive === false))
    throw new ApiError(400, 'You cannot remove your own admin access'); // prevents locking everyone out
  Object.assign(user, v.update);
  await user.save(); // runs the model rules, for example "a Responder needs a group"
  res.json({ success: true, user: publicUser(user) });
});

// PUT /api/admin/incidents/:id/classification - correct the AI's category or priority (the AI's own values are kept)
export const correctClassification = asyncHandler(async (req, res) => {
  checkId(req.params.id, 'incident id');
  const v = validateClassification(req.body);
  if (v.error) throw new ApiError(400, v.error);
  const incident = await Incident.findById(req.params.id);
  if (!incident) throw new ApiError(404, 'Incident not found');
  const before = `${incident.category || 'none'}/${incident.priority || 'none'}`;
  incident.category = v.category;
  incident.priority = v.priority;
  await incident.save();
  await IncidentHistory.create({ incidentId: incident._id, status: incident.status, changedBy: req.user._id, note: `Admin corrected the classification: ${before} to ${v.category}/${v.priority}` });
  res.json({ success: true, incident: toClient(incident) });
});

// PUT /api/admin/incidents/:id/assign - body { responderId }; also used to reassign
export const assignIncident = asyncHandler(async (req, res) => {
  checkId(req.params.id, 'incident id');
  checkId(req.body?.responderId, 'responder id');
  const responder = await User.findOne({ _id: req.body.responderId, role: ROLES.RESPONDER, isActive: true });
  if (!responder) throw new ApiError(404, 'Responder not found or not active');
  const current = await Incident.findById(req.params.id);
  if (!current) throw new ApiError(404, 'Incident not found');
  if (!isValidTransition(current.status, 'Assigned')) throw new ApiError(409, `A ${current.status} incident cannot be assigned`);

  const incident = await Incident.findOneAndUpdate(
    { _id: current._id, status: current.status }, // only if nobody changed it in the meantime
    { status: 'Assigned', assignedResponderId: responder._id, assignedCategory: responder.responderCategory },
    { returnDocument: 'after' }
  );
  if (!incident) throw new ApiError(409, 'The incident was changed by someone else. Reload and try again.');
  await IncidentHistory.create({ incidentId: incident._id, status: 'Assigned', changedBy: req.user._id, note: `Assigned by an administrator to ${responder.name} (${responder.responderCategory} group)` });
  await Notification.insertMany([
    { userId: responder._id, incidentId: incident._id, type: 'responder_alert', message: `Incident ${incident.reportId} was assigned to you by an administrator.` },
    { userId: incident.userId, incidentId: incident._id, type: 'assigned', message: `Report ${incident.reportId} was assigned to a responder.` },
  ]).catch((e) => console.error('Could not create notifications:', e.message));
  res.json({ success: true, incident: toClient(incident) });
});

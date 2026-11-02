// What happens after a report is saved: AI analysis, then routing to a responder group.
// The report is already stored when this runs, so a failure here can never lose a report.
import Incident from '../models/Incident.js';
import IncidentHistory from '../models/IncidentHistory.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { ROLES } from '../utils/constants.js';
import { isValidTransition } from '../utils/statusFlow.js';
import { analyzeReport } from './ai/index.js';
import { routeGroup } from './routing.js';

const addHistory = (incidentId, status, note) => IncidentHistory.create({ incidentId, status, note }); // no changedBy = system action

async function notify(userIds, incident, type, message) {
  if (!userIds.length) return;
  try {
    await Notification.insertMany(userIds.map((userId) => ({ userId, incidentId: incident._id, type, message })));
  } catch (err) {
    console.error('Could not create notifications:', err.message);
  }
}

const adminIds = async () => (await User.find({ role: ROLES.ADMIN, isActive: true }).select('_id')).map((u) => u._id);

async function markFailed(incident, reason) {
  await Incident.updateOne({ _id: incident._id }, { aiStatus: 'failed' });
  await addHistory(incident._id, 'Submitted', 'AI analysis failed; manual review needed');
  await notify(await adminIds(), incident, 'admin_alert', `AI analysis failed for ${incident.reportId}. Please review and assign it manually.`);
  console.error(`AI analysis failed for ${incident.reportId}: ${reason}`);
}

async function route(incident, { category, priority }) {
  const group = routeGroup(category);
  const responders = await User.find({ role: ROLES.RESPONDER, responderCategory: group, isActive: true }).select('_id');
  const next = responders.length ? 'Assigned' : 'Pending Assignment';
  if (!isValidTransition('AI Analyzed', next)) return;

  const res = await Incident.updateOne({ _id: incident._id, status: 'AI Analyzed' }, { status: next, assignedCategory: group });
  if (!res.modifiedCount) return; // someone (an Admin) already changed it
  if (responders.length) {
    await addHistory(incident._id, 'Assigned', `Routed to the ${group} responder group`);
    const urgent = ['High', 'Critical'].includes(priority) ? 'high-priority ' : '';
    await notify(responders.map((u) => u._id), incident, 'responder_alert', `New ${urgent}incident ${incident.reportId} (${category}, ${priority}) is available for the ${group} group.`);
    await notify([incident.userId], incident, 'assigned', `Report ${incident.reportId} was routed to the ${group} response group.`);
  } else {
    await addHistory(incident._id, 'Pending Assignment', `No active responder in the ${group} group`);
    await notify(await adminIds(), incident, 'admin_alert', `No responder is available for ${incident.reportId} (${category}, ${priority}). Please assign it manually.`);
  }
}

export async function processIncident(incidentId) {
  // Claim the report so the normal run and the start-up recovery never process it twice.
  const incident = await Incident.findOneAndUpdate({ _id: incidentId, aiStatus: 'pending' }, { aiStatus: 'processing' }, { returnDocument: 'after' });
  if (!incident) return;
  try {
    const result = await analyzeReport({ description: incident.description, locationDescription: incident.locationDescription, isUrgent: incident.isUrgent });
    if (!result.ok) return await markFailed(incident, result.error);

    const { category, priority, summary, reason } = result.value;
    if (!isValidTransition('Submitted', 'AI Analyzed')) return;
    const res = await Incident.updateOne(
      { _id: incident._id, status: 'Submitted' },
      { aiCategory: category, aiPriority: priority, category, priority, aiSummary: summary, aiReason: reason, aiMethod: result.method, aiStatus: 'completed', status: 'AI Analyzed' }
    );
    if (!res.modifiedCount) return;
    await addHistory(incident._id, 'AI Analyzed', `AI recommendation (${result.method}): ${category}, ${priority} priority`);
    await notify([incident.userId], incident, 'ai_done', `AI analysis of ${incident.reportId} is complete: suggested ${category}, ${priority} priority (a recommendation to be verified by a responder).`);
    await route(incident, result.value);
  } catch (err) {
    console.error(`Pipeline error for ${incident.reportId}:`, err.message);
    await Incident.updateOne({ _id: incident._id, aiStatus: 'processing' }, { aiStatus: 'failed' }).catch(() => {});
  }
}

// Run at start-up and every few minutes: finish reports that were saved but not analysed (for example if the server restarted).
export async function recoverPendingIncidents() {
  const now = Date.now();
  await Incident.updateMany({ aiStatus: 'processing', updatedAt: { $lt: new Date(now - 2 * 60 * 1000) } }, { aiStatus: 'pending' });
  const stuck = await Incident.find({ aiStatus: 'pending', createdAt: { $lt: new Date(now - 30 * 1000) } }).limit(50).select('_id');
  for (const { _id } of stuck) await processIncident(_id);
  return stuck.length;
}

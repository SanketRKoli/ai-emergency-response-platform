import mongoose from 'mongoose';
import { STATUSES } from '../utils/constants.js';

const historySchema = new mongoose.Schema({
  incidentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Incident', required: true },
  status: { type: String, enum: STATUSES, required: true },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // empty = system action
  note: { type: String, maxlength: 1000 },
  timestamp: { type: Date, default: Date.now },
});
historySchema.index({ incidentId: 1, timestamp: 1 });

export default mongoose.model('IncidentHistory', historySchema);

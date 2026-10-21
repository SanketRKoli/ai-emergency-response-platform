import mongoose from 'mongoose';
import { NOTIFICATION_TYPES } from '../utils/constants.js';

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    incidentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Incident' },
    message: { type: String, required: true, maxlength: 300 },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);

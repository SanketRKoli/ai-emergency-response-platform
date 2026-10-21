import mongoose from 'mongoose';
import { CATEGORIES, PRIORITIES, STATUSES, LOCATION_SOURCES, AI_STATUSES, RESPONDER_CATEGORIES } from '../utils/constants.js';

const incidentSchema = new mongoose.Schema(
  {
    reportId: { type: String, required: true, unique: true }, // e.g. INC-2026-0001
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    imageUrl: { type: String },

    // AI recommendation (kept unchanged) and the current/confirmed values (admin can correct).
    aiCategory: { type: String, enum: CATEGORIES },
    aiPriority: { type: String, enum: PRIORITIES },
    category: { type: String, enum: CATEGORIES },
    priority: { type: String, enum: PRIORITIES },
    aiSummary: { type: String },
    aiReason: { type: String },
    aiConfidence: { type: Number, min: 0, max: 1 }, // only when the model gives a meaningful value
    aiStatus: { type: String, enum: AI_STATUSES, default: 'pending' },

    latitude: { type: Number, min: -90, max: 90 },
    longitude: { type: Number, min: -180, max: 180 },
    locationDescription: { type: String, trim: true, maxlength: 300 },
    locationSource: { type: String, enum: LOCATION_SOURCES },
    isUrgent: { type: Boolean, default: false },

    status: { type: String, enum: STATUSES, default: 'Submitted' },
    assignedCategory: { type: String, enum: RESPONDER_CATEGORIES },
    assignedResponderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

// A report needs a location: coordinates (both) or a typed description.
incidentSchema.pre('validate', function () {
  const hasLat = this.latitude != null;
  const hasLng = this.longitude != null;
  if (hasLat !== hasLng) this.invalidate('latitude', 'latitude and longitude must be provided together');
  if (!(hasLat && hasLng) && !this.locationDescription) {
    this.invalidate('locationDescription', 'Provide coordinates or a location description');
  }
});

incidentSchema.index({ userId: 1, createdAt: -1 });
incidentSchema.index({ status: 1, priority: 1 });
incidentSchema.index({ assignedCategory: 1, status: 1 });
incidentSchema.index({ assignedResponderId: 1 });

export default mongoose.model('Incident', incidentSchema);

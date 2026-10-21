import mongoose from 'mongoose';
import { ROLES, RESPONDER_CATEGORIES } from '../utils/constants.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // select:false -> the hash is never returned unless a query asks for it explicitly.
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: Object.values(ROLES), default: ROLES.USER },
    // Only used when role is Responder (which incident group they handle).
    responderCategory: { type: String, enum: RESPONDER_CATEGORIES },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.pre('validate', function () {
  if (this.role === ROLES.RESPONDER && !this.responderCategory) {
    this.invalidate('responderCategory', 'responderCategory is required for Responders');
  }
});

export default mongoose.model('User', userSchema);

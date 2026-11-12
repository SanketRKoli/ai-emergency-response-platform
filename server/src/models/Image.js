import mongoose from 'mongoose';

// Incident photos are stored in the database (not on disk), so they survive restarts and redeploys on hosting platforms.
const imageSchema = new mongoose.Schema(
  {
    data: { type: Buffer, required: true },
    contentType: { type: String, enum: ['image/jpeg', 'image/png'], required: true },
    size: { type: Number, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model('Image', imageSchema);

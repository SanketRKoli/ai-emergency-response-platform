import mongoose from 'mongoose';

// Atomic counters, used to create report IDs such as INC-2026-0001 without duplicates.
const counterSchema = new mongoose.Schema({ _id: String, seq: { type: Number, default: 0 } });

export default mongoose.model('Counter', counterSchema);

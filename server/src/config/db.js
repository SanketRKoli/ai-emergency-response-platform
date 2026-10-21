import mongoose from 'mongoose';
import { env } from './env.js';

export default async function connectDB() {
  await mongoose.connect(env.mongoUri);
  console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
}

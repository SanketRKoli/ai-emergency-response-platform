// Changes the password of an existing account (for example the demo Admin before sharing a public link).
//   npm run set-password -- admin@demo.test "NewPassword123"
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import User from '../models/User.js';

const [email, password] = process.argv.slice(2);
if (!email || !password || password.length < 8 || password.length > 72) {
  console.error('Usage: npm run set-password -- <email> "<new password, 8 to 72 characters>"');
  process.exit(1);
}
await mongoose.connect(env.mongoUri);
const user = await User.findOne({ email: email.trim().toLowerCase() });
if (!user) { console.error(`No account with email ${email}`); await mongoose.disconnect(); process.exit(1); }
user.passwordHash = await bcrypt.hash(password, 10);
await user.save();
console.log(`Password changed for ${user.email} (${user.role}).`);
await mongoose.disconnect();

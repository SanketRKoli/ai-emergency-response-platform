// Creates demo Admin and Responder accounts (safe to run more than once).
// Run:  npm run seed      DEMO PASSWORDS ONLY - change them for any real use.
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import User from '../models/User.js';
import { ROLES, RESPONDER_CATEGORIES } from '../utils/constants.js';

const ADMIN_PASSWORD = 'Admin@12345';
const RESPONDER_PASSWORD = 'Responder@123';

const accounts = [
  { name: 'System Admin', email: 'admin@demo.test', role: ROLES.ADMIN, password: ADMIN_PASSWORD },
  ...RESPONDER_CATEGORIES.map((c) => ({
    name: `${c} Responder`,
    email: `${c.toLowerCase()}@demo.test`,
    role: ROLES.RESPONDER,
    responderCategory: c,
    password: RESPONDER_PASSWORD,
  })),
];

if (env.isProduction) {
  console.error('Refusing to create demo accounts with known passwords in production. Create real accounts instead.');
  process.exit(1);
}

await mongoose.connect(env.mongoUri);
for (const { password, ...data } of accounts) {
  const exists = await User.findOne({ email: data.email });
  if (exists) { console.log(`skip   ${data.email} (already exists)`); continue; }
  await User.create({ ...data, passwordHash: await bcrypt.hash(password, 10) });
  console.log(`created ${data.email}  [${data.role}${data.responderCategory ? ' - ' + data.responderCategory : ''}]`);
}
await mongoose.disconnect();
console.log(`\nAdmin login:     admin@demo.test / ${ADMIN_PASSWORD}\nResponder login: fire@demo.test (or medical, security, accident, infrastructure, other) / ${RESPONDER_PASSWORD}`);

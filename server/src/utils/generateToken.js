import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

// Token carries only the user id and role. The secret stays on the server.
export default function generateToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

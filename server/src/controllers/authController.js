import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { ROLES } from '../utils/constants.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import generateToken from '../utils/generateToken.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isString = (v) => typeof v === 'string'; // rejects objects like {"$ne": ""} (NoSQL injection)

const publicUser = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  role: u.role,
  responderCategory: u.responderCategory,
});

// POST /api/auth/register  (public) - always creates a normal User account
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, confirmPassword } = req.body || {};
  const errors = [];
  if (!isString(name) || name.trim().length < 2) errors.push({ field: 'name', message: 'Full name must be at least 2 characters' });
  if (!isString(email) || !EMAIL_RE.test(email.trim())) errors.push({ field: 'email', message: 'Enter a valid email address' });
  if (!isString(password) || password.length < 8 || password.length > 72)
    errors.push({ field: 'password', message: 'Password must be 8 to 72 characters' });
  else if (password !== confirmPassword) errors.push({ field: 'confirmPassword', message: 'Passwords do not match' });
  if (errors.length) throw new ApiError(400, 'Validation failed', errors);

  const normalizedEmail = email.trim().toLowerCase();
  if (await User.findOne({ email: normalizedEmail })) throw new ApiError(409, 'An account with this email already exists');

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name: name.trim(), email: normalizedEmail, passwordHash, role: ROLES.USER });
  res.status(201).json({ success: true, token: generateToken(user), user: publicUser(user) });
});

// POST /api/auth/login  (public)
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  if (!isString(email) || !isString(password) || !email.trim() || !password)
    throw new ApiError(400, 'Email and password are required');

  const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+passwordHash');
  const ok = user && user.isActive && (await bcrypt.compare(password, user.passwordHash));
  // Same message for wrong email and wrong password, so attackers cannot discover which emails exist.
  if (!ok) throw new ApiError(401, 'Invalid email or password');

  res.json({ success: true, token: generateToken(user), user: publicUser(user) });
});

// GET /api/auth/me  (any logged-in user)
export const me = asyncHandler(async (req, res) => {
  res.json({ success: true, user: publicUser(req.user) });
});

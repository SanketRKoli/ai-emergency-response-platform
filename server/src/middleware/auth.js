import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

// protect: verifies the JWT and attaches the user to req.user (401 if anything is wrong).
export const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) throw new ApiError(401, 'Not authenticated: token missing');

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    throw new ApiError(401, 'Not authenticated: token invalid or expired');
  }

  const user = await User.findById(payload.id);
  if (!user || !user.isActive) throw new ApiError(401, 'Not authenticated: account not found or disabled');
  req.user = user;
  next();
});

// authorize: allows only the listed roles (403 otherwise). Always use after protect.
export const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new ApiError(403, 'You do not have permission to perform this action'));
  }
  next();
};

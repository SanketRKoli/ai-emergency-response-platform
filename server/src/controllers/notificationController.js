import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

const toClient = (n) => ({ id: n._id, incidentId: n.incidentId, type: n.type, message: n.message, read: n.read, createdAt: n.createdAt });

// GET /api/notifications - the logged-in user's own notifications (newest first) and the unread count
export const listNotifications = asyncHandler(async (req, res) => {
  const [items, unread] = await Promise.all([
    Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(30),
    Notification.countDocuments({ userId: req.user._id, read: false }),
  ]);
  res.json({ success: true, unread, notifications: items.map(toClient) });
});

// PUT /api/notifications/read-all
export const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ userId: req.user._id, read: false }, { read: true });
  res.json({ success: true });
});

// PUT /api/notifications/:id/read - only the owner can mark a notification as read
export const markRead = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid notification id');
  const result = await Notification.updateOne({ _id: req.params.id, userId: req.user._id }, { read: true });
  if (!result.matchedCount) throw new ApiError(404, 'Notification not found'); // same answer for "not yours" and "does not exist"
  res.json({ success: true });
});

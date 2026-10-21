import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { createIncident, listMyIncidents, getIncident, getIncidentImage } from '../controllers/incidentController.js';
import { protect, authorize } from '../middleware/auth.js';
import { uploadImage } from '../middleware/upload.js';
import { ROLES } from '../utils/constants.js';

const router = Router();
router.use(protect); // every incident route needs a valid token

const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many reports submitted. Please try again later.' },
});

router.post('/', authorize(ROLES.USER), createLimiter, uploadImage, createIncident);
router.get('/', authorize(ROLES.USER), listMyIncidents);
router.get('/:id/image', getIncidentImage);
router.get('/:id', getIncident);

export default router;

import { Router } from 'express';
import { listNotifications, markRead, markAllRead } from '../controllers/notificationController.js';
import { protect } from '../middleware/auth.js';

const router = Router();
router.use(protect); // any logged-in user; each one only ever sees their own notifications

router.get('/', listNotifications);
router.put('/read-all', markAllRead); // must come before "/:id/read"
router.put('/:id/read', markRead);

export default router;

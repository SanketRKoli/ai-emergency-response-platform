import { Router } from 'express';
import { listIncidents, acceptIncident, updateStatus, addNote } from '../controllers/responderController.js';
import { protect, authorize } from '../middleware/auth.js';
import { ROLES } from '../utils/constants.js';

const router = Router();
router.use(protect, authorize(ROLES.RESPONDER)); // only logged-in Responders

router.get('/incidents', listIncidents);
router.put('/incidents/:id/accept', acceptIncident);
router.put('/incidents/:id/status', updateStatus);
router.post('/incidents/:id/notes', addNote);

export default router;

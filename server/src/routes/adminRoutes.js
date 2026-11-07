import { Router } from 'express';
import { listIncidents, analytics, listUsers, createUser, updateUser, correctClassification, assignIncident } from '../controllers/adminController.js';
import { protect, authorize } from '../middleware/auth.js';
import { ROLES } from '../utils/constants.js';

const router = Router();
router.use(protect, authorize(ROLES.ADMIN)); // only logged-in Admins

router.get('/incidents', listIncidents);
router.get('/analytics', analytics);
router.put('/incidents/:id/assign', assignIncident);
router.put('/incidents/:id/classification', correctClassification);
router.get('/users', listUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUser);

export default router;

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import authRoutes from './routes/authRoutes.js';
import incidentRoutes from './routes/incidentRoutes.js';
import { notFound, errorHandler } from './middleware/error.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: env.clientUrl })); // only the React app may call the API from a browser
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (req, res) => res.json({ success: true, message: 'AI Emergency Response API is running' }));
app.use('/api/auth', authRoutes);
app.use('/api/incidents', incidentRoutes);
// Next stages add: /api/responder, /api/admin, /api/notifications

app.use(notFound);
app.use(errorHandler);

export default app;

import { env } from './config/env.js';
import connectDB from './config/db.js';
import app from './app.js';

try {
  await connectDB();
  app.listen(env.port, () => console.log(`API listening on http://localhost:${env.port}`));
} catch (err) {
  console.error('Failed to start server:', err.message);
  process.exit(1);
}

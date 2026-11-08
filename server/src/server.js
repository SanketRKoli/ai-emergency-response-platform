import { env } from './config/env.js';
import connectDB from './config/db.js';
import app from './app.js';
import { aiConfig } from './config/aiConfig.js';
import { recoverPendingIncidents } from './services/incidentPipeline.js';

try {
  await connectDB();
  app.listen(env.port, () => console.log(`API listening on http://localhost:${env.port}`));
  const labels = { rules: 'keyword-rule baseline', ml: 'machine-learning classifier', hybrid: 'machine learning + safety rule' };
  console.log(`AI provider: ${aiConfig.provider}${labels[aiConfig.provider] ? ` (${labels[aiConfig.provider]})` : ''}`);
  const recover = () => recoverPendingIncidents().catch((e) => console.error('Recovery failed:', e.message));
  recover();
  setInterval(recover, 5 * 60 * 1000).unref();
} catch (err) {
  console.error('Failed to start server:', err.message);
  process.exit(1);
}

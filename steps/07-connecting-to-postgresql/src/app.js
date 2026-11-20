import express from 'express';
import { tasksRouter } from './routes/tasks.js';
import { tasksRepo } from './repo/tasks.js';
import { errorHandler, notFoundHandler } from './errors.js';

export function createApp({ pool }) {
  const app = express();
  app.use(express.json({ limit: '10kb' }));

  app.get('/', (req, res) => res.json({ service: 'task-api', status: 'ok' }));

  // Liveness: the process is running and can answer.
  app.get('/healthz', (req, res) => res.json({ status: 'ok' }));

  // Readiness: the process can do real work, which needs the database.
  app.get('/readyz', async (req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ready' });
    } catch (err) {
      console.error(`readiness check failed: ${err.code ?? err.message}`);
      res.status(503).json({ status: 'not ready', reason: 'database unreachable' });
    }
  });

  app.use('/tasks', tasksRouter(tasksRepo(pool)));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

import express from 'express';
import { tasksRouter } from './routes/tasks.js';
import { errorHandler, notFoundHandler } from './errors.js';

export function createApp() {
  const app = express();
  app.use(express.json({ limit: '10kb' }));

  app.get('/', (req, res) => res.json({ service: 'task-api', status: 'ok' }));
  app.use('/tasks', tasksRouter);

  // A route that fails the way real code fails: an awaited promise rejects.
  app.get('/debug/boom', async () => {
    await Promise.reject(new Error('database connection reset'));
  });

  app.use(notFoundHandler);
  app.use(errorHandler); // always last
  return app;
}

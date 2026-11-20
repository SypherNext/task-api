import express from 'express';
import { tasksRouter } from './routes/tasks.js';

export function createApp() {
  const app = express();
  app.use(express.json());

  app.get('/', (req, res) => res.json({ service: 'task-api', status: 'ok' }));
  app.use('/tasks', tasksRouter);

  // Anything no route answered: a JSON 404 instead of Express's HTML page.
  app.use((req, res) => {
    res.status(404).json({ error: `no route for ${req.method} ${req.path}` });
  });
  return app;
}

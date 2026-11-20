import { Router } from 'express';
import { validate } from '../validate.js';
import { CreateTask } from '../schemas.js';

export function tasksRouter(tasks) {
  const router = Router();

  router.get('/', async (req, res) => {
    res.json({ data: await tasks.list() });
  });

  router.post('/', validate({ body: CreateTask }), async (req, res) => {
    const task = await tasks.create(req.valid.body);
    res.status(201).location(`/tasks/${task.id}`).json(task);
  });

  return router;
}

import { Router } from 'express';
import { validate } from '../validate.js';
import { notFound } from '../errors.js';
import { CreateTask, UpdateTask, TaskParams } from '../schemas.js';

export function tasksRouter(tasks) {
  const router = Router();
  const missing = (id) => notFound(`Task ${id} does not exist.`);

  router.get('/', async (req, res) => {
    res.json({ data: await tasks.list() });
  });

  router.post('/', validate({ body: CreateTask }), async (req, res) => {
    const task = await tasks.create(req.valid.body);
    res.status(201).location(`/tasks/${task.id}`).json(task);
  });

  router.get('/:id', validate({ params: TaskParams }), async (req, res) => {
    const task = await tasks.get(req.valid.params.id);
    if (!task) throw missing(req.valid.params.id);
    res.json(task);
  });

  router.patch('/:id', validate({ params: TaskParams, body: UpdateTask }), async (req, res) => {
    const task = await tasks.update(req.valid.params.id, req.valid.body);
    if (!task) throw missing(req.valid.params.id);
    res.json(task);
  });

  router.delete('/:id', validate({ params: TaskParams }), async (req, res) => {
    if (!(await tasks.remove(req.valid.params.id))) throw missing(req.valid.params.id);
    res.sendStatus(204);
  });

  return router;
}

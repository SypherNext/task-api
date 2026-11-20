import { Router } from 'express';
import * as store from '../store.js';
import { validate } from '../validate.js';
import { notFound } from '../errors.js';
import { CreateTask, UpdateTask, TaskParams } from '../schemas.js';

export const tasksRouter = Router();

tasksRouter.get('/', async (req, res) => {
  res.json({ data: await store.listTasks() });
});

tasksRouter.post('/', validate({ body: CreateTask }), async (req, res) => {
  const task = await store.createTask(req.valid.body);
  res.status(201).location(`/tasks/${task.id}`).json(task);
});

tasksRouter.get('/:id', validate({ params: TaskParams }), async (req, res) => {
  const task = await store.getTask(req.valid.params.id);
  if (!task) throw notFound(`Task ${req.valid.params.id} does not exist.`);
  res.json(task);
});

tasksRouter.patch('/:id', validate({ params: TaskParams, body: UpdateTask }), async (req, res) => {
  const task = await store.updateTask(req.valid.params.id, req.valid.body);
  if (!task) throw notFound(`Task ${req.valid.params.id} does not exist.`);
  res.json(task);
});

tasksRouter.delete('/:id', validate({ params: TaskParams }), async (req, res) => {
  if (!(await store.deleteTask(req.valid.params.id))) {
    throw notFound(`Task ${req.valid.params.id} does not exist.`);
  }
  res.sendStatus(204);
});

import { Router } from 'express';
import * as store from '../store.js';
import { validate } from '../validate.js';
import { CreateTask, UpdateTask, TaskParams } from '../schemas.js';

export const tasksRouter = Router();

tasksRouter.get('/', (req, res) => {
  res.json({ data: store.listTasks() });
});

tasksRouter.post('/', validate({ body: CreateTask }), (req, res) => {
  const task = store.createTask(req.valid.body);
  res.status(201).location(`/tasks/${task.id}`).json(task);
});

tasksRouter.get('/:id', validate({ params: TaskParams }), (req, res) => {
  const task = store.getTask(req.valid.params.id);
  if (!task) return res.status(404).json({ error: 'task not found' });
  res.json(task);
});

tasksRouter.patch('/:id', validate({ params: TaskParams, body: UpdateTask }), (req, res) => {
  const task = store.updateTask(req.valid.params.id, req.valid.body);
  if (!task) return res.status(404).json({ error: 'task not found' });
  res.json(task);
});

tasksRouter.delete('/:id', validate({ params: TaskParams }), (req, res) => {
  if (!store.deleteTask(req.valid.params.id)) {
    return res.status(404).json({ error: 'task not found' });
  }
  res.sendStatus(204);
});

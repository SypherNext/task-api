import { Router } from 'express';
import * as store from '../store.js';

export const tasksRouter = Router();

// GET /tasks: the collection
tasksRouter.get('/', (req, res) => {
  res.json({ data: store.listTasks() });
});

// POST /tasks: create one, answer 201 with a Location header
tasksRouter.post('/', (req, res) => {
  const task = store.createTask({ title: req.body.title });
  res.status(201).location(`/tasks/${task.id}`).json(task);
});

// GET /tasks/:id: one item
tasksRouter.get('/:id', (req, res) => {
  const task = store.getTask(Number(req.params.id));
  if (!task) return res.status(404).json({ error: 'task not found' });
  res.json(task);
});

// PATCH /tasks/:id: change some fields
tasksRouter.patch('/:id', (req, res) => {
  const task = store.updateTask(Number(req.params.id), req.body);
  if (!task) return res.status(404).json({ error: 'task not found' });
  res.json(task);
});

// DELETE /tasks/:id: remove it, answer 204 with no body
tasksRouter.delete('/:id', (req, res) => {
  if (!store.deleteTask(Number(req.params.id))) {
    return res.status(404).json({ error: 'task not found' });
  }
  res.sendStatus(204);
});

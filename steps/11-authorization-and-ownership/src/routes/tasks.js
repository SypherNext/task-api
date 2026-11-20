import { Router } from 'express';
import { validate } from '../validate.js';
import { notFound, ValidationError } from '../errors.js';
import { CreateTask, UpdateTask, TaskParams, ListTasksQuery } from '../schemas.js';
import { encodeCursor, decodeCursor } from '../cursor.js';

export function tasksRouter(tasks) {
  const router = Router();
  const missing = (id) => notFound(`Task ${id} does not exist.`);

  router.get('/', validate({ query: ListTasksQuery }), async (req, res) => {
    const { cursor, ...filters } = req.valid.query;
    const after = cursor ? decodeCursor(cursor) : undefined;
    if (after === null) {
      throw new ValidationError([{ in: 'query', path: 'cursor', message: 'cursor is not valid' }]);
    }
    const { rows, hasMore } = await tasks.list(req.user.id, { ...filters, after });
    res.json({
      data: rows,
      page: { limit: filters.limit, nextCursor: hasMore ? encodeCursor(rows.at(-1)) : null },
    });
  });

  router.post('/', validate({ body: CreateTask }), async (req, res) => {
    const task = await tasks.create(req.user.id, req.valid.body);
    res.status(201).location(`/tasks/${task.id}`).json(task);
  });

  router.get('/:id', validate({ params: TaskParams }), async (req, res) => {
    const task = await tasks.get(req.user.id, req.valid.params.id);
    if (!task) throw missing(req.valid.params.id);
    res.json(task);
  });

  router.patch('/:id', validate({ params: TaskParams, body: UpdateTask }), async (req, res) => {
    const task = await tasks.update(req.user.id, req.valid.params.id, req.valid.body);
    if (!task) throw missing(req.valid.params.id);
    res.json(task);
  });

  router.delete('/:id', validate({ params: TaskParams }), async (req, res) => {
    if (!(await tasks.remove(req.user.id, req.valid.params.id))) throw missing(req.valid.params.id);
    res.sendStatus(204);
  });

  return router;
}

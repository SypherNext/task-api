import { Router } from 'express';
import { validate } from '../validate.js';
import { HttpError, notFound, ValidationError } from '../errors.js';
import { CreateTask, UpdateTask, TaskParams, ListTasksQuery } from '../schemas.js';
import { encodeCursor, decodeCursor } from '../cursor.js';
import { once } from '../idempotency.js';

// The ETag of a task is its version in quotes: "3".
const etag = (task) => `"${task.version}"`;

function expectedVersion(req) {
  const header = req.get('If-Match');
  if (!header) {
    throw new HttpError(428, 'Precondition Required', 'Send If-Match with the ETag you got when you read the task.');
  }
  const match = header.match(/^"(\d+)"$/);
  if (!match) throw new HttpError(400, 'Bad Request', 'If-Match must look like "3".');
  return Number(match[1]);
}

export function tasksRouter(tasks, pool) {
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
    const create = async (db) => {
      const task = await tasks.create(req.user.id, req.valid.body, db);
      return { status: 201, body: task };
    };
    const key = req.get('Idempotency-Key');
    const result = key
      ? await once(pool, { userId: req.user.id, key, body: req.valid.body }, create)
      : await create(pool);
    if (key) res.set('Idempotent-Replayed', String(result.replayed));
    res.status(result.status).location(`/tasks/${result.body.id}`).set('ETag', etag(result.body)).json(result.body);
  });

  router.get('/:id', validate({ params: TaskParams }), async (req, res) => {
    const task = await tasks.get(req.user.id, req.valid.params.id);
    if (!task) throw missing(req.valid.params.id);
    res.set('ETag', etag(task)).json(task);
  });

  router.patch('/:id', validate({ params: TaskParams, body: UpdateTask }), async (req, res) => {
    const { id } = req.valid.params;
    const version = expectedVersion(req);
    const task = await tasks.update(req.user.id, id, version, req.valid.body);
    if (task) return res.set('ETag', etag(task)).json(task);

    // Nothing was updated: the task is not yours (or is gone), or it changed.
    const current = await tasks.get(req.user.id, id);
    if (!current) throw missing(id);
    throw new HttpError(
      412,
      'Precondition Failed',
      `Task ${id} is at version ${current.version}, not ${version}. Read it again and reapply your change.`,
      { headers: { ETag: etag(current) } },
    );
  });

  router.delete('/:id', validate({ params: TaskParams }), async (req, res) => {
    if (!(await tasks.remove(req.user.id, req.valid.params.id))) throw missing(req.valid.params.id);
    res.sendStatus(204);
  });

  return router;
}

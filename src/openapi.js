// The OpenAPI document is generated from the same zod schemas that validate
// requests, so the docs cannot drift from what the code accepts.
import { z } from 'zod';
import { OpenAPIRegistry, OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import * as s from './schemas.js';

export function buildOpenApiDocument({ version = '1.0.0', serverUrl = 'http://localhost:18180' } = {}) {
  const registry = new OpenAPIRegistry();

  const Task = registry.register('Task', s.Task);
  const TaskPage = registry.register('TaskPage', s.TaskPage);
  const CreateTask = registry.register('CreateTask', s.CreateTask);
  const UpdateTask = registry.register('UpdateTask', s.UpdateTask);
  const Problem = registry.register('Problem', s.Problem);

  const bearer = registry.registerComponent('securitySchemes', 'bearerAuth', {
    type: 'http',
    scheme: 'bearer',
    description: 'The token from POST /auth/login. It is opaque, not a JWT.',
  });
  const secured = [{ [bearer.name]: [] }];

  const json = (schema) => ({ content: { 'application/json': { schema } } });
  const problem = (description) => ({ description, content: { 'application/problem+json': { schema: Problem } } });
  const etag = { ETag: { description: 'The task version in quotes, for example "3".', schema: { type: 'string' } } };
  const TaskId = s.TaskParams.extend({ id: s.TaskParams.shape.id.meta({ example: 1 }) });

  // ---- auth
  registry.registerPath({
    method: 'post', path: '/auth/register', tags: ['auth'], summary: 'Create an account',
    request: { body: json(s.Register) },
    responses: {
      201: { description: 'Account created', ...json(s.RegisteredUser) },
      400: problem('Invalid email or password too short'),
      409: problem('Email already registered'),
    },
  });
  registry.registerPath({
    method: 'post', path: '/auth/login', tags: ['auth'], summary: 'Log in and get a bearer token',
    request: { body: json(s.Login) },
    responses: {
      200: { description: 'Logged in', ...json(s.Session) },
      401: problem('Email or password is wrong'),
      429: problem('Too many failed attempts'),
    },
  });
  registry.registerPath({
    method: 'post', path: '/auth/logout', tags: ['auth'], summary: 'End this session', security: secured,
    responses: { 204: { description: 'Logged out' }, 401: problem('Missing or unknown token') },
  });
  registry.registerPath({
    method: 'get', path: '/auth/me', tags: ['auth'], summary: 'Who am I', security: secured,
    responses: { 200: { description: 'The logged-in user', ...json(s.User) }, 401: problem('Missing or unknown token') },
  });

  // ---- tasks
  registry.registerPath({
    method: 'get', path: '/tasks', tags: ['tasks'], summary: 'List your tasks, newest first', security: secured,
    request: { query: s.ListTasksQuery },
    responses: { 200: { description: 'One page of tasks', ...json(TaskPage) }, 400: problem('Invalid query'), 401: problem('Missing or unknown token') },
  });
  registry.registerPath({
    method: 'post', path: '/tasks', tags: ['tasks'], summary: 'Create a task', security: secured,
    request: {
      headers: z.object({ 'Idempotency-Key': z.string().max(200).optional().meta({ description: 'Send the same key when you retry; the task is created once.' }) }),
      body: json(CreateTask),
    },
    responses: {
      201: { description: 'Created (or replayed, see Idempotent-Replayed)', headers: { Location: { schema: { type: 'string' } }, ...etag }, ...json(Task) },
      400: problem('Invalid task'),
      401: problem('Missing or unknown token'),
      422: problem('Idempotency-Key reused with a different body'),
    },
  });
  registry.registerPath({
    method: 'get', path: '/tasks/{id}', tags: ['tasks'], summary: 'Read one task', security: secured,
    request: { params: TaskId },
    responses: { 200: { description: 'The task', headers: etag, ...json(Task) }, 401: problem('Missing or unknown token'), 404: problem('No such task (or not yours)') },
  });
  registry.registerPath({
    method: 'patch', path: '/tasks/{id}', tags: ['tasks'], summary: 'Change some fields of a task', security: secured,
    request: {
      params: TaskId,
      headers: z.object({ 'If-Match': z.string().meta({ description: 'The ETag you read, for example "1".', example: '"1"' }) }),
      body: json(UpdateTask),
    },
    responses: {
      200: { description: 'Updated', headers: etag, ...json(Task) },
      400: problem('Invalid change'),
      401: problem('Missing or unknown token'),
      404: problem('No such task (or not yours)'),
      412: problem('The task changed since you read it'),
      428: problem('If-Match is missing'),
    },
  });
  registry.registerPath({
    method: 'delete', path: '/tasks/{id}', tags: ['tasks'], summary: 'Delete a task', security: secured,
    request: { params: TaskId },
    responses: { 204: { description: 'Deleted' }, 401: problem('Missing or unknown token'), 404: problem('No such task (or not yours)') },
  });

  return new OpenApiGeneratorV31(registry.definitions).generateDocument({
    openapi: '3.1.1',
    info: { title: 'Task API', version, description: 'Tasks with owners, stored in PostgreSQL. Errors are problem details (RFC 9457).' },
    servers: [{ url: serverUrl }],
    tags: [{ name: 'auth', description: 'Accounts and sessions' }, { name: 'tasks', description: 'Your tasks' }],
  });
}

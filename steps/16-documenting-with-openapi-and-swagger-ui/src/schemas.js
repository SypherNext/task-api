import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

// Adds .openapi() to every schema created after this line (lesson 16 needs it).
extendZodWithOpenApi(z);

export const Priority = z.enum(['low', 'normal', 'high']);

// Path parameters arrive as strings: "7" must become the number 7.
export const TaskParams = z.object({
  id: z.coerce.number().int().positive(),
});

// strictObject rejects keys you did not list, such as "id" or "ownerId".
export const CreateTask = z.strictObject({
  title: z.string().trim().min(1, 'title cannot be empty').max(200),
  priority: Priority.default('normal'),
});

export const UpdateTask = z
  .strictObject({
    title: z.string().trim().min(1, 'title cannot be empty').max(200).optional(),
    done: z.boolean().optional(),
    priority: Priority.optional(),
  })
  .refine((changes) => Object.keys(changes).length > 0, {
    message: 'send at least one field to change',
  });

// Query strings are always text: "20" and "false" must be converted.
export const ListTasksQuery = z.strictObject({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().max(200).optional(),
  done: z.stringbool().optional().meta({ description: 'true or false' }),
  priority: Priority.optional(),
  q: z.string().trim().min(1).max(100).optional(),
  sort: z.enum(['createdAt', '-createdAt']).default('-createdAt'),
});

export const Register = z.strictObject({
  email: z.email().max(254),
  password: z.string().min(15, 'use at least 15 characters').max(128),
});

export const Login = z.strictObject({
  email: z.email().max(254),
  password: z.string().min(1).max(128),
});

// ---- Response shapes. The API never parses these; they exist so the
// OpenAPI document (lesson 16) is generated from the same zod code.
export const Task = z.object({
  id: z.number().int().meta({ example: 1 }),
  title: z.string().meta({ example: 'Order printer paper' }),
  priority: Priority,
  done: z.boolean(),
  version: z.number().int().meta({ description: 'Increases by 1 on every update. Send it back in If-Match.' }),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const TaskPage = z.object({
  data: z.array(Task),
  page: z.object({
    limit: z.number().int(),
    nextCursor: z.string().nullable().meta({ description: 'Pass as ?cursor= to get the next page. null on the last page.' }),
  }),
});

export const User = z.object({ id: z.number().int(), email: z.email() });
export const RegisteredUser = User.extend({ createdAt: z.iso.datetime() });

export const Session = z.object({
  tokenType: z.literal('Bearer'),
  token: z.string().meta({ description: 'Send as Authorization: Bearer <token>.' }),
  expiresAt: z.iso.datetime(),
});

export const Problem = z.object({
  type: z.string().meta({ example: 'about:blank' }),
  title: z.string(),
  status: z.number().int(),
  detail: z.string().optional(),
  instance: z.string(),
  requestId: z.string(),
  errors: z.array(z.object({ in: z.string(), path: z.string(), message: z.string() })).optional(),
});

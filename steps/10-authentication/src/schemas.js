import { z } from 'zod';

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
  done: z.stringbool().optional(),
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

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

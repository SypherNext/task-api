import { ValidationError } from './errors.js';

export function validate(schemas) {
  return (req, res, next) => {
    const errors = [];
    const valid = {};
    for (const [part, schema] of Object.entries(schemas)) {
      const result = schema.safeParse(req[part] ?? {});
      if (result.success) {
        valid[part] = result.data;
      } else {
        for (const issue of result.error.issues) {
          errors.push({ in: part, path: issue.path.join('.'), message: issue.message });
        }
      }
    }
    if (errors.length > 0) return next(new ValidationError(errors));
    req.valid = valid;
    next();
  };
}

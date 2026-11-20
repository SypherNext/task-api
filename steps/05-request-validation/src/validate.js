// validate({ body, params, query }) returns middleware that checks each part
// of the request against its zod schema. On success the parsed (typed, trimmed,
// defaulted) values are stored on req.valid; on failure the handler never runs.
export function validate(schemas) {
  return (req, res, next) => {
    const issues = [];
    const valid = {};
    for (const [part, schema] of Object.entries(schemas)) {
      const result = schema.safeParse(req[part] ?? {});
      if (result.success) {
        valid[part] = result.data;
      } else {
        for (const issue of result.error.issues) {
          issues.push({ in: part, path: issue.path.join('.'), message: issue.message });
        }
      }
    }
    if (issues.length > 0) {
      return res.status(400).json({ error: 'validation failed', issues });
    }
    // Express 5 made req.query a read-only getter, so parsed values live here.
    req.valid = valid;
    next();
  };
}

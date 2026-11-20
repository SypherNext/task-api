// One error shape for the whole API: problem details (RFC 9457),
// sent as Content-Type: application/problem+json.
export class HttpError extends Error {
  constructor(status, title, detail, extra = {}) {
    super(detail ?? title);
    this.status = status;
    this.title = title;
    this.detail = detail;
    this.extra = extra;
  }
}

export const notFound = (detail) => new HttpError(404, 'Not Found', detail);

export class ValidationError extends HttpError {
  constructor(errors) {
    super(400, 'Your request is not valid', 'One or more fields failed validation.', {
      type: 'https://task-api.example/problems/validation',
      errors,
    });
  }
}

function send(res, req, { status, title, detail, type = 'about:blank', ...extra }) {
  res.status(status).type('application/problem+json').json({
    type,
    title,
    status,
    ...(detail ? { detail } : {}),
    instance: req.originalUrl,
    ...extra,
  });
}

// Runs when no route matched.
export function notFoundHandler(req, res, next) {
  next(notFound(`No route for ${req.method} ${req.path}`));
}

// Express knows this is the error handler because it takes four arguments.
export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err); // too late to send a clean error: let Express close it

  if (err instanceof HttpError) {
    return send(res, req, { status: err.status, title: err.title, detail: err.detail, ...err.extra });
  }
  // Errors raised by express.json() carry a status and a type.
  if (err.type === 'entity.parse.failed') {
    return send(res, req, { status: 400, title: 'Malformed JSON', detail: 'The request body is not valid JSON.' });
  }
  if (err.type === 'entity.too.large') {
    return send(res, req, { status: 413, title: 'Payload Too Large', detail: `The body is limited to ${err.limit} bytes.` });
  }
  // Anything else is a bug: log the details, tell the client nothing internal.
  console.error(`unhandled error on ${req.method} ${req.originalUrl}:`, err);
  send(res, req, { status: 500, title: 'Internal Server Error', detail: 'Something went wrong on our side.' });
}

import crypto from 'node:crypto';
import pino from 'pino';
import { pinoHttp } from 'pino-http';

// One JSON object per line on standard output. The platform (Docker, Kubernetes,
// a log shipper) collects stdout; the app never writes log files itself.
export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  base: { service: 'task-api' }, // replaces the default pid and hostname fields
  timestamp: pino.stdTimeFunctions.isoTime, // "2026-11-03T20:18:07.020Z" instead of epoch milliseconds
  // Never write secrets to logs, even by accident.
  redact: { paths: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.token'], censor: '[redacted]' },
});

const REQUEST_ID = /^[A-Za-z0-9._-]{8,64}$/;

// One log line per request, with a request id that is also sent back to the client.
export const requestLogger = pinoHttp({
  logger,
  genReqId(req, res) {
    const incoming = req.headers['x-request-id'];
    // Reuse the caller's id (for example from a proxy) only if it looks sane.
    const id = typeof incoming === 'string' && REQUEST_ID.test(incoming) ? incoming : crypto.randomUUID();
    res.setHeader('X-Request-Id', id);
    return id;
  },
  customLogLevel(req, res, err) {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res) => `${req.method} ${req.originalUrl} ${res.statusCode}`,
  customErrorMessage: (req, res) => `${req.method} ${req.originalUrl} ${res.statusCode}`,
  serializers: {
    req: (req) => ({ id: req.id, method: req.method, url: req.url, userAgent: req.headers['user-agent'] }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
  // Health checks every few seconds would drown everything else.
  autoLogging: { ignore: (req) => req.url === '/healthz' || req.url === '/readyz' },
});

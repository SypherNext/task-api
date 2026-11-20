import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { tasksRouter } from './routes/tasks.js';
import { authRouter } from './routes/auth.js';
import { tasksRepo } from './repo/tasks.js';
import { usersRepo } from './repo/users.js';
import { sessionsRepo } from './repo/sessions.js';
import { requireAuth } from './auth.js';
import { errorHandler, notFoundHandler } from './errors.js';
import { requestLogger } from './logger.js';
import { securityHeaders, corsPolicy, apiLimiter, loginLimiter } from './security.js';
import { buildOpenApiDocument } from './openapi.js';

// Routes that exist on purpose but are not part of the public API contract.
export const INTERNAL_ROUTES = ['GET /', 'GET /healthz', 'GET /readyz'];

export function createApp({ pool, config }) {
  const app = express();
  // Behind a proxy, req.ip would be the proxy's address. Trust exactly as many hops as you have.
  app.set('trust proxy', config.trustProxy);

  app.use(requestLogger); // first, so every request gets an id and a log line
  app.use(securityHeaders);
  app.use(corsPolicy(config.corsOrigins));
  app.use(express.json({ limit: '10kb' }));

  app.get('/', (req, res) => res.json({ service: 'task-api', status: 'ok' }));

  // Liveness: the process is running and can answer.
  app.get('/healthz', (req, res) => res.json({ status: 'ok' }));

  // Readiness: the process can do real work, which needs the database.
  app.get('/readyz', async (req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ready' });
    } catch (err) {
      req.log.warn({ code: err.code }, 'readiness check failed');
      res.status(503).json({ status: 'not ready', reason: 'database unreachable' });
    }
  });

  // API documentation: the raw OpenAPI document and Swagger UI on top of it.
  // Off by default in production (DOCS_ENABLED=true turns it on).
  if (config.docsEnabled) {
    const document = buildOpenApiDocument({ serverUrl: config.publicUrl });
    app.get('/openapi.json', (req, res) => res.json(document));
    app.use(
      '/docs',
      swaggerUi.serve,
      swaggerUi.setup(document, {
        customSiteTitle: 'Task API docs',
        customCss: '.swagger-ui .topbar { display: none }', // no explore bar: this page shows one API
        swaggerOptions: { persistAuthorization: false, displayRequestDuration: true },
      }),
    );
  }

  const sessions = sessionsRepo(pool);
  const auth = requireAuth(sessions);
  app.use(['/auth', '/tasks'], apiLimiter);
  app.use('/auth/login', loginLimiter);

  // One table of mounted routers: app.js uses it to mount them, and the
  // OpenAPI test uses it to list every real route.
  for (const [path, router] of apiRouters({ pool, sessions, auth })) app.use(path, router);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

export function apiRouters({ pool, sessions, auth }) {
  return [
    ['/auth', authRouter({ users: usersRepo(pool), sessions, requireAuth: auth })],
    ['/tasks', [auth, tasksRouter(tasksRepo(pool), pool)]], // every /tasks route needs a token
  ];
}

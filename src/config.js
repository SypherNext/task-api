// Read configuration once, at startup, and fail fast if something is missing.
export function loadConfig(env = process.env) {
  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set (see .env.example)');
  }
  const port = Number(env.PORT ?? 18180);
  return {
    port,
    databaseUrl: env.DATABASE_URL,
    corsOrigins: (env.CORS_ORIGINS ?? '').split(',').filter(Boolean),
    // How many proxies (load balancer, ingress) sit in front of the API. 0 = none.
    trustProxy: Number(env.TRUST_PROXY ?? 0),
    // The address clients use, for the "servers" entry in the OpenAPI document.
    publicUrl: env.PUBLIC_URL ?? `http://localhost:${port}`,
    // Swagger UI and /openapi.json: on in development, off in production unless asked for.
    docsEnabled: env.DOCS_ENABLED ? env.DOCS_ENABLED === 'true' : env.NODE_ENV !== 'production',
  };
}

// Read configuration once, at startup, and fail fast if something is missing.
export function loadConfig(env = process.env) {
  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set (see .env.example)');
  }
  return {
    port: Number(env.PORT ?? 18180),
    databaseUrl: env.DATABASE_URL,
    corsOrigins: (env.CORS_ORIGINS ?? '').split(',').filter(Boolean),
    // How many proxies (load balancer, ingress) sit in front of the API. 0 = none.
    trustProxy: Number(env.TRUST_PROXY ?? 0),
  };
}

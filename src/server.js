import { loadConfig } from './config.js';
import { createPool } from './db.js';
import { createApp } from './app.js';
import { logger } from './logger.js';

const config = loadConfig();
const pool = createPool(config.databaseUrl);

// Check the database once at startup so a wrong password fails loudly, now.
try {
  await pool.query('SELECT 1');
} catch (err) {
  logger.fatal({ err }, 'cannot reach the database');
  process.exit(1);
}

const server = createApp({ pool, config }).listen(config.port, (err) => {
  if (err) {
    logger.fatal({ err }, 'could not start');
    process.exit(1);
  }
  logger.info({ port: config.port }, 'task-api listening');
});

// On Ctrl+C (SIGINT) or a platform stop (SIGTERM): stop taking new requests,
// let in-flight ones finish, close the pool, exit.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    logger.info({ signal }, 'shutting down');
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  });
}

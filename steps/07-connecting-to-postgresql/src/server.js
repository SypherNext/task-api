import { loadConfig } from './config.js';
import { createPool } from './db.js';
import { createApp } from './app.js';

const config = loadConfig();
const pool = createPool(config.databaseUrl);

// Check the database once at startup so a wrong password fails loudly, now.
try {
  await pool.query('SELECT 1');
} catch (err) {
  console.error(`cannot reach the database: ${err.message}`);
  process.exit(1);
}

const server = createApp({ pool }).listen(config.port, (err) => {
  if (err) {
    console.error(`could not start: ${err.message}`);
    process.exit(1);
  }
  console.log(`task-api listening on http://localhost:${config.port}`);
});

// On Ctrl+C (SIGINT) or a platform stop (SIGTERM): stop taking new requests,
// let in-flight ones finish, close the pool, exit.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    console.log(`${signal} received, shutting down`);
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  });
}

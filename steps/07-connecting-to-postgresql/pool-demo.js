// What a connection pool does: three queries, two connections.
import { createPool } from './src/db.js';

const pool = createPool(process.env.DATABASE_URL);
const raw = await pool.query('SELECT 9007199254740993::bigint AS big, now() AS at');
console.log('bigint arrives as', typeof raw.rows[0].big, raw.rows[0].big, '(precision lost above 2^53)');
console.log('timestamptz arrives as', raw.rows[0].at.constructor.name);
await pool.end();

const small = createPool(process.env.DATABASE_URL);
small.options.max = 2;
const t0 = Date.now();
const slow = (n) =>
  small.query('SELECT pg_backend_pid() AS pid, pg_sleep(1)').then(({ rows }) => {
    console.log(`query ${n} finished after ${((Date.now() - t0) / 1000).toFixed(1)} s on connection pid ${rows[0].pid}`);
  });
const running = [slow(1), slow(2), slow(3)];
await new Promise((r) => setTimeout(r, 100));
console.log(`while running: total=${small.totalCount} idle=${small.idleCount} waiting=${small.waitingCount}`);
await Promise.all(running);
console.log(`afterwards:    total=${small.totalCount} idle=${small.idleCount} waiting=${small.waitingCount}`);
await small.end();

import pg from 'pg';

// PostgreSQL bigint (type 20) arrives as a string by default, because it can be
// larger than JavaScript's Number.MAX_SAFE_INTEGER. Task ids stay far below that.
pg.types.setTypeParser(pg.types.builtins.INT8, (value) => Number(value));

export function createPool(databaseUrl) {
  const pool = new pg.Pool({
    connectionString: databaseUrl,
    max: 10, // at most 10 open connections from this process
    idleTimeoutMillis: 30_000, // close a connection that sat unused for 30 s
    connectionTimeoutMillis: 2_000, // give up waiting for a free connection after 2 s
  });
  // An idle connection can break (database restart, network blip). Without this
  // listener the 'error' event would crash the whole process.
  pool.on('error', (err) => console.error('idle database connection failed:', err.message));
  return pool;
}

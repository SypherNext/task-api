// A small migration runner: applies migrations/NNN_name.sql files in order,
// each in its own transaction, and records them in schema_migrations.
import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';

const dir = path.join(import.meta.dirname, '..', 'migrations');

export async function migrate(databaseUrl, log = console.log) {
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
    const done = new Set((await client.query('SELECT name FROM schema_migrations')).rows.map((r) => r.name));
    const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
    for (const file of files) {
      if (done.has(file)) continue;
      const sql = await fs.readFile(path.join(dir, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        log(`applied ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`${file} failed: ${err.message}`);
      }
    }
    log(`schema is up to date (${files.length} migrations)`);
  } finally {
    await client.end();
  }
}

if (process.argv[1] === import.meta.filename) {
  await migrate(process.env.DATABASE_URL);
}

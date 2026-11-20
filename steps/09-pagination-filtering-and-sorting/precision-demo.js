// Why migration 002 changes created_at to timestamptz(3): a cursor built from a
// JavaScript Date (milliseconds) against microsecond timestamps skips rows.
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL.replace(/\/tasks$/, '/tasks_demo') });
for (const type of ['timestamptz', 'timestamptz(3)']) {
  await pool.query(`DROP TABLE IF EXISTS t; CREATE TABLE t (id int PRIMARY KEY, created_at ${type} NOT NULL DEFAULT now());
    INSERT INTO t (id) SELECT generate_series(1, 5);`);
  const page1 = await pool.query('SELECT id, created_at FROM t ORDER BY created_at DESC, id DESC LIMIT 2');
  const last = page1.rows.at(-1); // created_at is a JavaScript Date: milliseconds only
  const page2 = await pool.query(
    'SELECT id FROM t WHERE (created_at, id) < ($1::timestamptz, $2) ORDER BY created_at DESC, id DESC LIMIT 2',
    [last.created_at.toISOString(), last.id],
  );
  const stored = (await pool.query('SELECT created_at::text AS t FROM t WHERE id = $1', [last.id])).rows[0].t;
  console.log(`${type.padEnd(15)} stored ${stored}, cursor ${last.created_at.toISOString()}: page 2 ids [${page2.rows.map((r) => r.id)}]`);
}
await pool.end();

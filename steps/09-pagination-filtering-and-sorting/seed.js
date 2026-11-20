// Insert 25 tasks with one statement (so they share one created_at), then 3 more.
import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const titles = Array.from({ length: 25 }, (_, i) => `Seed task ${String(i + 1).padStart(2, '0')}`);
await pool.query(
  `INSERT INTO tasks (title, priority, done)
   SELECT t, (ARRAY['low','normal','high'])[1 + (n % 3)], n % 4 = 0
     FROM unnest($1::text[]) WITH ORDINALITY AS s(t, n)`,
  [titles],
);
for (const title of ['Plan the sprint', 'Fix the 100% CPU alert', 'Email the landlord']) {
  await pool.query('INSERT INTO tasks (title) VALUES ($1)', [title]);
}
const { rows } = await pool.query('SELECT count(*)::int AS n, count(DISTINCT created_at)::int AS distinct_times FROM tasks');
console.log(rows[0]);
await pool.end();

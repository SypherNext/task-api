// Why OFFSET pages drift, and why they get slow. Runs on the throwaway tasks_demo database.
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL.replace(/\/tasks$/, '/tasks_demo') });
await pool.query(`DROP TABLE IF EXISTS tasks;
  CREATE TABLE tasks (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, title text NOT NULL);
  INSERT INTO tasks (title) SELECT 'task ' || n FROM generate_series(1, 200000) AS n;
  ANALYZE tasks;`);

const ids = (rows) => rows.map((r) => r.id).join(',');
const page = (offset) => pool.query('SELECT id FROM tasks ORDER BY id DESC LIMIT 5 OFFSET $1', [offset]);

const p1 = await page(0);
console.log('OFFSET page 1:', ids(p1.rows));
await pool.query("INSERT INTO tasks (title) VALUES ('created while you read page 1')");
const p2 = await page(5);
console.log('OFFSET page 2:', ids(p2.rows), '<- 199996 again: the new row pushed everything down');
const k2 = await pool.query('SELECT id FROM tasks WHERE id < $1 ORDER BY id DESC LIMIT 5', [p1.rows.at(-1).id]);
console.log('keyset page 2:', ids(k2.rows), '<- starts right after the last row you saw');

for (const [name, sql] of [
  ['OFFSET 150000', 'SELECT id, title FROM tasks ORDER BY id DESC LIMIT 20 OFFSET 150000'],
  ['keyset id < 50001', 'SELECT id, title FROM tasks WHERE id < 50001 ORDER BY id DESC LIMIT 20'],
]) {
  await pool.query(sql); // warm the cache so both runs read from memory
  const { rows } = await pool.query(`EXPLAIN (ANALYZE, BUFFERS) ${sql}`);
  const plan = rows.map((r) => r['QUERY PLAN']);
  const limit = plan.find((l) => l.includes('Limit'));
  const time = plan.find((l) => l.startsWith('Execution Time'));
  console.log(`${name.padEnd(18)} ${limit.match(/actual time=[\d.]+\.\.[\d.]+ rows=\d+/)[0]}  ${time}`);
}
await pool.end();

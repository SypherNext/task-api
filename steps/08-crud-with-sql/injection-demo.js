// SQL injection, shown on a throwaway database (tasks_demo).
import pg from 'pg';

const client = new pg.Client({ connectionString: process.env.DATABASE_URL.replace(/\/tasks$/, '/tasks_demo') });
await client.connect();
await client.query(`DROP TABLE IF EXISTS tasks;
  CREATE TABLE tasks (id int PRIMARY KEY, title text, done boolean DEFAULT false);
  INSERT INTO tasks (id, title) VALUES (1, 'Buy milk'), (2, 'Pay rent'), (3, 'Call the bank');`);

// WRONG: the search text is pasted into the SQL string.
async function searchUnsafe(text) {
  const sql = `SELECT id, title FROM tasks WHERE title ILIKE '%${text}%'`;
  console.log('SQL sent:', sql);
  const result = await client.query(sql);
  const rows = Array.isArray(result) ? result.flatMap((r) => r.rows) : result.rows;
  return rows;
}

// RIGHT: the SQL text is fixed; the value travels separately as $1.
async function searchSafe(text) {
  const { rows } = await client.query('SELECT id, title FROM tasks WHERE title ILIKE $1', [`%${text}%`]);
  return rows;
}

const normal = 'milk';
const attack = "zzz%' OR 1=1 --";
const worse = "zzz'; UPDATE tasks SET done = true; --";

console.log('unsafe, normal input  ->', await searchUnsafe(normal));
console.log('unsafe, attack input  ->', await searchUnsafe(attack));
console.log('unsafe, worse input   ->', await searchUnsafe(worse));
console.log('done flags now        ->', (await client.query('SELECT id, done FROM tasks ORDER BY id')).rows);
console.log('safe, attack input    ->', await searchSafe(attack));
console.log('safe, worse input     ->', await searchSafe(worse));
await client.end();

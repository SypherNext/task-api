// All SQL for tasks lives here. Every value goes in as a $n parameter, never
// pasted into the SQL text. Columns are renamed to camelCase in the query.
const COLUMNS = `id, title, priority, done, created_at AS "createdAt", updated_at AS "updatedAt"`;

export function tasksRepo(pool) {
  return {
    // Keyset pagination: "the next page starts after this (created_at, id)".
    // Filters are added as parameters; only the column names come from code.
    async list({ limit, after, done, priority, q, sort }) {
      const where = [];
      const params = [];
      const add = (sql, value) => {
        params.push(value);
        where.push(sql.replace('?', `$${params.length}`));
      };
      if (done !== undefined) add('done = ?', done);
      if (priority) add('priority = ?', priority);
      if (q) add('title ILIKE ?', `%${q.replace(/[\\%_]/g, '\\$&')}%`); // % and _ match literally

      const desc = sort === '-createdAt';
      if (after) {
        params.push(after.createdAt, after.id);
        const n = params.length;
        where.push(`(created_at, id) ${desc ? '<' : '>'} ($${n - 1}::timestamptz, $${n})`);
      }
      params.push(limit + 1); // one extra row tells you whether another page exists
      const dir = desc ? 'DESC' : 'ASC';
      const sql = `SELECT ${COLUMNS} FROM tasks
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY created_at ${dir}, id ${dir}
        LIMIT $${params.length}`;
      const { rows } = await pool.query(sql, params);
      return { rows: rows.slice(0, limit), hasMore: rows.length > limit };
    },

    async get(id) {
      const { rows } = await pool.query(`SELECT ${COLUMNS} FROM tasks WHERE id = $1`, [id]);
      return rows[0]; // undefined when there is no such task
    },

    async create({ title, priority }) {
      const { rows } = await pool.query(
        `INSERT INTO tasks (title, priority) VALUES ($1, $2) RETURNING ${COLUMNS}`,
        [title, priority],
      );
      return rows[0];
    },

    // A partial update: COALESCE keeps the current value when a field is not sent.
    async update(id, { title, done, priority }) {
      const { rows } = await pool.query(
        `UPDATE tasks
            SET title      = COALESCE($2, title),
                done       = COALESCE($3, done),
                priority   = COALESCE($4, priority),
                updated_at = now()
          WHERE id = $1
      RETURNING ${COLUMNS}`,
        [id, title ?? null, done ?? null, priority ?? null],
      );
      return rows[0];
    },

    async remove(id) {
      const { rowCount } = await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
      return rowCount === 1;
    },
  };
}

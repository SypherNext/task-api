// All SQL for tasks lives here. Every value goes in as a $n parameter, never
// pasted into the SQL text. Columns are renamed to camelCase in the query.
const COLUMNS = `id, title, priority, done, created_at AS "createdAt", updated_at AS "updatedAt"`;

export function tasksRepo(pool) {
  return {
    async list() {
      const { rows } = await pool.query(`SELECT ${COLUMNS} FROM tasks ORDER BY id`);
      return rows;
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
